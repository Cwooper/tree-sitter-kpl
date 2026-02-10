package tree_sitter_kpl_test

import (
	"testing"

	tree_sitter "github.com/tree-sitter/go-tree-sitter"
	tree_sitter_kpl "github.com/cwooper/tree-sitter-kpl/bindings/go"
)

func TestCanLoadGrammar(t *testing.T) {
	language := tree_sitter.NewLanguage(tree_sitter_kpl.Language())
	if language == nil {
		t.Errorf("Error loading Kernel Programming Language grammar")
	}
}
