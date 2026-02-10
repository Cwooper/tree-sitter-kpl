# tree-sitter-kpl

Tree-sitter grammar for [KPL](https://web.cecs.pdx.edu/~harry/Blitz/) (Kernel Programming Language), a systems programming language designed by Harry Porter at Portland State University. KPL compiles to Blitz assembly and runs on the Blitz emulator.

## File Types

| Extension | Description |
|-----------|-------------|
| `.k`      | KPL code files |
| `.kpl`    | KPL code files (alternate) |
| `.h`      | KPL header files |

## Usage

### Neovim (nvim-treesitter)

Add KPL to your nvim-treesitter config. (Instructions TBD once grammar is stable.)

### VS Code

Used by the [kpl-linter](https://github.com/Cwooper/kpl-linter) extension.

### Zed / Helix

These editors can consume tree-sitter grammars directly. (Instructions TBD.)

## Development

Requires [tree-sitter CLI](https://tree-sitter.github.io/tree-sitter/) (`>= 0.25`).

```bash
pnpm install --ignore-scripts   # Install deps (generate parser first)
tree-sitter generate             # Generate parser from grammar.js
tree-sitter test                 # Run test corpus
tree-sitter parse examples/Main.k  # Parse a file
tree-sitter parse -d examples/Main.k  # Parse with debug output
```

### Testing

Tests live in `test/corpus/*.txt`:

```bash
tree-sitter test                    # Run all tests
tree-sitter test -i 'test name'    # Run a specific test (regex)
tree-sitter test -u                 # Auto-update expected outputs
```

## References

- [KPL Overview](https://web.cecs.pdx.edu/~harry/Blitz/BlitzDoc/KPLOverview.pdf)
- [Context Free Grammar](https://web.cecs.pdx.edu/~harry/Blitz/BlitzDoc/Syntax.pdf)
- [Blitz Instruction Set](https://web.cecs.pdx.edu/~harry/Blitz/BlitzDoc/InstructionSet.pdf)
- [Blitz Compiler Source](https://web.cecs.pdx.edu/~harry/Blitz/BlitzSrc/)
- [Code Examples](https://web.cecs.pdx.edu/~harry/Blitz/OSProject/p2/)

## License

MIT
