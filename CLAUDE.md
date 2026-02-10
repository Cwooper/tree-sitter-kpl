# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Tree-sitter grammar for **KPL** (Kernel Programming Language), a systems programming language designed by Harry Porter at PSU. KPL compiles to Blitz assembly and runs on the Blitz emulator. This grammar enables syntax highlighting and structural parsing across editors (VS Code, Neovim, Zed, Helix, etc.).

**Companion repo:** [kpl-linter](https://github.com/Cwooper/kpl-linter) — VS Code extension and language server that consumes this grammar. The Blitz compiler reference source (`BlitzSrc/`) lives there (gitignored), downloaded via `./examples/download.sh`.

**Key references:**
- [KPL Overview (PDF)](https://web.cecs.pdx.edu/~harry/Blitz/BlitzDoc/KPLOverview.pdf)
- [Context Free Grammar (PDF)](https://web.cecs.pdx.edu/~harry/Blitz/BlitzDoc/Syntax.pdf)
- [Blitz compiler source](https://web.cecs.pdx.edu/~harry/Blitz/BlitzSrc/) — `parser.cc` and `lexer.cc` are the ground truth
- [Code examples (p2)](https://web.cecs.pdx.edu/~harry/Blitz/OSProject/p2/)
- [Code examples (p8, more complex)](https://web.cecs.pdx.edu/~harry/Blitz/OSProject/p8/)

## Development Workflow

**Do NOT jump into implementation** unless the user explicitly requests it or it is heavily inferred from back-and-forth conversation. Default to planning, discussing, and confirming approach first.

### Commands

```bash
tree-sitter generate              # Generate parser from grammar.js → src/parser.c
tree-sitter test                  # Run test corpus (test/corpus/)
tree-sitter test -i 'Test Name'   # Run a specific test (regex match)
tree-sitter test -u               # Auto-update expected test outputs
tree-sitter parse <file>          # Parse a file and print the syntax tree
tree-sitter parse -d <file>       # Parse with debug output (shows parser states)
tree-sitter highlight <file>      # Test syntax highlighting
pnpm install --ignore-scripts     # Install deps (must generate parser first)
pnpm start                        # Build WASM and launch playground
```

### Development Cycle

```
1. Write test case in test/corpus/*.txt
2. Add/modify rules in grammar.js
3. tree-sitter generate
4. tree-sitter test
5. Repeat
```

### Testing Against Real Files

KPL example files live in `examples/` (gitignored, user-provided). These are NOT tracked in git. To test against them:

```bash
tree-sitter parse examples/SomeFile.k    # Parse a .k code file
tree-sitter parse examples/SomeFile.h    # Parse a .h header file
```

To count errors across all example files:
```bash
for f in examples/*.k examples/*.h; do
  errors=$(tree-sitter parse "$f" 2>&1 | grep -c ERROR)
  echo "$errors: $(basename $f)"
done
```

## Current Grammar Status

**114 corpus tests passing.** All header files (`.h`) parse with zero errors. Code files (`.k`) have errors due to known issues listed below.

### What's Implemented

- **Literals:** integer, hex, double, char, string, bool, null, self, super
- **Comments:** line (`--`) and block (`/* */`), in `extras` (float freely in tree)
- **Types:** primitive (`int`, `bool`, `char`, `double`, `void`, `typeOfNull`, `anyType`), `ptr to`, `array [N] of`, `record`/`endRecord`, `function (T) returns T`, named types with generics
- **Top-level:** `header`/`endHeader`, `code`/`endCode`, `uses` clause with renamings
- **Declarations:** `const`, `enum`, `type`, `errors`, `var`
- **Functions:** prototypes (in headers), full declarations (in code), `parameter_list`, `external` modifier, `returns` clause
- **Statements:** `if`/`elseIf`/`else`/`endIf`, `while`/`endWhile`, `do`/`until`, `for`/`endFor`, `switch`/`case`/`default`/`endSwitch`, `try`/`catch`/`endTry`, `return`, `break`, `continue`, `throw`, `free`, `debug`, assignment, expression statements
- **Expressions (17 precedence levels):** binary operators (`||`, `&&`, `|`, `^`, `&`, `==`, `!=`, `<`, `<=`, `>`, `>=`, `<<`, `>>`, `>>>`, `+`, `-`, `*`, `/`, `%`), unary (`!`, `-`, `*`, `&`), call, field access, method call, array access, `asPtrTo`, `asInteger`, `arraySize`, `isInstanceOf`, `isKindOf`, `sizeOf`, `new`/`alloc` constructors with field/array initializers, closures
- **OOP:** `interface`/`endInterface` (with `extends`, `messages`), `class`/`endClass` (with `implements`, `superclass`, `fields`, `methods`, type parameters), `behavior`/`endBehavior` with `method`/`endMethod`, method prototypes (normal, `infix`, `prefix`, keyword `at: T put: T`)

### Known Issues / Remaining Work

1. **Greedy `var_declaration`**: `prec.right` on `var_declaration` causes it to try consuming the next identifier after the last declarator (e.g., `print` on the next line) as a new variable name. This is the #1 source of code file parse errors.

2. **Greedy `const_declaration`**: Same pattern — `repeat1($.const_declarator)` tries to eat the next identifier.

3. **No external scanner yet**: The 3 non-CFG newline-sensitive constructs are not handled:
   - `*` prefix vs infix (line-based)
   - Function call `f(x)` only if `(` same line as `f`
   - Method call `.foo(x)` only if `foo` and `(` same line

4. **No highlight queries yet**: `queries/highlights.scm` not written.

### Precedence Map

Defined in `grammar.js` as the `PREC` constant:

```
KEYWORD_MSG: 1, CUSTOM_INFIX: 2, LOGICAL_OR: 3, LOGICAL_AND: 4,
BITWISE_OR: 5, BITWISE_XOR: 6, BITWISE_AND: 7, EQUALITY: 8,
RELATIONAL: 9, SHIFT: 10, ADDITIVE: 11, MULTIPLICATIVE: 12,
UNARY: 13, POSTFIX: 14, CALL: 15, PRIMARY: 16
```

### Conflict Resolutions Applied

- `var_declaration`: `prec.right` to stop consuming at block boundaries (causes greedy issue, needs fix)
- `return_statement`: `prec.right` so `return (expr)` consumes the expression
- `function_type`: `prec.right` so `function () returns T` consumes the return type
- `named_type`: `prec.right` so `MyType [T]` consumes type arguments
- `method_call`: `PREC.POSTFIX + 1` to win over `field_access` for `.foo(x)` pattern
- `_keyword_method_proto`: `prec.right` to greedily consume `ID : Type` pairs
- `expression_statement`: `prec(-1)` so it's the last resort for statements

## KPL Language Quirks (Non-CFG)

The KPL grammar has three constructs that violate the CFG and require an **external scanner** (`src/scanner.c`):

1. **`*` prefix vs infix** — Same line as previous token = infix (multiplication). Preceded by newline = prefix (dereference). Reference: `BlitzSrc/parser.cc:3195-3242`.

2. **Function calls** — `f(x)` is a call only if `(` is on the same line as `f`. Otherwise `f` is a variable and `(x)` starts a new expression. Reference: `BlitzSrc/parser.cc:3415-3450`.

3. **Method calls** — `.foo(x)` is a method call only if `foo` and `(` are on the same line. Otherwise it's field access. Reference: `BlitzSrc/parser.cc:3314-3340`.

The reference parser uses `extractLineNumber(tokenMinusOne) == extractLineNumber(token)` for all three. These are explicitly commented as "non-CFG restrictions" in the source.

**Keyword messages** are also unusual: `obj at: x put: y` constructs selector `at:put:` dynamically from `ID : expr` pairs.

## KPL Language Quick Reference

- **File types:** `.h` (headers), `.k` (code files), `.kpl` (alternate)
- **Comments:** `--` (line), `/* */` (block); doc comments use `--` blocks before/after declarations, associated by position (LSP concern, not tree-sitter)
- **Block delimiters:** `if`/`endIf`, `while`/`endWhile`, `function`/`endFunction`, `class`/`endClass`, etc.
- **Types:** `int`, `bool`, `char`, `void`, `double`, `ptr to T`, `array [N] of T`, `record`/`endRecord`, function types, named types with generics
- **Type casting:** `asPtrTo`, `asInteger`, `isInstanceOf`, `isKindOf`, `arraySize`
- **Header structure:** `header Name` / `uses` / `const` / `enum` / `type` / `errors` / `var` / `functions` / `interface` / `class` / `endHeader`
- **Code structure:** `code Name` / declarations / `function` / `behavior` / `endCode`
- **OOP:** Classes, interfaces, behaviors, methods (normal, infix, prefix, keyword), `superclass`, `self`, `super`
- **No semicolons** — statements terminated by keywords or newlines in the 3 special cases above

## Task List

### Completed
- [x] Phase 1: Foundation — `source_file`, comments, identifiers, all literals (integer, hex, double, char, string, bool, null, self, super), `extras` setup
- [x] Phase 2: Types + Declarations + Top-level — all type rules, `header`/`code_file`, `uses`, `const`, `enum`, `type`, `errors`, `var` declarations
- [x] Phase 3: Functions & Parameters — `parameter_list`, `function_prototype`, `function_declaration`, `functions_section`
- [x] Phase 4: Statements — all control flow (`if`, `while`, `do/until`, `for`, `switch`, `try/catch`), `return`, `break`, `continue`, `throw`, `free`, `debug`, assignment, expression statements
- [x] Phase 5: Expressions — all 17 precedence levels, binary/unary operators, call, field access, method call, array access, type cast operators, `sizeOf`, `new`/`alloc` constructors, closures
- [x] Phase 6: OOP — `interface` (extends, messages), `class` (implements, superclass, fields, methods, type parameters), `behavior` with `method`/`endMethod`, method prototypes (normal, infix, prefix, keyword)

### Remaining
- [ ] **Fix greedy `var_declaration`** — `prec.right` on `var_declaration` causes it to try consuming the next identifier (e.g., `print`) as a new variable name. This is the #1 source of code file parse errors. Every function/method with vars followed by statements hits this. The `repeat1($.var_declarator)` tries to start a new declarator with the next identifier, fails when it doesn't see `:`, and produces an ERROR node.
- [ ] **Fix greedy `const_declaration`** — Same pattern as var. `repeat1($.const_declarator)` tries to eat the next identifier as a new const name.
- [ ] **External scanner** (`src/scanner.c`) — Handle 3 non-CFG newline-sensitive constructs. Scanner state: track whether a newline was seen since last non-whitespace token (1 byte boolean). See "KPL Language Quirks" section for details.
- [ ] **Highlight queries** (`queries/highlights.scm`) — Map node types to standard captures (@keyword, @type, @function, @variable, @operator, @number, @string, @comment, etc.). Optionally add `locals.scm` and `tags.scm`.
- [ ] **Validate against example files** — After fixing greedy declarations and external scanner, re-test all examples. Goal: zero errors on all `.h` and `.k` files. Blocked by the three tasks above.

### Current Error Counts (p8 examples, as of last test run)
```
Headers: ALL 15 parse with 0 errors
Code files with errors:
  5: BitMap.k        4: hello.k       21: List.k
  2: Program2.k     21: sh.k          9: System.k
  3: TestProgram1.k  13: TestProgram3.k  21: TestProgram4.k
 18: TestProgram5.k  21: UserSystem.k
Code files clean: cat.k, MyProgram.k, Program1.k, TestProgram2.k
```

Root cause for nearly all errors: greedy `var_declaration` / `const_declaration` consuming the first statement identifier after a var/const block.

## Conventions

- Grammar defined in JavaScript (`grammar.js`) using tree-sitter DSL
- External scanner in C (`src/scanner.c`) — not yet written
- Generated parser in C (`src/parser.c`) — do not edit manually
- Tests in `test/corpus/*.txt` using tree-sitter test format
- Highlight queries in `queries/highlights.scm` — not yet written
- Helper functions (`commaSep1`) defined after the grammar export
- Hidden rules prefixed with `_` (e.g., `_expression`, `_statement`, `_type`)
- Field names used for semantic children (e.g., `name:`, `type:`, `condition:`)
