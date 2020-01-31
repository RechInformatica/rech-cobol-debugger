import { DebugProtocol } from 'vscode-debugprotocol';
import { DebugInterface } from "../debugProcess/DebugInterface";
import { window } from 'vscode';
import Q from 'q';

/** Position within String where colon is located */
const WINDOWS_COLON_DRIVE_POSITION = 2;

/**
 * Class to manage source breakpoints
 */
export class BreakpointManager {

	/** Array of Cobol breakpoints */
	private breakpoints : DebugProtocol.Breakpoint[] = [];
	/** Debugger runtime which will receive commands */
	private debugRuntime: DebugInterface;

	/**
	 * Creates a breakpoint manager
	 *
	 * @param debugRuntime debugger runtime which will receive commands
	 */
	constructor(debugRuntime: DebugInterface) {
		this.debugRuntime = debugRuntime;
	}

	/*
	 * Set the specified breakpoints
	 */
    public setBreakpoints(source: DebugProtocol.Source, updatedBreakpoints?: DebugProtocol.SourceBreakpoint[]): Promise<DebugProtocol.Breakpoint[]> {
		return new Promise((resolve, reject) => {
			updatedBreakpoints = updatedBreakpoints ? updatedBreakpoints : [];
			this.normalizeSource(source);
			const knownBreakpoints = this.getBreakpointsFromSource(source);
			const breakpointsInSource = this.convertSourceBreakpointIntoBreakpoint(source, updatedBreakpoints);
			const newBreakpoints = this.extractNewBreakpoints(breakpointsInSource, knownBreakpoints);
			const oldBreakpoints = this.extractOldBreakpoints(breakpointsInSource, knownBreakpoints);
			this.addNewBreakpointsOnExternalDebugger(newBreakpoints).then(() => {
				this.removeOldBreakpointsOnExternalDebugger(oldBreakpoints).then(() => {
					resolve(knownBreakpoints);
				}).catch((error) => {
					reject(error);
				})
			}).catch((error) => {
				reject(error)
			});
		});
	}

	/**
	 * Normalizes the specified source
	 *
	 * @param source source to be normalized
	 */
	private normalizeSource(source: DebugProtocol.Source): void {
		source.name = this.normalizeFileSystemLocation(source.name);
		source.path = this.normalizeFileSystemLocation(source.path);
	}

	/**
	 * Normalizes the specified file system location
	 *
	 * @param location location to be normalized
	 */
	private normalizeFileSystemLocation(location: string | undefined): string {
		let normalized = location ? location : "";
		// Sometimes VSCode API returns, in the same path, slashes and backslashes
		normalized = normalized.replace(/\\/g, "/");
		// Sometimes VSCode API returns Windows drive letter with uppercase and sometimes with lowercase
		if (normalized.length > WINDOWS_COLON_DRIVE_POSITION && normalized[WINDOWS_COLON_DRIVE_POSITION - 1] == ":") {
			normalized = normalized[0].toUpperCase() + normalized.slice(1);
		}
		return normalized;
	}

	/**
	 * Extracts new breakpoints to be added to external debugger
	 *
	 * @param breakpoints all breakpoints
	 * @param reference current reference breakpoints
	 */
	private extractNewBreakpoints(breakpoints: DebugProtocol.Breakpoint[], reference: DebugProtocol.Breakpoint[]) {
		const newBreakpoints: DebugProtocol.Breakpoint[] = [];
		breakpoints.forEach(current => {
			if (!this.isKnownBreakpoint(current, reference)) {
				newBreakpoints.push(current);
			}
		});
		return newBreakpoints;
	}

	/**
	 * Extracts old breakpoints to be removed from external debugger
	 *
	 * @param breakpoints all breakpoints
	 * @param reference current reference breakpoints
	 */
	private extractOldBreakpoints(breakpoint: DebugProtocol.Breakpoint[], reference: DebugProtocol.Breakpoint[]) {
		const oldBreakpoints: DebugProtocol.Breakpoint[] = [];
		reference.forEach(current => {
			if (!this.isKnownBreakpoint(current, breakpoint)) {
				oldBreakpoints.push(current);
			}
		});
		return oldBreakpoints;
	}

	/**
	 * Checks if the specified breakpoit is already known
	 *
	 * @param breakpoint breakpoint to test
	 * @param reference list of all breakpoint references in source
	 */
	private isKnownBreakpoint(breakpoint: DebugProtocol.Breakpoint, reference: DebugProtocol.Breakpoint[]) {
		for (let i = 0; i < reference.length; i++) {
			const current = reference[i];
			if (!this.isSourceEqual(current.source, breakpoint.source)) continue;
			if (current.line != breakpoint.line) continue;
			return true;
		}
		return false;
	}

	/**
	 * Returns an array of breakpoints related to the specified source
	 *
	 * @param source source to filter breakpoints
	 */
	private getBreakpointsFromSource(source: DebugProtocol.Source): DebugProtocol.Breakpoint[] {
		const result: DebugProtocol.Breakpoint[] = [];
		let sourcePath = source.path ? source.path : source.name;
		sourcePath = sourcePath ? sourcePath : "";
		this.breakpoints.forEach(current => {
			if (this.isSourceEqual(current.source, source)) {
				result.push(current);
			}
		});
		return result;
	}

	/**
	 * Checks if the specified sources are equal
	 *
	 * @param origin origin source
	 * @param target target source
	 */
	private isSourceEqual(origin: DebugProtocol.Source | undefined, target: DebugProtocol.Source | undefined): boolean {
		if (!origin && target) return false;
		if (!origin && !target) return true;
		let targetPath: string = "";
		targetPath = target!.path ? target!.path : target!.name!;
		targetPath = targetPath ? targetPath : "";
		if (origin) {
			let originSourcePath = origin.path ? origin.path : origin.name;
			originSourcePath = originSourcePath ? originSourcePath : "";
			if (targetPath == originSourcePath) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Adds new breakpoints on external debugger
	 *
	 * @param newBreakpoints new breakpoints
	 */
	private addNewBreakpointsOnExternalDebugger(newBreakpoints: DebugProtocol.Breakpoint[]): Promise<void> {
		return new Promise((resolve, reject) => {
			const newBreakpointsPromises = this.createNewBreakpointsPromises(newBreakpoints);
			Q.allSettled(newBreakpointsPromises).then(() => {
				return resolve();
			}).catch(() => {
				return reject();
			})
		});
	}

	/**
	 * Creates an array related to the new breakpoints which will be inserted on source code
	 *
	 * @param breakpoints all breakpoints within source
	 */
	private createNewBreakpointsPromises(breakpoints: DebugProtocol.Breakpoint[]): Promise<void>[] {
		const newBreakpointsPromises: Promise<void>[] = []
		breakpoints.forEach((breakpoint) => {
			newBreakpointsPromises.push(this.addBreakpointOnExternalDebugger(breakpoint));
		});
		return newBreakpointsPromises;
	}

	/**
	 * Removes old breakpoints on external debugger
	 *
	 * @param oldBreakpoints old breakpoints to be removed
	 */
	private removeOldBreakpointsOnExternalDebugger(oldBreakpoints: DebugProtocol.Breakpoint[]) {
		return new Promise((resolve, reject) => {
			const newBreakpointsPromises = this.createRemoveBreakpointsPromises(oldBreakpoints);
			Q.allSettled(newBreakpointsPromises).then(() => {
				return resolve();
			}).catch(() => {
				return reject();
			})
		});
	}

	/**
	 * Creates an array related to the new breakpoints which will be inserted on source code
	 *
	 * @param oldBreakpoints all breakpoints within source
	 */
	private createRemoveBreakpointsPromises(oldBreakpoints: DebugProtocol.Breakpoint[]): Promise<void>[] {
		const oldBreakpointsPromises: Promise<void>[] = []
		oldBreakpoints.forEach((breakpoint) => {
			oldBreakpointsPromises.push(this.removeBreakpointOnExternalDebugger(breakpoint));
		});
		return oldBreakpointsPromises;
	}

	/**
	 * Converts a SourceBreakpoint array into a Breakpoint array
	 *
	 * @param source source where
	 * @param sourceBreakpoints source breakpoints
	 */
	private convertSourceBreakpointIntoBreakpoint(source: DebugProtocol.Source, sourceBreakpoints: DebugProtocol.SourceBreakpoint[]): DebugProtocol.Breakpoint[] {
		const breakpoints: DebugProtocol.Breakpoint[] = [];
		sourceBreakpoints.forEach((current) => {
			breakpoints.push({
				line: current.line,
				source: source,
				verified: false
			});
		});
		return breakpoints;
	}

	/**
	 * Adds a breakpoint on the external debugger
	 *
	 * @param path path of source code where breakpoint will be added
	 * @param breakpoint breakpoint to be added
	 */
	private addBreakpointOnExternalDebugger(breakpoint: DebugProtocol.Breakpoint): Promise<void> {
		return new Promise((resolve, reject) => {
			if (!breakpoint.line || !breakpoint.source || !breakpoint.source.name) {
				return reject();
			}
			this.debugRuntime.addBreakpoint({
				line: breakpoint.line,
				source: breakpoint.source.name
			}).then((result) => {
				if (result) {
					breakpoint.verified = true;
					this.breakpoints.push(breakpoint);
				} else {
					window.showInformationMessage("Impossible to set breakpoint on this location");
				}
				return resolve();
			}).catch((error) => {
				console.log(error);
				return reject(error);
			});
		});
	}

	/**
	 * Removes a breakpoint on the external debugger
	 *
	 * @param path path of source code where breakpoint will be removed
	 * @param breakpoint breakpoint to be removed
	 */
	private removeBreakpointOnExternalDebugger(breakpoint: DebugProtocol.Breakpoint): Promise<void> {
		return new Promise((resolve, reject) => {
			if (!breakpoint.line || !breakpoint.source || !breakpoint.source.name) {
				return reject();
			}
			this.debugRuntime.removeBreakpoint({
				line: breakpoint.line,
				source: breakpoint.source.name
			}).then(() => {
				this.breakpoints.splice(this.breakpoints.indexOf(breakpoint), 1);
				return resolve();
			}).catch((error) => {
				console.log(error);
				return reject(error);
			});
		});
	}

}