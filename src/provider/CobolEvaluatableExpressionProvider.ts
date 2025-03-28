import { EvaluatableExpressionProvider, TextDocument, Position, EvaluatableExpression, ProviderResult, window, Range } from "vscode";

/** Max column index to retrieve line content */
const MAX_COLUMN_INDEX = 300;
/** COBOL comment symbol */
const COBOL_COMMENT_SYMBOL = "*>";

/**
 * Class to control hover operations for COBOL debug
 */
export class CobolEvaluatableExpressionProvider implements EvaluatableExpressionProvider {

	provideEvaluatableExpression(document: TextDocument, position: Position): ProviderResult<EvaluatableExpression> {
		if (this.isCommentLine(document, position)) {
			return undefined;
		}
		const selectionRange = this.getSelectionRangeInEditor();
		if (selectionRange) {
			return new EvaluatableExpression(selectionRange);
		}
		const wordRange = document.getWordRangeAtPosition(position)
		if (!wordRange) {
			return undefined;
		}
		const trnsformedWordRange = this.transformWordRange(document, wordRange, position.line + 1);
		return new EvaluatableExpression(trnsformedWordRange);
	}

	/**
	 * Checks if the current line represents a comment line
	 *
	 * @param document document which is being evaluated
	 * @param position position of the current line
	 */
	private isCommentLine(document: TextDocument, position: Position): boolean {
		const start = new Position(position.line, 0);
		const end = new Position(position.line, MAX_COLUMN_INDEX);
		const range = new Range(start, end);
		const lineText = document.getText(range);
		return lineText.trimLeft().startsWith(COBOL_COMMENT_SYMBOL);
	}

	/**
	 * Returns the range selected by the user on editor, or undefined when there is
	 * no selection
	 */
	private getSelectionRangeInEditor(): Range | undefined {
		const textEditor = window.activeTextEditor;
		if (textEditor) {
			const startRange = textEditor.selection.start;
			const endRange = textEditor.selection.end;
			if (startRange.compareTo(endRange) !== 0) {
				return new Range(startRange, endRange);
			}
		}
		return undefined;
	}

	/**
	 * Transforms the word range to include additional context, such as COBOL OCCURS clauses.
	 *
	 * @param document The document being evaluated.
	 * @param wordRange The range of the word in the document.
	 * @param line The line number where the word is located.
	 * @returns A new range that includes the transformed word context.
	 */
	private transformWordRange(document: TextDocument, wordRange: Range, line: number): Range {
		const word = document.getText(wordRange)
		const sourceLine = this.getSourceLine(line - 1);
		if (!sourceLine) {
			return wordRange;
		}
		const editedSourceLine = sourceLine.substring(wordRange.start.character, sourceLine.length);

		const occursPattern = new RegExp(`\\b${word}\\s*\\(([^()]*|\\([^()]*\\))*\\)`, "i");
		const match = occursPattern.exec(editedSourceLine);

		if (match) {
			const startIndex = sourceLine.indexOf(match[0]);
			if (startIndex !== -1) {
				const start = new Position(line - 1, startIndex);
				const end = new Position(line - 1, startIndex + match[0].length);
				return new Range(start, end);
			}
		}

		return wordRange;
	}

	/**
	 * Retrieves the content of a specific line from the active editor.
	 *
	 * @param line The line number to retrieve.
	 * @returns The text of the specified line, or null if the line is out of range or the editor is not active.
	 */
	private getSourceLine(line: number): string | null {
		const editor = window.activeTextEditor;
		if (!editor) {
			return null;
		}

		if (line >= 0 && line < editor.document.lineCount) {
			return editor.document.lineAt(line).text;
		}

		return null;
	}

}

