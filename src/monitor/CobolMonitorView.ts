import { CobolMonitorController } from "./CobolMonitorController";
import { TreeDataProvider, TreeItem, EventEmitter, Event, ProviderResult, window, Range } from "vscode";
import { CobolMonitor } from "./CobolMonitor";

const CONDITION_ALWAYS = 'always';

export class CobolMonitorView implements TreeDataProvider<number> {

	/** Helper objects to refresh UI when a new monitor is added */
	private _onDidChangeTreeData: EventEmitter<number | undefined> = new EventEmitter<number | undefined>();
	readonly onDidChangeTreeData: Event<number | undefined> = this._onDidChangeTreeData.event;

	/** Controller for COBOL monitor actions */
	private controller: CobolMonitorController;

	constructor(controller: CobolMonitorController) {
		this.controller = controller;
		window.registerTreeDataProvider('cobolMonitorView', this);
	}

	/**
	 * Asks user for a new COBOL monitor
	 */
	public async askUserForMonitor(): Promise<CobolMonitor | undefined> {
		const currentSelectedVariable = this.getSelectedVariable();
		const variableName = await window.showInputBox({
			placeHolder: 'Variable name',
			prompt: 'Please specify the variable name to be monitored.',
			ignoreFocusOut: true,
			value: currentSelectedVariable
		});
		if (!variableName) {
			return undefined;
		}
		const condition = await this.askUserForCondition();
		if (!condition) {
			return undefined;
		}
		return {
			variable: variableName,
			condition: condition
		};
	}

	/**
	 * Returns the selected variable to prefill user input
	 */
	private getSelectedVariable(): string {
		const editor = window.activeTextEditor;
		if (editor) {
			let range = this.getSelectionRange();
			if (!range) {
				range = editor.document.getWordRangeAtPosition(editor.selection.start, /([a-zA-Z0-9\-])+/g);
			}
			if (range) {
				return editor.document.getText(range);
			}
		}
		return "";
	}

	/**
	 * Returns the range selected by user on editor
	 */
	private getSelectionRange(): Range | undefined {
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
	 * Asks user for monitor condition
	 */
	private async askUserForCondition(): Promise<string | undefined> {
		const condition = await window.showQuickPick([CONDITION_ALWAYS, '=', '!=', '<', '>', '<=', '>='], {
			placeHolder: 'Condition to stop debugger',
			ignoreFocusOut: true
		});
		if (!condition) {
			return undefined;
		}
		if (condition !== CONDITION_ALWAYS) {
			const contentForComparison = await window.showInputBox({
				placeHolder: 'Content for comparison',
				prompt: 'Please specify the content for comparison which will make debugger stops.',
				ignoreFocusOut: true
			});
			if (!contentForComparison) {
				return undefined;
			}
			return condition + " " + contentForComparison;
		}
		return condition;
	}

	/**
	 * Shows detailed warning message
	 */
	public showDetailedMessage(detail: string): void {
		window.showWarningMessage(detail);
	}

	/**
	 * Shows message for unexpected error on the specified operation
	 */
	public showUnexpectedErrorMessage(operation: string): void {
		window.showWarningMessage(`'${operation}' operation canceled by unexpected error`);
	}

	/**
	 * Shows message for operation canceled by user
	 */
	public showCanceledByUserMessage(operation: string): void {
		window.showWarningMessage(`'${operation}' operation canceled by user`);
	}

	/**
	 * Refreshes the UI reflecting changes on current monitor Map
	 */
	public refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	/**
	 * Builds and returns a human-readable string representing the specified COBOL Monitor.
	 *
	 * @param m monitor to have the label built
	 */
	private buildLabel(m: CobolMonitor): string {
		const label = `${m!.variable} [${m.source}] when ${m!.condition}`;
		return label;
	}

	//------- interface methods

	getTreeItem(id: number): TreeItem | Thenable<TreeItem> {
		const currentMonitor = this.controller.getCobolMonitor(id);
		return {
			label: this.buildLabel(currentMonitor!)
		};
	}

	getChildren(): ProviderResult<number[]> {
		return new Promise((resolve, _reject) => {
			const idArray = this.controller.getAllCobolMonitorIds();
			resolve(idArray);
		});
	}

}