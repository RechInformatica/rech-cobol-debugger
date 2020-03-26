import { DebugCommand } from "./DebugCommand";

/**
 * Class to handle command to unmonitor (remove monitor from) a variable
 */
export class UnmonitorCommand implements DebugCommand<string, boolean> {

	buildCommand(variable: string): string {
		return "unmonitor " + variable;
	}

	getExpectedRegExes(): RegExp[] {
		const regexes: RegExp[] = [];
		regexes.push(this.createClearMonitorRegex());
		regexes.push(/not\s+found\s+monitor\s+/i);
		regexes.push(/unexpected\s+error\s+usage/i);
		return regexes;
	}

	validateOutput(output: string): boolean {
		return this.createClearMonitorRegex().test(output);
	}

	/**
	 * Creates a RegEx to parse 'clear monitor' output indicating that the monitor
	 * has been successfully removed.
	 */
	private createClearMonitorRegex(): RegExp {
		return /clear\s+monitor\s+on/i;
	}

}