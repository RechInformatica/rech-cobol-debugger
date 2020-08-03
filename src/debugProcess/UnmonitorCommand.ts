import { DebugCommand } from "./DebugCommand";
import { ICommand } from "./DebugConfigs";
import { GenericDebugCommand } from "./GenericDebugCommand";

/**
 * Class to handle command to unmonitor (remove monitor from) a variable
 */
export class UnmonitorCommand implements DebugCommand<string, boolean> {

	constructor(private command: ICommand) { }

	buildCommand(variable: string): string {
		return this.command.name + " " + variable;
	}

	getExpectedRegExes(): RegExp[] {
		return new GenericDebugCommand(this.command).getExpectedRegExes();
	}

	validateOutput(output: string): boolean {
		return new GenericDebugCommand(this.command).validateOutput(output);
	}

}
