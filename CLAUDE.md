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

**116 corpus tests passing. All 44 example files (22 headers + 22 code files) parse with zero errors.**

### What's Implemented

- **Literals:** integer, hex, double, char, string, bool, null, self, super
- **Comments:** line (`--`) and block (`/* */`), in `extras` (float freely in tree)
- **Types:** primitive (`int`, `bool`, `char`, `double`, `void`, `typeOfNull`, `anyType`), `ptr to`, `array [N] of`, `record`/`endRecord`, `function (T) returns T`, named types with generics
- **Top-level:** `header`/`endHeader`, `code`/`endCode`, `uses` clause with renamings
- **Declarations:** `const`, `enum`, `type` (with `repeat1` for multiple aliases), `errors`, `var`
- **Functions:** prototypes (in headers), full declarations (in code), `parameter_list`, `external` modifier, `returns` clause
- **Statements:** `if`/`elseIf`/`else`/`endIf`, `while`/`endWhile`, `do`/`until`, `for`/`endFor` (both KPL-style and C-style), `switch`/`case`/`default`/`endSwitch`, `try`/`catch`/`endTry`, `return`, `break`, `continue`, `throw`, `free`, `debug`, assignment, expression statements
- **Expressions (17 precedence levels):** binary operators (`||`, `&&`, `|`, `^`, `&`, `==`, `!=`, `<`, `<=`, `>`, `>=`, `<<`, `>>`, `>>>`, `+`, `-`, `*`, `/`, `%`), unary (`!`, `-`, `*`, `&`), call, field access, method call, array access, `asPtrTo`, `asInteger`, `arraySize`, `isInstanceOf`, `isKindOf`, `sizeOf`, `new`/`alloc` constructors with field/array initializers, closures
- **OOP:** `interface`/`endInterface` (with `extends`, `messages`), `class`/`endClass` (with `implements`, `superclass`, `fields`, `methods`, type parameters), `behavior`/`endBehavior` with `method`/`endMethod`, method prototypes (normal, `infix`, `prefix`, keyword `at: T put: T`)
- **External scanner** (`src/scanner.c`): var block termination via 2-token lookahead, `*` prefix/infix disambiguation via newline tracking

### Remaining Work

- [ ] **Same-line `(` for calls/methods** — The external scanner has `SAME_LINE_LPAREN` defined but not yet wired into the grammar. Inserting it into `call_expression` and `method_call` caused regressions in var initializer contexts where tree-sitter resolved the identifier before consulting the scanner. Needs a different grammar structure (possibly a combined `call_or_identifier` rule that the scanner disambiguates, or GLR conflicts). Low priority since no example files currently trigger this issue.
- [ ] **Optional queries** — `locals.scm` (scope-aware highlighting), `tags.scm` (code navigation), `indents.scm` (auto-indentation), `outline.scm` (breadcrumbs/symbol outline)

### Precedence Map

Defined in `grammar.js` as the `PREC` constant:

```
KEYWORD_MSG: 1, CUSTOM_INFIX: 2, LOGICAL_OR: 3, LOGICAL_AND: 4,
BITWISE_OR: 5, BITWISE_XOR: 6, BITWISE_AND: 7, EQUALITY: 8,
RELATIONAL: 9, SHIFT: 10, ADDITIVE: 11, MULTIPLICATIVE: 12,
UNARY: 13, POSTFIX: 14, CALL: 15, PRIMARY: 16
```

### Conflict Resolutions Applied

- `var_declaration`: external scanner `_var_declarator_start` gates repeat continuation (replaces old `prec.right`)
- `binary_expression *`: external scanner `_same_line_star` ensures `*` is only infix when on same line as previous token
- `return_statement`: `prec.right` so `return (expr)` consumes the expression
- `function_type`: `prec.right` so `function () returns T` consumes the return type
- `named_type`: `prec.right` so `MyType [T]` consumes type arguments
- `method_call`: `PREC.POSTFIX + 1` to win over `field_access` for `.foo(x)` pattern
- `_keyword_method_proto`: `prec.right` to greedily consume `ID : Type` pairs
- `expression_statement`: `prec(-1)` so it's the last resort for statements

## Reference Parser Behavior (Non-CFG "Cheats")

The reference parser (`kpl-linter/BlitzSrc/parser.cc`) deviates from the published CFG in several ways. These are documented as "non-CFG restrictions" in the source.

### Newline-Sensitive Constructs

All three use `extractLineNumber(tokenMinusOne) == extractLineNumber(token)` (`lexer.cc:1409`), which extracts the 16-bit line number embedded in each token's position. The parser maintains 6 tokens of lookahead: `tokenMinusOne`, `token`, `token2`, `token3`, `token4`, `token5` (`main.h:266`).

1. **`*` prefix vs infix** (`parser.cc:3235`, `parseExpr13`): If `*` is on the same line as the previous token → infix multiplication. If preceded by a newline → prefix dereference. Our scanner mirrors this with `SAME_LINE_STAR`.

2. **Function calls** (`parser.cc:3534`, `parseExpr17`): `f(x)` is a call only if `(` is on the same line as `f`. Otherwise `f` is a standalone variable expression. Not yet wired into grammar (see Remaining Work).

3. **Method calls** (`parser.cc:3314`, `parseExpr16`): `.foo(x)` is a method call only if `foo` and `(` are on the same line. Otherwise it's field access. Not yet wired into grammar.

### Declaration Block Termination

These are NOT newline-sensitive — they use token-type lookahead:

- **VAR** (`parser.cc:3969`, `parseLocalVarDecls`): `while (token==ID && (token2==COMMA || token2==COLON))` — 2-token lookahead. Our scanner mirrors this with `VAR_DECLARATOR_START`.
- **CONST** (`parser.cc:4197`, `parseConstDecls`): `while (token==ID)` — 1-token lookahead. Works because const blocks are top-level only (followed by keywords, never bare identifiers). No scanner token needed.
- **TYPE** (`parser.cc:4311`, `parseTypeDefs`): Same as const — `while (token==ID)`. No scanner token needed.

### C-Style For Loop

The reference parser (`parser.cc:859`) checks `(token==FOR && token2==L_PAREN)` to distinguish:
- **C-style:** `for ( initStmts ; expr ; incrStmts ) bodyStmts endFor` — desugared into a `WhileStmt`
- **KPL-style:** `for ID = Expr to Expr [by Expr] bodyStmts endFor`

Our grammar handles both as alternatives in `for_statement`. No scanner needed since tree-sitter can disambiguate by the `(` after `for`.

## KPL Language Quick Reference

- **File types:** `.h` (headers), `.k` (code files), `.kpl` (alternate)
- **Comments:** `--` (line), `/* */` (block); doc comments use `--` blocks before/after declarations, associated by position (LSP concern, not tree-sitter)
- **Block delimiters:** `if`/`endIf`, `while`/`endWhile`, `function`/`endFunction`, `class`/`endClass`, etc.
- **Types:** `int`, `bool`, `char`, `void`, `double`, `ptr to T`, `array [N] of T`, `record`/`endRecord`, function types, named types with generics
- **Type casting:** `asPtrTo`, `asInteger`, `isInstanceOf`, `isKindOf`, `arraySize`
- **Header structure:** `header Name` / `uses` / `const` / `enum` / `type` / `errors` / `var` / `functions` / `interface` / `class` / `endHeader`
- **Code structure:** `code Name` / declarations / `function` / `behavior` / `endCode`
- **OOP:** Classes, interfaces, behaviors, methods (normal, infix, prefix, keyword), `superclass`, `self`, `super`
- **Semicolons:** Only used in C-style `for` loops. Statements are otherwise terminated by keywords.
- **Keyword messages:** `obj at: x put: y` constructs selector `at:put:` dynamically from `ID : expr` pairs.

## Task List

### Completed
- [x] Phase 1: Foundation — `source_file`, comments, identifiers, all literals
- [x] Phase 2: Types + Declarations + Top-level — all type rules, `header`/`code_file`, `uses`, `const`, `enum`, `type`, `errors`, `var`
- [x] Phase 3: Functions & Parameters — `parameter_list`, `function_prototype`, `function_declaration`, `functions_section`
- [x] Phase 4: Statements — all control flow (including C-style `for`), `return`, `break`, `continue`, `throw`, `free`, `debug`, assignment, expression statements
- [x] Phase 5: Expressions — all 17 precedence levels, binary/unary operators, call, field access, method call, array access, type cast operators, `sizeOf`, `new`/`alloc` constructors, closures
- [x] Phase 6: OOP — `interface`, `class`, `behavior` with `method`, method prototypes (normal, infix, prefix, keyword)
- [x] Phase 7: External scanner — `VAR_DECLARATOR_START` (2-token lookahead for var block termination), `SAME_LINE_STAR` (`*` prefix/infix disambiguation)
- [x] Fix `type_declaration` — now supports multiple `ID = Type` per `type` keyword via `type_declarator` sub-rule
- [x] Fix greedy `var_declaration` — replaced `prec.right` + `repeat1` with scanner-gated repeat
- [x] C-style `for` loop — `for ( initStmts ; expr ; incrStmts ) ... endFor`
- [x] Validate against all example files — 44/44 files parse with 0 errors
- [x] Highlight queries (`queries/highlights.scm`) — keywords, types, functions, variables, operators, literals, punctuation
- [x] Zed extension (`zed-kpl/`) — `extension.toml`, `config.toml`, `highlights.scm`

### Remaining
- [ ] **Same-line `(` disambiguation** — wire `SAME_LINE_LPAREN` into call/method grammar (blocked by parser state resolution issues)
- [ ] **Optional queries** — `locals.scm`, `tags.scm`, `indents.scm`, `outline.scm`

## Conventions

- Grammar defined in JavaScript (`grammar.js`) using tree-sitter DSL
- External scanner in C (`src/scanner.c`) — handles non-CFG constructs
- Generated parser in C (`src/parser.c`) — do not edit manually
- Tests in `test/corpus/*.txt` using tree-sitter test format
- Highlight queries in `queries/highlights.scm`
- Helper functions (`commaSep1`) defined after the grammar export
- Hidden rules prefixed with `_` (e.g., `_expression`, `_statement`, `_type`)
- Field names used for semantic children (e.g., `name:`, `type:`, `condition:`)
