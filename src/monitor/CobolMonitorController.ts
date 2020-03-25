import { CobolMonitorModel } from "./CobolMonitorModel";
import { CobolMonitorView } from "./CobolMonitorView";
import { CobolMonitor } from "./CobolMonitor";

/**
 * Controller for managing COBOL monitors
 */
export class CobolMonitorController {

	/** Model for COBOL monitors */
	private model: CobolMonitorModel;
	/** View for COBOL monitors */
	private view: CobolMonitorView

	constructor() {
		this.model = new CobolMonitorModel();
		this.view = new CobolMonitorView(this);
	}

	/**
	 * Returns the CobolMonitor instance with the specified ID
	 */
	public getCobolMonitor(id: number): CobolMonitor | undefined {
		return this.model.getCobolMonitor(id);
	}

	/**
	 * Returns every ID already in use by COBOL monitors
	 */
	public getAllCobolMonitorIds(): number[] {
		return this.model.getAllCobolMonitorIds();
	}

	/**
	 * Adds a new COBOL Monitor
	 */
	public async addCobolMonitor(): Promise<void> {
		const monitor = await this.view.askUserForMonitor();
		if (monitor) {
			this.model.addCobolMonitor(monitor)
				.then(() => this.view.refresh())
				.catch(() => this.view.showUnexpectedErrorMessage('Add monitor'));
		} else {
			this.view.showCanceledByUserMessage('Add monitor');
		}
	}

	/**
	 * Removes an existing COBOL Monitor with the specified ID
	 */
	public removeCobolMonitor(id: number): void {
		this.model.removeCobolMonitor(id)
			.then(() => this.view.refresh())
			.catch(() => this.view.showUnexpectedErrorMessage('Remove monitor'));
	}

}
