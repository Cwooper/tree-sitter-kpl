/**
 * @file Kernel Programming Language
 * @author Cwooper <cwooperm@gmail.com>
 * @license MIT
 * @see {@link https://web.cecs.pdx.edu/~harry/Blitz/BlitzDoc/Syntax.pdf} CFG Reference
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

const PREC = {
  KEYWORD_MSG: 1,
  CUSTOM_INFIX: 2,
  LOGICAL_OR: 3,
  LOGICAL_AND: 4,
  BITWISE_OR: 5,
  BITWISE_XOR: 6,
  BITWISE_AND: 7,
  EQUALITY: 8,
  RELATIONAL: 9,
  SHIFT: 10,
  ADDITIVE: 11,
  MULTIPLICATIVE: 12,
  UNARY: 13,
  POSTFIX: 14,
  CALL: 15,
  PRIMARY: 16,
};

export default grammar({
  name: "kpl",

  extras: $ => [
    /\s+/,
    $.comment,
  ],

  externals: $ => [
    $._var_declarator_start,
    $._same_line_star,
  ],

  word: $ => $.identifier,

  rules: {
    source_file: $ => repeat($._definition),

    _definition: $ => choice(
      $.header,
      $.code_file,
      // Bare expressions/literals for testing (will be refined later)
      $._expression,
    ),

    // ─── Top-level Structures ───────────────────────────────────

    header: $ => seq(
      "header",
      field("name", $.identifier),
      optional($.uses_clause),
      repeat($._header_declaration),
      "endHeader",
    ),

    code_file: $ => seq(
      "code",
      field("name", $.identifier),
      repeat($._code_declaration),
      "endCode",
    ),

    _header_declaration: $ => choice(
      $.const_declaration,
      $.enum_declaration,
      $.type_declaration,
      $.error_declaration,
      $.var_declaration,
      $.functions_section,
      $.interface_declaration,
      $.class_declaration,
    ),

    _code_declaration: $ => choice(
      $.const_declaration,
      $.enum_declaration,
      $.type_declaration,
      $.error_declaration,
      $.var_declaration,
      $.function_declaration,
      $.interface_declaration,
      $.class_declaration,
      $.behavior_declaration,
    ),

    // ─── Uses Clause ────────────────────────────────────────────

    uses_clause: $ => seq(
      "uses",
      $.identifier,
      repeat($.renaming),
      repeat(seq(",", $.identifier, repeat($.renaming))),
    ),

    renaming: $ => seq(
      "renaming",
      field("from", $.identifier),
      "to",
      field("to", $.identifier),
    ),

    // ─── Declarations ───────────────────────────────────────────

    const_declaration: $ => seq(
      "const",
      repeat1($.const_declarator),
    ),

    const_declarator: $ => seq(
      field("name", $.identifier),
      "=",
      field("value", $._expression),
    ),

    enum_declaration: $ => seq(
      "enum",
      $.enum_value,
      repeat(seq(",", $.enum_value)),
    ),

    enum_value: $ => seq(
      field("name", $.identifier),
      optional(seq("=", field("value", $._expression))),
    ),

    type_declaration: $ => seq(
      "type",
      repeat1($.type_declarator),
    ),

    type_declarator: $ => seq(
      field("name", $.identifier),
      "=",
      field("type", $._type),
    ),

    error_declaration: $ => seq(
      "errors",
      repeat1($.error_declarator),
    ),

    error_declarator: $ => seq(
      field("name", $.identifier),
      $.parameter_list,
    ),

    var_declaration: $ => seq(
      "var",
      $.var_declarator,
      repeat(seq($._var_declarator_start, $.var_declarator)),
    ),

    var_declarator: $ => seq(
      repeat(seq(field("name", $.identifier), ",")),
      field("name", $.identifier),
      ":",
      field("type", $._type),
      optional(seq("=", field("value", $._expression))),
    ),

    // ─── Types ──────────────────────────────────────────────────

    _type: $ => choice(
      $.primitive_type,
      $.pointer_type,
      $.array_type,
      $.record_type,
      $.function_type,
      $.named_type,
    ),

    primitive_type: _ => choice(
      "int", "bool", "char", "double", "void", "typeOfNull", "anyType",
    ),

    pointer_type: $ => seq(
      "ptr", "to",
      field("type", $._type),
    ),

    array_type: $ => seq(
      "array",
      optional(seq("[", commaSep1($.array_dimension), "]")),
      "of",
      field("type", $._type),
    ),

    array_dimension: $ => choice(
      "*",
      $._expression,
    ),

    record_type: $ => seq(
      "record",
      repeat1($.record_field),
      "endRecord",
    ),

    record_field: $ => seq(
      repeat(seq(field("name", $.identifier), ",")),
      field("name", $.identifier),
      ":",
      field("type", $._type),
    ),

    function_type: $ => prec.right(seq(
      "function",
      "(",
      optional($.type_list),
      ")",
      optional(seq("returns", field("return_type", $._type))),
    )),

    type_list: $ => seq(
      $._type,
      repeat(seq(",", $._type)),
    ),

    named_type: $ => prec.right(seq(
      field("name", $.identifier),
      optional($.type_arguments),
    )),

    type_arguments: $ => seq(
      "[",
      $._type,
      repeat(seq(",", $._type)),
      "]",
    ),

    // ─── Parameters ─────────────────────────────────────────────

    parameter_list: $ => seq(
      "(",
      optional(commaSep1($.parameter)),
      ")",
    ),

    parameter: $ => seq(
      repeat(seq(field("name", $.identifier), ",")),
      field("name", $.identifier),
      ":",
      field("type", $._type),
    ),

    // ─── Functions (stubs for Phase 3) ──────────────────────────

    functions_section: $ => seq(
      "functions",
      repeat1($.function_prototype),
    ),

    function_prototype: $ => seq(
      optional("external"),
      field("name", $.identifier),
      $.parameter_list,
      optional(seq("returns", field("return_type", $._type))),
    ),

    function_declaration: $ => seq(
      "function",
      field("name", $.identifier),
      $.parameter_list,
      optional(seq("returns", field("return_type", $._type))),
      repeat($.var_declaration),
      repeat($._statement),
      "endFunction",
    ),

    // ─── OOP ─────────────────────────────────────────────────────

    interface_declaration: $ => seq(
      "interface",
      field("name", $.identifier),
      optional($.type_parameters),
      optional($.extends_clause),
      optional($.messages_section),
      "endInterface",
    ),

    extends_clause: $ => seq(
      "extends",
      commaSep1($.named_type),
    ),

    messages_section: $ => seq(
      "messages",
      repeat1($.method_prototype),
    ),

    class_declaration: $ => seq(
      "class",
      field("name", $.identifier),
      optional($.type_parameters),
      optional($.implements_clause),
      optional(seq("superclass", field("superclass", $.named_type))),
      optional($.fields_section),
      optional($.methods_section),
      "endClass",
    ),

    implements_clause: $ => seq(
      "implements",
      commaSep1($.named_type),
    ),

    fields_section: $ => seq(
      "fields",
      repeat1($.class_field),
    ),

    class_field: $ => seq(
      repeat(seq(field("name", $.identifier), ",")),
      field("name", $.identifier),
      ":",
      field("type", $._type),
    ),

    methods_section: $ => seq(
      "methods",
      repeat1($.method_prototype),
    ),

    type_parameters: $ => seq(
      "[",
      commaSep1($.type_parameter),
      "]",
    ),

    type_parameter: $ => seq(
      field("name", $.identifier),
      ":",
      field("type", $._type),
    ),

    behavior_declaration: $ => seq(
      "behavior",
      field("name", $.identifier),
      optional(seq("for", field("for", $.named_type))),
      repeat1($.method_declaration),
      "endBehavior",
    ),

    method_declaration: $ => seq(
      "method",
      $.method_prototype,
      repeat($.var_declaration),
      repeat($._statement),
      "endMethod",
    ),

    method_prototype: $ => choice(
      $._normal_method_proto,
      $._infix_method_proto,
      $._prefix_method_proto,
      $._keyword_method_proto,
    ),

    _normal_method_proto: $ => seq(
      field("name", $.identifier),
      $.parameter_list,
      optional(seq("returns", field("return_type", $._type))),
    ),

    _infix_method_proto: $ => seq(
      "infix",
      field("name", $.identifier),
      $.parameter_list,
      optional(seq("returns", field("return_type", $._type))),
    ),

    _prefix_method_proto: $ => seq(
      "prefix",
      field("operator", $.prefix_operator),
      $.parameter_list,
      optional(seq("returns", field("return_type", $._type))),
    ),

    prefix_operator: _ => choice("!", "-", "*", "&", "~"),

    _keyword_method_proto: $ => prec.right(seq(
      repeat1($.keyword_parameter),
      optional(seq("returns", field("return_type", $._type))),
    )),

    keyword_parameter: $ => seq(
      field("keyword", $.identifier),
      ":",
      field("type", $._type),
    ),

    // ─── Statements ────────────────────────────────────────────

    _statement: $ => choice(
      $.if_statement,
      $.while_statement,
      $.do_until_statement,
      $.for_statement,
      $.switch_statement,
      $.try_statement,
      $.return_statement,
      $.break_statement,
      $.continue_statement,
      $.throw_statement,
      $.free_statement,
      $.debug_statement,
      $.assignment_statement,
      $.expression_statement,
    ),

    expression_statement: $ => prec(-1, $._expression),

    if_statement: $ => seq(
      "if",
      field("condition", $._expression),
      repeat($._statement),
      repeat($.elseif_clause),
      optional($.else_clause),
      "endIf",
    ),

    elseif_clause: $ => seq(
      "elseIf",
      field("condition", $._expression),
      repeat($._statement),
    ),

    else_clause: $ => seq(
      "else",
      repeat($._statement),
    ),

    while_statement: $ => seq(
      "while",
      field("condition", $._expression),
      repeat($._statement),
      "endWhile",
    ),

    do_until_statement: $ => seq(
      "do",
      repeat($._statement),
      "until",
      field("condition", $._expression),
    ),

    for_statement: $ => choice(
      // Standard KPL for: for ID = Expr to Expr [by Expr] ... endFor
      seq(
        "for",
        field("iterator", $._expression),
        "=",
        field("from", $._expression),
        "to",
        field("to", $._expression),
        optional(seq("by", field("by", $._expression))),
        repeat($._statement),
        "endFor",
      ),
      // C-style for: for ( initStmts ; expr ; incrStmts ) ... endFor
      // Reference: parser.cc:859 — (token==FOR && token2==L_PAREN)
      seq(
        "for",
        "(",
        repeat($._statement),
        ";",
        optional(field("condition", $._expression)),
        ";",
        repeat($._statement),
        ")",
        repeat($._statement),
        "endFor",
      ),
    ),

    switch_statement: $ => seq(
      "switch",
      field("value", $._expression),
      repeat1($.case_clause),
      optional($.default_clause),
      "endSwitch",
    ),

    case_clause: $ => seq(
      "case",
      field("value", $._expression),
      ":",
      repeat($._statement),
    ),

    default_clause: $ => seq(
      "default",
      ":",
      repeat($._statement),
    ),

    try_statement: $ => seq(
      "try",
      repeat($._statement),
      repeat1($.catch_clause),
      "endTry",
    ),

    catch_clause: $ => seq(
      "catch",
      field("name", $.identifier),
      $.parameter_list,
      ":",
      repeat($._statement),
    ),

    return_statement: $ => prec.right(seq(
      "return",
      optional($._expression),
    )),

    break_statement: _ => "break",

    continue_statement: _ => "continue",

    throw_statement: $ => seq(
      "throw",
      field("name", $.identifier),
      $.argument_list,
    ),

    free_statement: $ => seq(
      "free",
      $._expression,
    ),

    debug_statement: _ => "debug",

    assignment_statement: $ => seq(
      field("left", $._expression),
      "=",
      field("right", $._expression),
    ),

    // ─── Expressions ────────────────────────────────────────────

    _expression: $ => choice(
      $._literal,
      $.identifier,
      $.parenthesized_expression,
      $.binary_expression,
      $.unary_expression,
      $.call_expression,
      $.field_access,
      $.method_call,
      $.array_access,
      $.as_ptr_to_expression,
      $.as_integer_expression,
      $.array_size_expression,
      $.is_instance_of_expression,
      $.is_kind_of_expression,
      $.size_of_expression,
      $.constructor_expression,
      $.closure_expression,
    ),

    parenthesized_expression: $ => seq("(", $._expression, ")"),

    binary_expression: $ => choice(
      // Logical OR (lowest binary precedence)
      prec.left(PREC.LOGICAL_OR, seq(field("left", $._expression), "||", field("right", $._expression))),
      // Logical AND
      prec.left(PREC.LOGICAL_AND, seq(field("left", $._expression), "&&", field("right", $._expression))),
      // Bitwise OR
      prec.left(PREC.BITWISE_OR, seq(field("left", $._expression), "|", field("right", $._expression))),
      // Bitwise XOR
      prec.left(PREC.BITWISE_XOR, seq(field("left", $._expression), "^", field("right", $._expression))),
      // Bitwise AND
      prec.left(PREC.BITWISE_AND, seq(field("left", $._expression), "&", field("right", $._expression))),
      // Equality
      prec.left(PREC.EQUALITY, seq(field("left", $._expression), "==", field("right", $._expression))),
      prec.left(PREC.EQUALITY, seq(field("left", $._expression), "!=", field("right", $._expression))),
      // Relational
      prec.left(PREC.RELATIONAL, seq(field("left", $._expression), "<", field("right", $._expression))),
      prec.left(PREC.RELATIONAL, seq(field("left", $._expression), "<=", field("right", $._expression))),
      prec.left(PREC.RELATIONAL, seq(field("left", $._expression), ">", field("right", $._expression))),
      prec.left(PREC.RELATIONAL, seq(field("left", $._expression), ">=", field("right", $._expression))),
      // Shift
      prec.left(PREC.SHIFT, seq(field("left", $._expression), "<<", field("right", $._expression))),
      prec.left(PREC.SHIFT, seq(field("left", $._expression), ">>", field("right", $._expression))),
      prec.left(PREC.SHIFT, seq(field("left", $._expression), ">>>", field("right", $._expression))),
      // Additive
      prec.left(PREC.ADDITIVE, seq(field("left", $._expression), "+", field("right", $._expression))),
      prec.left(PREC.ADDITIVE, seq(field("left", $._expression), "-", field("right", $._expression))),
      // Multiplicative — '*' requires same-line check (non-CFG: newline before * = prefix dereference)
      prec.left(PREC.MULTIPLICATIVE, seq(field("left", $._expression), $._same_line_star, "*", field("right", $._expression))),
      prec.left(PREC.MULTIPLICATIVE, seq(field("left", $._expression), "/", field("right", $._expression))),
      prec.left(PREC.MULTIPLICATIVE, seq(field("left", $._expression), "%", field("right", $._expression))),
    ),

    unary_expression: $ => prec.right(PREC.UNARY, seq(
      field("operator", choice("!", "-", "*", "&")),
      field("operand", $._expression),
    )),

    call_expression: $ => prec(PREC.CALL, seq(
      field("function", $.identifier),
      $.argument_list,
    )),

    field_access: $ => prec.left(PREC.POSTFIX, seq(
      field("object", $._expression),
      ".",
      field("field", $.identifier),
    )),

    method_call: $ => prec.left(PREC.POSTFIX + 1, seq(
      field("object", $._expression),
      ".",
      field("method", $.identifier),
      $.argument_list,
    )),

    array_access: $ => prec.left(PREC.POSTFIX, seq(
      field("array", $._expression),
      "[",
      field("index", $._expression),
      "]",
    )),

    // Postfix type operators
    as_ptr_to_expression: $ => prec.left(PREC.POSTFIX, seq(
      $._expression,
      "asPtrTo",
      field("type", $._type),
    )),

    as_integer_expression: $ => prec.left(PREC.POSTFIX, seq(
      $._expression,
      "asInteger",
    )),

    array_size_expression: $ => prec.left(PREC.POSTFIX, seq(
      $._expression,
      "arraySize",
    )),

    is_instance_of_expression: $ => prec.left(PREC.POSTFIX, seq(
      $._expression,
      "isInstanceOf",
      field("type", $._type),
    )),

    is_kind_of_expression: $ => prec.left(PREC.POSTFIX, seq(
      $._expression,
      "isKindOf",
      field("type", $._type),
    )),

    size_of_expression: $ => seq(
      "sizeOf",
      field("type", $._type),
    ),

    constructor_expression: $ => prec.right(seq(
      choice("new", "alloc"),
      field("type", $._type),
      optional(choice(
        $.field_initializer_list,
        $.array_initializer_list,
      )),
    )),

    field_initializer_list: $ => seq(
      "{",
      commaSep1($.field_initializer),
      "}",
    ),

    field_initializer: $ => seq(
      field("name", $.identifier),
      "=",
      field("value", $._expression),
    ),

    array_initializer_list: $ => seq(
      "{",
      commaSep1($.array_initializer_element),
      "}",
    ),

    array_initializer_element: $ => seq(
      optional(seq(field("count", $._expression), "of")),
      field("value", $._expression),
    ),

    closure_expression: $ => seq(
      "function",
      $.parameter_list,
      optional(seq("returns", field("return_type", $._type))),
      repeat($.var_declaration),
      repeat($._statement),
      "endFunction",
    ),

    argument_list: $ => seq(
      "(",
      optional(commaSep1($._expression)),
      ")",
    ),

    _literal: $ => choice(
      $.integer_literal,
      $.hex_literal,
      $.double_literal,
      $.char_literal,
      $.string_literal,
      $.bool_literal,
      $.null_literal,
      $.self_expression,
      $.super_expression,
    ),

    // ─── Literals ───────────────────────────────────────────────

    integer_literal: _ => /[0-9]+/,

    hex_literal: _ => /0[xX][0-9a-fA-F]+/,

    double_literal: _ => /[0-9]+\.[0-9]+([eE][+-]?[0-9]+)?/,

    char_literal: _ => /'([^'\\]|\\.)'/,

    string_literal: _ => /"([^"\\]|\\.)*"/,

    bool_literal: _ => choice("true", "false"),

    null_literal: _ => "null",

    self_expression: _ => "self",

    super_expression: _ => "super",

    // ─── Comments ───────────────────────────────────────────────

    comment: _ => choice(
      seq("--", /[^\n]*/),
      seq("/*", /[^*]*\*+([^/*][^*]*\*+)*/, "/"),
    ),

    identifier: _ => /[a-zA-Z_][a-zA-Z0-9_]*/,
  },
});

// ─── Helpers ──────────────────────────────────────────────────────

/**
 * Comma-separated list with at least one element.
 * @param {RuleOrLiteral} rule
 */
function commaSep1(rule) {
  return seq(rule, repeat(seq(",", rule)));
}
