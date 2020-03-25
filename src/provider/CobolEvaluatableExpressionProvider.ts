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
		return wordRange ? new EvaluatableExpression(wordRange) : undefined;
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

}

