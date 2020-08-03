import { DebugCommand } from "./DebugCommand";
import { Variable } from "./Variable";
import { CommandUtils } from "./CommandUtils";
import { ICommand } from "./DebugConfigs";
import { GenericDebugCommand } from "./GenericDebugCommand";

/**
 * Class to handle command responsible for changing variable value
 */
export class ChangeVariableValueCommand implements DebugCommand<Variable, boolean> {

	constructor(private command: ICommand) { }

	buildCommand(v: Variable): string {
		return this.command.name + " " + v.name + "=" + v.value;
	}

	getExpectedRegExes(): RegExp[] {
		return new GenericDebugCommand(this.command).getExpectedRegExes();
	}

	validateOutput(output: string): boolean {
		return new GenericDebugCommand(this.command).validateOutput(output);
	}

}
