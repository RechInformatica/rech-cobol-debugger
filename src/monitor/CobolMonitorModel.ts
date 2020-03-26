import { CobolMonitor } from "./CobolMonitor";
import { debug } from "vscode";
import { CUSTOM_COMMAND_ADD_MONITOR, CUSTOM_COMMAND_REMOVE_MONITOR } from "../CobolDebug";
import Q from "q";

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
	 * Returns an array with every existing COBOL monitor
	 */
	public getAllCobolMonitors(): CobolMonitor[] {
		const monitorArray: CobolMonitor[] = [];
		this.allMonitors.forEach((monitor, _id) => {
			monitorArray.push(monitor);
		});
		return monitorArray;
	}

	/**
	 * Adds a new COBOL Monitor
	 */
	public addCobolMonitor(m: CobolMonitor): Promise<void> {
		return new Promise((resolve, reject) => {
			if (debug.activeDebugSession) {
				debug.activeDebugSession.customRequest(CUSTOM_COMMAND_ADD_MONITOR, m).then((success) => {
					if (success) {
						this.addMonitorOnMap(m);
						return resolve();
					} else {
						return reject();
					}
				});
			} else {
				// Simply adds the monitor on this model because the debugger is not running.
				// The user is probably adding monitors through UI before debugger has started
				this.addMonitorOnMap(m);
				return resolve();
			}
		});
	}

	/**
	 * Internal operation for adding COBOL monitor on model map
	 */
	private addMonitorOnMap(m: CobolMonitor): void {
		this.lastId++;
		this.allMonitors.set(this.lastId, m);
	}

	/**
	 * Removes all existing COBOL Monitors
	 */
	public removeAllCobolMonitors(): Promise<void> {
		return new Promise((resolve, reject) => {
			const monitorIds = this.getAllCobolMonitorIds();
			const monitorPromises: Promise<void>[] = [];
			monitorIds.forEach(id => monitorPromises.push(this.removeCobolMonitor(id)));
			Q.allSettled(monitorPromises).then((results) => {
				const anyRejection = results.some(r => r.state == "rejected");
				if (anyRejection) {
					return reject();
				}
				return resolve();
			}).catch(() => {
				return reject();
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
				if (debug.activeDebugSession) {
					debug.activeDebugSession.customRequest(CUSTOM_COMMAND_REMOVE_MONITOR, monitor.variable).then((success) => {
						if (success) {
							this.allMonitors.delete(id);
							return resolve();
						} else {
							return reject();
						}
					});
				} else {
					// Simply removes the monitor from this model because the debugger is not running.
					// The user is probably removing monitors from UI before debugger has started
					this.allMonitors.delete(id);
					return resolve();
				}
			} else {
				return reject();
			}
		});
	}

}