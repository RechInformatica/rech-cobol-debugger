import { DebugCommand } from "./DebugCommand";
import { Variable } from "./Variable";
import { CommandUtils } from "./CommandUtils";

/**
 * Class to handle command responsible for changing variable value
 */
export class ChangeVariableValueCommand implements DebugCommand<Variable, boolean> {

	buildCommand(v: Variable): string {
		return "let " + v.name + "=" + v.value;
	}

	getExpectedRegExes(): RegExp[] {
		const regexes: RegExp[] = [];
		regexes.push(this.createNewVariableValueRegex());
		regexes.push(CommandUtils.createNotVariableOutputRegex());
		regexes.push(new RegExp(`data-item\\s+not\\s+found\\s+`, "i"));
		regexes.push(/boolean\s+value\s+required\s+\(true\|false\)/i);
		return regexes;
	}

	validateOutput(output: string): boolean {
		return this.createNewVariableValueRegex().test(output);
	}

	/**
	 * Crates a regular expression to detect output indicating that value has been correctly changed
	 */
	private createNewVariableValueRegex(): RegExp {
		return new RegExp(`new\\s+value\\s+of\\s+`, "i");
	}

}