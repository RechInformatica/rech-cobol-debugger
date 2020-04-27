import { DebugCommand } from "./DebugCommand";

/**
 * Class to handle command to unmonitor (remove monitor from) every existing monitors
 */
export class UnmonitorAllCommand implements DebugCommand<void, boolean> {

	buildCommand(): string {
		return "unmonitor -a";
	}

	getExpectedRegExes(): RegExp[] {
		const regexes: RegExp[] = [];
		regexes.push(this.createClearAllMonitorsRegex());
		regexes.push(/unexpected\s+error\s+usage/i);
		return regexes;
	}

	validateOutput(output: string): boolean {
		return this.createClearAllMonitorsRegex().test(output);
	}

	/**
	 * Creates a RegEx to parse 'clear all monitors' output indicating that all monitors
	 * have been successfully removed.
	 */
	private createClearAllMonitorsRegex(): RegExp {
		return /clear\s+all\s+monitors/i;
	}

}