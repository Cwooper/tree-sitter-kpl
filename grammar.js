/**
 * @file Kernel Programming Language
 * @author Cwooper <cwooperm@gmail.com>
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

export default grammar({
  name: "kpl",

  rules: {
    // TODO: add the actual grammar rules
    source_file: $ => "hello"
  }
});
