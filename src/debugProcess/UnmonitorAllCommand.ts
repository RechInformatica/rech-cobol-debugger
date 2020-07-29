import { DebugCommand } from "./DebugCommand";
import { ICommand } from "./DebugConfigs";
import { GenericDebugCommand } from "./GenericDebugCommand";

/**
 * Class to handle command to unmonitor (remove monitor from) every existing monitors
 */
export class UnmonitorAllCommand implements DebugCommand<void, boolean> {

	constructor(private command: ICommand) {}

	buildCommand(): string {
		return this.command.name;
	}

	getExpectedRegExes(): RegExp[] {
		return new GenericDebugCommand(this.command).getExpectedRegExes();
	}

	validateOutput(output: string): boolean {
		return new GenericDebugCommand(this.command).validateOutput(output);
	}

}
