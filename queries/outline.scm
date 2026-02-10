; outline.scm — KPL code outline / breadcrumbs for Zed

; Top-level structures
(header "header" @context name: (identifier) @name) @item
(code_file "code" @context name: (identifier) @name) @item

; Functions
(function_declaration "function" @context name: (identifier) @name) @item
(function_prototype name: (identifier) @name) @item

; OOP declarations
(class_declaration "class" @context name: (identifier) @name) @item
(interface_declaration "interface" @context name: (identifier) @name) @item
(behavior_declaration "behavior" @context name: (identifier) @name) @item

; Methods (nested inside behaviors)
(method_declaration "method" @context (method_prototype name: (identifier) @name)) @item
