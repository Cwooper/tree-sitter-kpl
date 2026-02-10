/**
 * External scanner for KPL (tree-sitter-kpl).
 *
 * Mirrors the reference parser's (kpl-linter/BlitzSrc/parser.cc) strategies:
 *
 * 1. VAR_DECLARATOR_START — 2-token lookahead: ID followed by ',' or ':'
 *    Reference: parser.cc:3969 (parseLocalVarDecls)
 *
 * 2. SAME_LINE_STAR — '*' on same line as previous token = infix multiply
 *    Reference: parser.cc:3235 (parseExpr13)
 *
 * 3. SAME_LINE_LPAREN — '(' on same line as previous token = call/method
 *    Reference: parser.cc:3534 (parseExpr17), parser.cc:3314 (parseExpr16)
 */

#include "tree_sitter/parser.h"

#include <stdbool.h>
#include <string.h>

/* Must match the order in grammar.js externals array */
enum TokenType {
  VAR_DECLARATOR_START,
  SAME_LINE_STAR,
  SAME_LINE_LPAREN,
};

typedef struct {
  bool newline_before;
} Scanner;

static bool is_id_start(int32_t c) {
  return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c == '_';
}

static bool is_id_char(int32_t c) {
  return is_id_start(c) || (c >= '0' && c <= '9');
}

/* Skip whitespace and comments. Returns true if a newline was crossed. */
static bool skip_whitespace_and_comments(TSLexer *lexer) {
  bool saw_newline = false;

  while (!lexer->eof(lexer)) {
    int32_t c = lexer->lookahead;

    if (c == '\n' || c == '\r') {
      saw_newline = true;
      lexer->advance(lexer, true);
    } else if (c == ' ' || c == '\t') {
      lexer->advance(lexer, true);
    } else if (c == '-') {
      /* Peek for line comment '--' without consuming the first '-' */
      lexer->advance(lexer, true);
      if (lexer->lookahead != '-') {
        /* Single '-' is a minus operator, not a comment. We already consumed
         * it, but since we only call this during zero-width lookahead (after
         * mark_end), it won't affect the parse position. */
        return saw_newline;
      }
      /* Line comment: skip to end of line */
      lexer->advance(lexer, true);
      while (!lexer->eof(lexer) && lexer->lookahead != '\n') {
        lexer->advance(lexer, true);
      }
    } else if (c == '/') {
      lexer->advance(lexer, true);
      if (lexer->lookahead != '*') {
        /* Single '/' is division, not a comment */
        return saw_newline;
      }
      /* Block comment: skip until end delimiter */
      lexer->advance(lexer, true);
      while (!lexer->eof(lexer)) {
        if (lexer->lookahead == '\n' || lexer->lookahead == '\r') {
          saw_newline = true;
        }
        if (lexer->lookahead == '*') {
          lexer->advance(lexer, true);
          if (lexer->lookahead == '/') {
            lexer->advance(lexer, true);
            break;
          }
        } else {
          lexer->advance(lexer, true);
        }
      }
    } else {
      break;
    }
  }

  return saw_newline;
}

/*
 * Check if the upcoming tokens form the start of a var_declarator:
 * ID followed (through optional whitespace/comments) by ',' or ':'.
 *
 * Mirrors: while (token==ID && (token2==COMMA || token2==COLON))
 */
static bool check_var_declarator_start(TSLexer *lexer) {
  skip_whitespace_and_comments(lexer);

  if (!is_id_start(lexer->lookahead)) {
    return false;
  }

  /* Skip the identifier */
  while (!lexer->eof(lexer) && is_id_char(lexer->lookahead)) {
    lexer->advance(lexer, true);
  }

  skip_whitespace_and_comments(lexer);

  return lexer->lookahead == ',' || lexer->lookahead == ':';
}

/* ─── External scanner API ──────────────────────────────────────────── */

void *tree_sitter_kpl_external_scanner_create(void) {
  Scanner *scanner = (Scanner *)calloc(1, sizeof(Scanner));
  return scanner;
}

void tree_sitter_kpl_external_scanner_destroy(void *payload) {
  free(payload);
}

unsigned tree_sitter_kpl_external_scanner_serialize(void *payload, char *buffer) {
  Scanner *scanner = (Scanner *)payload;
  buffer[0] = scanner->newline_before ? 1 : 0;
  return 1;
}

void tree_sitter_kpl_external_scanner_deserialize(
  void *payload, const char *buffer, unsigned length
) {
  Scanner *scanner = (Scanner *)payload;
  scanner->newline_before = (length > 0) ? (buffer[0] != 0) : false;
}

bool tree_sitter_kpl_external_scanner_scan(
  void *payload, TSLexer *lexer, const bool *valid_symbols
) {
  Scanner *scanner = (Scanner *)payload;

  if (valid_symbols[VAR_DECLARATOR_START]) {
    lexer->mark_end(lexer);
    if (check_var_declarator_start(lexer)) {
      lexer->result_symbol = VAR_DECLARATOR_START;
      return true;
    }
    return false;
  }

  if (valid_symbols[SAME_LINE_STAR] || valid_symbols[SAME_LINE_LPAREN]) {
    bool saw_newline = skip_whitespace_and_comments(lexer);
    scanner->newline_before = saw_newline;

    if (valid_symbols[SAME_LINE_STAR] && lexer->lookahead == '*' && !saw_newline) {
      lexer->mark_end(lexer);
      lexer->result_symbol = SAME_LINE_STAR;
      return true;
    }

    if (valid_symbols[SAME_LINE_LPAREN] && lexer->lookahead == '(' && !saw_newline) {
      lexer->mark_end(lexer);
      lexer->result_symbol = SAME_LINE_LPAREN;
      return true;
    }

    return false;
  }

  return false;
}
