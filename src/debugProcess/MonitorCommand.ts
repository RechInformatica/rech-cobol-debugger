import { DebugCommand } from "./DebugCommand";
import { CobolMonitor } from "../monitor/CobolMonitor";
import { ICommand } from "./DebugConfigs";
import { GenericDebugCommand } from "./GenericDebugCommand";

/**
 * Class to handle monitor command
 */
export class MonitorCommand implements DebugCommand<CobolMonitor, boolean> {

	constructor(private command: ICommand) { }

	buildCommand(m: CobolMonitor): string {
		return this.command.name + " -e " + m.variable + " when " + m.condition;
	}

	getExpectedRegExes(): RegExp[] {
		return new GenericDebugCommand(this.command).getExpectedRegExes();
	}

	validateOutput(output: string): boolean {
		return new GenericDebugCommand(this.command).validateOutput(output);
	}

}
