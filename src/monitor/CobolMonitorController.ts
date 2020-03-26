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
	 * Returns an array with every existing COBOL monitor
	 */
	public getAllCobolMonitors(): CobolMonitor[] {
		return this.model.getAllCobolMonitors();
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

	/**
	 * Removes all existing COBOL Monitors
	 */
	public removeAllCobolMonitors(): void {
		this.model.removeAllCobolMonitors()
			.then(() => this.view.refresh())
			.catch(() => {
				// Updates the view even if a problem has happened, because maybe some monitors
				// could be removed and just others couldn't
				this.view.refresh()
				this.view.showUnexpectedErrorMessage('Remove all monitors');
			});
	}

}
