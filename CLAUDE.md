# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Tree-sitter grammar for **KPL** (Kernel Programming Language), a language designed by Harry Porter at PSU that compiles to Blitz assembly. This grammar enables syntax highlighting and structural parsing across editors (VS Code, Neovim, Zed, Helix, etc.).

**Companion repo:** [kpl-linter](https://github.com/Cwooper/kpl-linter) — VS Code extension and language server that consumes this grammar.

**Key references:**
- [KPL Overview (PDF)](https://web.cecs.pdx.edu/~harry/Blitz/BlitzDoc/KPLOverview.pdf)
- [Context Free Grammar (PDF)](https://web.cecs.pdx.edu/~harry/Blitz/BlitzDoc/Syntax.pdf)
- [Blitz compiler source](https://web.cecs.pdx.edu/~harry/Blitz/BlitzSrc/) — the reference `parser.cc` and `lexer.cc` are the ground truth for KPL's grammar
- [Code examples](https://web.cecs.pdx.edu/~harry/Blitz/OSProject/p2/)

## Development Workflow

**Do NOT jump into implementation** unless the user explicitly requests it or it is heavily inferred from back-and-forth conversation. Default to planning, discussing, and confirming approach first.

### Commands

```bash
pnpm install                          # Install dependencies
pnpm run generate                     # Generate parser from grammar.js → src/parser.c
pnpm test                             # Run test corpus (test/corpus/)
pnpm run parse -- <file>              # Parse a file and print the syntax tree
pnpm run parse -- -d <file>           # Parse with debug output (shows parser states)
pnpm start                            # Build WASM and launch playground
pnpm run test:node                    # Run Node.js binding tests
```

### Testing

Tests live in `test/corpus/*.txt` using tree-sitter's test format:

```
================================================================================
Test Name
================================================================================

source code here

--------------------------------------------------------------------------------

(expected_syntax_tree)
```

Run a specific test by name: `pnpm exec tree-sitter test -i 'Test Name'`

Update expected outputs automatically: `pnpm exec tree-sitter test -u`

## KPL Language Quirks (Non-CFG)

The KPL grammar has three constructs that violate the context-free grammar and require an **external scanner** (`src/scanner.c`):

1. **`*` prefix vs infix** — If `*` is on the same line as the previous token, it's infix (multiplication). If preceded by a newline, it's prefix (dereference). The reference parser uses `extractLineNumber(tokenMinusOne) == extractLineNumber(token)` to decide.

2. **Function calls** — `f(x)` is a call only if `(` is on the same line as the identifier. Otherwise `f` is a variable and `(x)` starts a new expression.

3. **Method calls** — `.foo(x)` is a method call only if `foo` and `(` are on the same line. Otherwise it's field access.

The reference parser (`BlitzSrc/parser.cc`) uses a 5-token lookahead buffer and `tokenMinusOne` for line comparisons. These are explicitly commented as "non-CFG restrictions" in the source.

**Keyword messages** are also unusual: `obj at: x put: y` constructs the selector `at:put:` dynamically from `ID : expr` pairs.

## KPL Language Quick Reference

- **File types:** `.h` (headers), `.k` (code files), `.kpl` (alternate)
- **Comments:** `--` (line), `/* */` (block)
- **Block delimiters:** `if`/`endIf`, `while`/`endWhile`, `function`/`endFunction`, `class`/`endClass`, etc.
- **Types:** `int`, `bool`, `char`, `void`, `double`, `ptr to T`, `array [N] of T`, function types
- **Generics:** `class List [T: Listable]`
- **Type casting:** `asPtrTo`, `asInteger`, `isInstanceOf`, `isKindOf`
- **Header structure:** `header Name` / `uses` / `functions` / `endHeader`
- **Code structure:** `code Name` / `behavior` blocks / `endCode`
- **OOP:** Classes, interfaces, behaviors, methods (normal, infix, prefix, keyword)
- **No semicolons** — statements terminated by keywords (`endIf`, `endWhile`, etc.) or newlines in the 3 special cases above
