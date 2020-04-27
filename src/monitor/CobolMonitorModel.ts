import { CobolStack } from '../CobolStack';
import { CobolMonitor } from "./CobolMonitor";
import { debug } from "vscode";
import { CUSTOM_COMMAND_ADD_MONITOR, CUSTOM_COMMAND_REMOVE_MONITOR, CUSTOM_COMMAND_REMOVE_ALL_MONITORS } from "../CobolDebug";
import * as path from "path";
import Q from "q";

export class CobolMonitorModel {

	/** Instance representing the stack of current COBOL program */
	private cobolStack: CobolStack;
	/** Monitors for COBOL debug */
	private allMonitors: Map<number, CobolMonitor>;
	/** Last incremental ID for monitors */
	private lastId: number;

	constructor(cobolStack: CobolStack) {
		this.cobolStack = cobolStack;
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
			m.source = this.findTopStackProgram();
			if (this.alreadyExists(m)) {
				return resolve();
			}
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
	 * Returns true whether the specified monitor already exists on Model
	 */
	private alreadyExists(m: CobolMonitor): boolean {
		let exists: boolean = false;
		this.allMonitors.forEach((monitor, _id) => {
			if (!this.areValuesEqual(monitor.condition, m.condition)) {
				return;
			}
			if (!this.areValuesEqual(monitor.variable, m.variable)) {
				return;
			}
			if (!this.areValuesEqual(monitor.source, m.source)) {
				return;
			}
			exists = true;
		});
		return exists;
	}

	/**
	 * Returns true whether the two values are equal
	 */
	private areValuesEqual(first?: string, second?: string): boolean {
		return this.normalizeValue(first) === this.normalizeValue(second);
	}

	/**
	 * Normalizes the specified value for equality check
	 */
	private normalizeValue(value?: string): string {
		const result: string = value ? value.toLowerCase().toString() : "";
		return result;
	}

	/**
	 * Finds the name of the program which is currently on top of stack.
	 * The monitor is always added on the program which is on top of stack.
	 */
	private findTopStackProgram(): string {
		const nameWithoutExtension = path.parse(this.cobolStack.currentSourceName).name;
		return nameWithoutExtension;
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
			// When there is no monitor to be removed
			if (this.allMonitors.size == 0) {
				return resolve();
			}
			if (debug.activeDebugSession) {
				debug.activeDebugSession.customRequest(CUSTOM_COMMAND_REMOVE_ALL_MONITORS).then((success) => {
					if (success) {
						this.allMonitors.clear();
						return resolve();
					} else {
						return reject();
					}
				});
			} else {
				// Simply removes the monitor from this model because the debugger is not running.
				// The user is probably removing monitors from UI before debugger has started
				this.allMonitors.clear();
				return resolve();
			}
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
					// External debugging process only allows to remove
					// monitors on program on top of stack
					const source = this.findTopStackProgram();
					if (source !== monitor.source) {
						return reject('Impossible to remove monitor from ' + monitor.source + ' when this program is not on top of stack.');
					}
					debug.activeDebugSession.customRequest(CUSTOM_COMMAND_REMOVE_MONITOR, monitor.variable).then((success) => {
						if (success) {
							this.allMonitors.delete(id);
							return resolve();
						} else {
							return reject('');
						}
					});
				} else {
					// Simply removes the monitor from this model because the debugger is not running.
					// The user is probably removing monitors from UI before debugger has started
					this.allMonitors.delete(id);
					return resolve();
				}
			} else {
				return reject('');
			}
		});
	}

}
