import { EvaluatableExpressionProvider, TextDocument, Position, EvaluatableExpression, ProviderResult, window, Range } from "vscode";
import * as path from "path";

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
			const variableName = document.getText(selectionRange);
			const expression = this.buildExpression(variableName, document, position);
			return new EvaluatableExpression(selectionRange, expression);
		}
		const wordRange = document.getWordRangeAtPosition(position)
		if (!wordRange) {
			return undefined;
		}
		const trnsformedWordRange = this.transformWordRange(document, wordRange, position.line + 1);
		const variableName = document.getText(trnsformedWordRange);
		const expression = this.buildExpression(variableName, document, position);
		return new EvaluatableExpression(trnsformedWordRange, expression);
	}

	/**
	 * Builds the display expression for a variable, adding -c PROGRAM or -c PROGRAM:>METHOD
	 * prefix so the value is always resolved in the context of the correct scope.
	 * Method scope is only added when the variable declaration is found inside the method block.
	 */
	private buildExpression(variableName: string, document: TextDocument, position: Position): string {
		const programName = path.parse(document.fileName).name.toUpperCase();
		const methodName = this.findMethodScopeForVariable(document, position, variableName);
		if (methodName) {
			return `-c ${programName}:>${methodName} ${variableName}`;
		}
		return `-c ${programName} ${variableName}`;
	}

	/**
	 * Determines if a variable belongs to a method scope by:
	 * 1. Searching backwards from the cursor for the nearest enclosing method-id (fast boundary).
	 * 2. If inside a method, searching for the variable declaration only within that method block.
	 *    If found → method scope; if not found → program scope.
	 */
	private findMethodScopeForVariable(document: TextDocument, position: Position, variableName: string): string | undefined {
		const method = this.findEnclosingMethod(document, position.line);
		if (!method) {
			return undefined;
		}
		const parenIdx = variableName.indexOf('(');
		const baseName = parenIdx >= 0 ? variableName.substring(0, parenIdx).trim() : variableName;
		return this.isDeclaredBetween(document, method.startLine, position.line, baseName) ? method.name : undefined;
	}

	/**
	 * Searches backwards from fromLine to find the nearest enclosing method-id.
	 * Returns the method start line and resolved name (alias preferred), or undefined if in program scope.
	 */
	private findEnclosingMethod(document: TextDocument, fromLine: number): { startLine: number; name: string } | undefined {
		const METHOD_NAME_GROUP = 1;
		const METHOD_ALIAS_GROUP = 2;
		const METHOD_ID_PATTERN = /\bmethod-id\s*\.\s*([a-zA-Z0-9_\-]+)(?:\s*\([^)]*\))?(?:\s+as\s+"([^"]+)")?/i;
		const END_METHOD_PATTERN = /\bend\s+method\b/i;
		for (let line = fromLine; line >= 0; line--) {
			const lineText = document.lineAt(line).text;
			if (END_METHOD_PATTERN.test(lineText) && line < fromLine) {
				return undefined;
			}
			const match = METHOD_ID_PATTERN.exec(lineText);
			if (match) {
				const name = match[METHOD_ALIAS_GROUP] !== undefined ? match[METHOD_ALIAS_GROUP] : match[METHOD_NAME_GROUP];
				return { startLine: line, name };
			}
		}
		return undefined;
	}

	/**
	 * Checks whether a variable declaration exists between startLine and endLine (inclusive).
	 * Recognizes level-number declarations, declare statements, and perform varying inline declarations.
	 */
	private isDeclaredBetween(document: TextDocument, startLine: number, endLine: number, variableName: string): boolean {
		const escaped = variableName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		const levelPattern = new RegExp(`^\\s*\\d+\\s+${escaped}[\\s,.]`, 'i');
		const declarePattern = new RegExp(`\\bdeclare\\s+${escaped}\\b`, 'i');
		const varyingPattern = new RegExp(`\\bvarying\\s+${escaped}\\s+as\\b`, 'i');
		for (let line = startLine; line <= endLine; line++) {
			const text = document.lineAt(line).text;
			if (levelPattern.test(text) || declarePattern.test(text) || varyingPattern.test(text)) {
				return true;
			}
		}
		return false;
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

