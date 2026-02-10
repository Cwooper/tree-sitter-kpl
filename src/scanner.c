/**
 * External scanner for KPL (tree-sitter-kpl).
 *
 * Mirrors the reference parser's (kpl-linter/BlitzSrc/parser.cc) strategies:
 *
 * 1. VAR_DECLARATOR_START — 2-token lookahead: ID followed by ',' or ':'
 *    Reference: parseLocalVarDecls()
 *
 * 2. SAME_LINE_STAR — '*' on same line as previous token = infix multiply
 *    Reference: parseExpr13()
 */

#include "tree_sitter/parser.h"

#include <stdbool.h>

/* Must match the order in grammar.js externals array */
enum TokenType {
  VAR_DECLARATOR_START,
  SAME_LINE_STAR,
};

static bool is_id_start(int32_t c) {
  return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c == '_';
}

static bool is_id_char(int32_t c) {
  return is_id_start(c) || (c >= '0' && c <= '9');
}

/**
 * Skip whitespace and comments, tracking newlines.
 *
 * Returns true if a newline was crossed. All advances use skip=true
 * so nothing consumed here becomes part of a token span (assuming
 * mark_end was called before entry).
 *
 * Limitation: if a lone '-' or '/' is encountered (not a comment start),
 * that character is consumed and cannot be un-advanced. The caller's
 * subsequent lookahead check will see the character AFTER the '-' or '/'.
 * This is acceptable because these tokens only appear in contexts where
 * '-' and '/' cannot be the meaningful next character (var declarators
 * start with identifiers, and '*' / '(' are distinct characters).
 */
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
      lexer->advance(lexer, true);
      if (lexer->lookahead != '-') {
        return saw_newline;
      }
      /* Line comment -- skip to end of line */
      lexer->advance(lexer, true);
      while (!lexer->eof(lexer) && lexer->lookahead != '\n') {
        lexer->advance(lexer, true);
      }
    } else if (c == '/') {
      lexer->advance(lexer, true);
      if (lexer->lookahead != '*') {
        return saw_newline;
      }
      /* Block comment -- skip until end delimiter */
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

/**
 * Check if the upcoming tokens form the start of a var_declarator:
 * ID followed (through whitespace/comments) by ',' or ':'.
 *
 * Mirrors: while (token==ID && (token2==COMMA || token2==COLON))
 */
static bool check_var_declarator_start(TSLexer *lexer) {
  skip_whitespace_and_comments(lexer);

  if (!is_id_start(lexer->lookahead)) {
    return false;
  }

  while (!lexer->eof(lexer) && is_id_char(lexer->lookahead)) {
    lexer->advance(lexer, true);
  }

  skip_whitespace_and_comments(lexer);

  return lexer->lookahead == ',' || lexer->lookahead == ':';
}

/* ─── External scanner API ──────────────────────────────────────────── */

/* Stateless scanner — no heap allocation needed */

void *tree_sitter_kpl_external_scanner_create(void) {
  return NULL;
}

void tree_sitter_kpl_external_scanner_destroy(void *payload) {
}

unsigned tree_sitter_kpl_external_scanner_serialize(void *payload, char *buffer) {
  return 0;
}

void tree_sitter_kpl_external_scanner_deserialize(
  void *payload, const char *buffer, unsigned length
) {
}

bool tree_sitter_kpl_external_scanner_scan(
  void *payload, TSLexer *lexer, const bool *valid_symbols
) {
  /* Note: with only 2 external tokens, we cannot reliably detect error
   * recovery (where all tokens are valid) since both may legitimately be
   * valid simultaneously. Add an error recovery guard here if more
   * external tokens are added in the future. */

  if (valid_symbols[VAR_DECLARATOR_START]) {
    lexer->mark_end(lexer);
    if (check_var_declarator_start(lexer)) {
      lexer->result_symbol = VAR_DECLARATOR_START;
      return true;
    }
    return false;
  }

  if (valid_symbols[SAME_LINE_STAR]) {
    lexer->mark_end(lexer);
    bool saw_newline = skip_whitespace_and_comments(lexer);

    if (lexer->lookahead == '*' && !saw_newline) {
      lexer->result_symbol = SAME_LINE_STAR;
      return true;
    }

    return false;
  }

  return false;
}
