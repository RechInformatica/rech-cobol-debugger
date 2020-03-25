import { CobolMonitorController } from "./CobolMonitorController";
import { TreeDataProvider, TreeItem, EventEmitter, Event, ProviderResult, window } from "vscode";
import { CobolMonitor } from "./CobolMonitor";

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
		const variableName = await window.showInputBox({
			placeHolder: 'Variable name',
			prompt: 'Please specify the variable name to be monitored.',
			ignoreFocusOut: true
		});
		if (!variableName) {
			return undefined;
		}
		const condition = await window.showQuickPick(['always', '=', '!=', '<', '>', '<=', '>='], {
			placeHolder: 'Condition to stop debugger',
			ignoreFocusOut: true
		});
		if (!condition) {
			return undefined;
		}
		return {
			variable: variableName,
			condition: condition
		};
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
		const label = `${m!.variable} when ${m!.condition}`;
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