import { DebugCommand } from "./DebugCommand";
import { CobolMonitor } from "../monitor/CobolMonitor";
import { CommandUtils } from "./CommandUtils";

/**
 * Class to handle monitor command
 */
export class MonitorCommand implements DebugCommand<CobolMonitor, boolean> {

	buildCommand(m: CobolMonitor): string {
		return "monitor -e " + m.variable + " when " + m.condition;
	}

	getExpectedRegExes(): RegExp[] {
		const possibleOutputResults: RegExp[] = [];
		possibleOutputResults.push(this.createAddMonitorRegex());
		possibleOutputResults.push(CommandUtils.createVariableNotFoundRegex());
		possibleOutputResults.push(CommandUtils.createSyntaxErrorRegex());
		possibleOutputResults.push(/unexpected\s+error\s+usage/i);
		return possibleOutputResults;
	}

	validateOutput(output: string): boolean {
		return this.createAddMonitorRegex().test(output);
	}

	/**
	 * Creates a regular expression indicating that the monitor has been successfully added
	 */
	private createAddMonitorRegex(): RegExp {
		return /add\s+monitor\s+on\s+/i;
	}

}