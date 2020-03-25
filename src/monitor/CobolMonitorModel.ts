import { CobolMonitor } from "./CobolMonitor";
import { debug } from "vscode";
import { CUSTOM_COMMAND_ADD_MONITOR, CUSTOM_COMMAND_REMOVE_MONITOR } from "../CobolDebug";

export class CobolMonitorModel {

	/** Monitors for COBOL debug */
	private allMonitors: Map<number, CobolMonitor>;
	/** Last incremental ID for monitors */
	private lastId: number;

	constructor() {
		this.allMonitors = new Map<number, CobolMonitor>();
		this.lastId = 0;
	}

	/**
	 * Returns the CobolMonitor instance with the specified ID
	 */
	public getCobolMonitor(id: number): CobolMonitor | undefined {
		return this.allMonitors.get(id);
	}

	/**
	 * Returns every ID already in use by COBOL monitors
	 */
	public getAllCobolMonitorIds(): number[] {
		const idArray: number[] = [];
		this.allMonitors.forEach((_monitor, id) => {
			idArray.push(id);
		});
		return idArray;
	}

	/**
	 * Adds a new COBOL Monitor
	 */
	public addCobolMonitor(m: CobolMonitor): Promise<void> {
		return new Promise((resolve, reject) => {
			debug.activeDebugSession!.customRequest(CUSTOM_COMMAND_ADD_MONITOR, m).then((success) => {
				if (success) {
					this.lastId++;
					this.allMonitors.set(this.lastId, m);
					return resolve();
				} else {
					return reject();
				}
			});
		});

	}

	/**
	 * Removes an existing COBOL Monitor with the specified ID
	 */
	public removeCobolMonitor(id: number): Promise<void> {
		return new Promise((resolve, reject) => {
			const monitor = this.getCobolMonitor(id);
			if (monitor) {
				debug.activeDebugSession!.customRequest(CUSTOM_COMMAND_REMOVE_MONITOR, monitor.variable).then((success) => {
					if (success) {
						this.allMonitors.delete(id);
						return resolve();
					} else {
						return reject();
					}
				});
			} else {
				return reject();
			}
		});
	}

}