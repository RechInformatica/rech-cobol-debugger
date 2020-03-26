import { DebugCommand } from "./DebugCommand";
import { Variable } from "./Variable";
import { CommandUtils } from "./CommandUtils";

/**
 * Class to handle command responsible for changing variable value
 */
export class ChangeVariableValueCommand implements DebugCommand<Variable, boolean> {

	/** Current variable being handled */
	private variable: Variable | undefined;

	buildCommand(v: Variable): string {
		this.variable = v;
		return "let " + v.name + "=" + v.value;
	}

	getExpectedRegExes(): RegExp[] {
		const regexes: RegExp[] = [];
		regexes.push(this.createNewVariableValueRegex(this.variable!.name));
		regexes.push(CommandUtils.createNotVariableOutputRegex());
		regexes.push(new RegExp(`data-item\\s+not\\s+found\\s+\\'${this.variable}\\'`, "i"));
		regexes.push(/boolean\s+value\s+required\s+\(true\|false\)/i);
		return regexes;
	}

	validateOutput(output: string): boolean {
		return this.createNewVariableValueRegex(this.variable!.name).test(output);
	}

	/**
	 * Crates a regular expression to detect output indicating that value has been correctly changed
	 */
	private createNewVariableValueRegex(name: string): RegExp {
		return new RegExp(`new\\s+value\\s+of\\s+${name}\\s+is\\s+`, "i");
	}

}