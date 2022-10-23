import * as assert from "assert"

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from "vscode"
// import * as myExtension from '../../extension';

const sampleText = `
Line 1 text
Line 2 text is longer
Line 3
L4
Line5 text is shrt`

suite("Extension Test Suite", () => {
	vscode.window.showInformationMessage("Start all tests.")

	const e = vscode.window.activeTextEditor
	if (!e) {
		return
	}

	const setText = () =>
		e?.edit((b) =>
			b.replace(new vscode.Range(new vscode.Position(0, 0), new vscode.Position(e.document.lineCount - 1, e.document.lineAt(e.document.lineCount - 1).text.length)), sampleText)
		)

	test("No selection", () => {
		setText()
		e.selections = []
	})

	test("No selection", () => {
		setText()
		e.selections = [new vscode.Selection(1, 4, 1, 4), new vscode.Selection(2, 4, 2, 4)]
	})

	test("Sample test", () => {
		assert.strictEqual(-1, [1, 2, 3].indexOf(5))
		assert.strictEqual(-1, [1, 2, 3].indexOf(0))
	})
})
