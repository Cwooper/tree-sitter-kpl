import XCTest
import SwiftTreeSitter
import TreeSitterKpl

final class TreeSitterKplTests: XCTestCase {
    func testCanLoadGrammar() throws {
        let parser = Parser()
        let language = Language(language: tree_sitter_kpl())
        XCTAssertNoThrow(try parser.setLanguage(language),
                         "Error loading Kernel Programming Language grammar")
    }
}
