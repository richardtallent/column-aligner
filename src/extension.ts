// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode"

interface ISplitRow {
	left: string
	right: string
	leftColPos: number
}

interface ILineState extends ISplitRow {
	lineNumber: number
	oldText: string
	tabs: number
}

// Number of column positions taken by a string, includint tab expansion
const colPosCount = (text: string, tabSize: number): number => {
	let col = 0
	for (const c of text.split("")) {
		col += c === "\t" ? tabSize - (col % tabSize) : 1
	}
	return col
}

const splitAtColPos = (text: string, splitCol: number, tabSize: number): ISplitRow => {
	let col = 0
	for (let i = 0; i < text.length; i++) {
		const c = text[i]
		col += c === "\t" ? tabSize - (col % tabSize) : 1
		if (col > splitCol) {
			return {
				left: text.substring(0, i),
				right: text.substring(i),
				leftColPos: col,
			}
		}
	}
	return {
		left: text,
		right: "",
		leftColPos: col,
	}
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	// The command has been defined in the package.json file
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand("column-aligner.alignColumns", () => {
		// The code you place here will be executed every time your command is executed
		const editor = vscode.window.activeTextEditor
		if (!editor) {
			return
		}
		// Get the user's preferred tab size
		const tabSize = (editor.options.tabSize as number) ?? 4
		// Convert the selection into a set of lines, using the starting column of each
		// selection. This allows selecting many rows based on a single column without having
		// to use a multi-cursor.
		const lineNumbersSeen = new Set<number>()
		const lines = [] as ILineState[]
		let targetCol = 0
		for (const s of editor.selections) {
			// Get the column *position* of the first line of this cursor. We'll attempt to
			// split each line at that position.
			const colPos = colPosCount(editor.document.lineAt(s.start.line).text.substring(0, s.start.character), tabSize)
			for (let rowNum = s.start.line; rowNum <= s.end.line; rowNum++) {
				// Skip lines already seen
				if (lineNumbersSeen.has(rowNum)) {
					continue
				}
				lineNumbersSeen.add(rowNum)
				// Split this line as close to the first selected row's cursor position as possible.
				const oldText = editor.document.lineAt(rowNum).text
				const splitLine = splitAtColPos(oldText, colPos, tabSize)
				// Construct a row state using that split, but with values trimmed to the left and right
				// of the cursor column.
				const newLineState = {
					lineNumber: rowNum,
					leftColPos: splitLine.leftColPos,
					left: splitLine.left.trimEnd(),
					right: splitLine.right.trimStart(),
					oldText: oldText,
				} as ILineState
				lines.push(newLineState)
				// Update the target column to this column if it is higher. For rows where we right-trimmed,
				// the desired position is to the right of the cursor to we end up with whitespace inserted.
				targetCol = Math.max(
					targetCol,
					newLineState.leftColPos + (splitLine.right.length - newLineState.right.length > 0 ? 1 : 0)
				)
			}
		}
		// Round the target column up to the nearest tab position
		targetCol = tabSize * Math.ceil(targetCol / tabSize)
		// console.log(targetCol)
		// For each row, compute the number of tabs needed to indent the row, at its current
		// cursor position, to the desired target column. This cannot be less than 0.
		lines.forEach((line) => {
			line.tabs = Math.max(0, Math.ceil((targetCol - colPosCount(line.left, tabSize)) / tabSize))
		})
		// console.log(JSON.stringify(rows))
		// Reset the selections
		editor.selections = []
		// Create the replacement text for each row, respecting the user's tab vs space setting
		const useSpaces = editor.options.insertSpaces as boolean
		editor.edit((editBuilder) => {
			lines.forEach((line) => {
				const inserted = useSpaces ? " ".repeat(line.tabs * tabSize) : "\t".repeat(line.tabs)
				const newText = line.left + inserted + line.right //.trimEnd()
				// Only record an edit if we're changing something. This helps protect the user's
				// history when they run the command and it does nothing.
				if (newText !== line.oldText) {
					editBuilder.replace(
						new vscode.Range(
							new vscode.Position(line.lineNumber, 0),
							new vscode.Position(line.lineNumber, line.oldText.length)
						),
						newText
					)
				}
			})
		})
		// Set the selection to a multi-cursor, one cursor per row, to the right of the tabs.
		editor.selections = lines.map(
			(line) =>
				new vscode.Selection(
					line.lineNumber,
					line.left.length + line.tabs * (useSpaces ? tabSize : 1),
					line.lineNumber,
					line.left.length + line.tabs * (useSpaces ? tabSize : 1)
				)
		)
	})
	context.subscriptions.push(disposable)
}

// This method is called when your extension is deactivated
export function deactivate() {}
