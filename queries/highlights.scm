; highlights.scm — KPL syntax highlighting for Zed
; Maps tree-sitter-kpl node types to Zed theme captures
;
; NOTE: In tree-sitter highlighting, later patterns override earlier ones
; at the same depth. The catch-all (identifier) @variable must come first
; so that specific captures below take precedence.

; ─── Fallback ──────────────────────────────────────────────────────

; Catch-all: any identifier not matched by a later, more specific rule
(identifier) @variable

; ─── Comments ──────────────────────────────────────────────────────

(comment) @comment

; ─── Literals ──────────────────────────────────────────────────────

(integer_literal) @number
(hex_literal) @number
(double_literal) @number
(char_literal) @string
(string_literal) @string
(bool_literal) @boolean
(null_literal) @constant.builtin
(self_expression) @variable.special
(super_expression) @variable.special

; ─── Types ─────────────────────────────────────────────────────────

(primitive_type) @type.builtin

; Named type references
(named_type name: (identifier) @type)

; Type declarations
(type_declarator name: (identifier) @type)

; Type parameters (generics)
(type_parameter name: (identifier) @type)

; ─── Functions ─────────────────────────────────────────────────────

; Function declarations and prototypes
(function_declaration name: (identifier) @function)
(function_prototype name: (identifier) @function)

; Function calls
(call_expression function: (identifier) @function)

; Method names in declarations and calls
(method_call method: (identifier) @function)
(method_prototype name: (identifier) @function)

; Keyword method selectors (e.g., at: put:)
(keyword_parameter keyword: (identifier) @function)

; ─── OOP ───────────────────────────────────────────────────────────

; Class, interface, behavior names
(class_declaration name: (identifier) @type)
(interface_declaration name: (identifier) @type)
(behavior_declaration name: (identifier) @type)

; Header and code file names
(header name: (identifier) @type)
(code_file name: (identifier) @type)

; ─── Variables & Fields ────────────────────────────────────────────

; Constants
(const_declarator name: (identifier) @constant)

; Enum values
(enum_value name: (identifier) @enum)

; Error names
(error_declarator name: (identifier) @type)

; Parameters
(parameter name: (identifier) @variable.parameter)

; Field access
(field_access field: (identifier) @property)

; Field declarations
(class_field name: (identifier) @property)
(record_field name: (identifier) @property)

; Field initializers
(field_initializer name: (identifier) @property)

; Var declarations
(var_declarator name: (identifier) @variable)

; Catch clause
(catch_clause name: (identifier) @type)

; Throw statement
(throw_statement name: (identifier) @type)

; Renamings
(renaming from: (identifier) @variable)
(renaming to: (identifier) @variable)

; ─── Operators ─────────────────────────────────────────────────────

(unary_expression operator: _ @operator)

(prefix_operator) @operator

[
  "||" "&&"
  "|" "^" "&"
  "==" "!="
  "<" "<=" ">" ">="
  "<<" ">>" ">>>"
  "+" "-" "*" "/" "%"
] @operator

; Assignment
(assignment_statement "=" @operator)

; ─── Keywords ──────────────────────────────────────────────────────

; Top-level structure
[
  "header" "endHeader"
  "code" "endCode"
  "uses" "renaming"
] @keyword

; Declaration keywords
[
  "const"
  "enum"
  "type"
  "errors"
  "var"
  "functions"
  "external"
] @keyword

; Control flow
[
  "if" "elseIf" "else" "endIf"
  "while" "endWhile"
  "do" "until"
  "for" "endFor"
  "switch" "case" "default" "endSwitch"
  "try" "catch" "endTry"
  "return"
  "throw"
  "free"
] @keyword

; Single-token statement keywords (whole-node rules, not anonymous children)
(break_statement) @keyword
(continue_statement) @keyword
(debug_statement) @keyword

; Function/method keywords
[
  "function" "endFunction"
  "method" "endMethod"
  "returns"
  "infix" "prefix"
] @keyword

; OOP keywords
[
  "interface" "endInterface"
  "class" "endClass"
  "behavior" "endBehavior"
  "extends" "implements"
  "superclass"
  "fields" "methods" "messages"
] @keyword

; Type-related keywords
[
  "ptr" "to"
  "array" "of"
  "record" "endRecord"
] @keyword

; Expression keywords
[
  "asPtrTo" "asInteger"
  "arraySize"
  "isInstanceOf" "isKindOf"
  "sizeOf"
  "new" "alloc"
  "by"
] @keyword

; ─── Punctuation ───────────────────────────────────────────────────

["(" ")" "[" "]" "{" "}"] @punctuation.bracket

["," ":" ";"] @punctuation.delimiter

"." @punctuation.delimiter

