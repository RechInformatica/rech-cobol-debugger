
/** isCobol parameter to retrieve variable value in hexadecimal */
const HEX_DISPLAY_PARAMETER = "-x";
/** isCobol parameter to retrieve variable value with child in tree list */
const TREE_DISPLAY_PARAMETER = "-tree";

/**
 * Parser of isCobol display commands
 */
export class DisplayCommandParser {

	/**
	 * Parses the command-line arguments returning an isCobolDisplayArguments instance
	 *
	 * @param displayArguments isCobol display arguments to be parsed
	 */
	public parseArguments(displayArguments: string): isCobolDisplayArguments {
		const extraArguments: string[] = [];
		if (displayArguments.includes(HEX_DISPLAY_PARAMETER + " ")) {
			extraArguments.push(HEX_DISPLAY_PARAMETER);
		}
		if (displayArguments.includes(TREE_DISPLAY_PARAMETER + " ")) {
			extraArguments.push(TREE_DISPLAY_PARAMETER);
		}
		const variableName = this.extractVariableNameFromArguments(displayArguments, extraArguments);
		return {
			extraArguments: extraArguments,
			variableName: variableName
		};
	}

	/**
	 * Extracts only the variable name from display command arguments
	 *
	 * @param displayArguments full 'display' command arguments
	 * @param extraArguments extra arguments besides variable name
	 */
	private extractVariableNameFromArguments(displayArguments: string, extraArguments: string[]): string {
		let variableName: string = displayArguments;
		extraArguments.forEach(argument => {
			variableName = variableName.replace(argument + " ", "");
		});
		return variableName;
	}

}

/**
 * isCobol 'display' command parameters
 */
export interface isCobolDisplayArguments {
	/** Command-line extra arguments to change default COBOl 'display' behavior */
	extraArguments: string[]
	/** Variable name to retrieve the value */
	variableName: string;
}
