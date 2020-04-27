/**
 * Class representing the stack of current COBOL program
 */
export class CobolStack {

	/** Name of the current file/source code */
	private _currentSourceName: string = "";
	/** Current line number within buffer source */
	private _currentLineNumber: number = 0;

	get currentSourceName(): string {
		return this._currentSourceName;
	}
	set currentSourceName(value: string) {
		this._currentSourceName = value;
	}
	get currentLineNumber(): number {
		return this._currentLineNumber;
	}
	set currentLineNumber(value: number) {
		this._currentLineNumber = value;
	}
}