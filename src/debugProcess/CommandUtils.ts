/**
 * Class with utility methods used for different commands
 */
export class CommandUtils {

	/**
	 * Add quotes to source name if needed
	 *
	 * @param source source to add quotes
	 */
	public static addQuotesIfNeeded(source: string): string {
		if (source.length === 0) {
			return "";
		}
		return `\"${source}\"`;
	}


	/**
	 * Creates a Regular Expression to detect COBOL debugger output, indicating that the specified word is not
	 * a Cobol variable
	 */
	public static createNotVariableOutputRegex(): RegExp {
		return new RegExp(`not\\s+a\\s+Cobol\\s+variable\\s+`, "i");
	}


	/**
	 * Creates a regular expression to parse debugger output and check if variable exists or not
	 */
	public static createVariableNotFoundRegex(): RegExp {
		return /data-item\s+not\s+found\s+/i;
	}

	/**
	 * Creates and returns a regular expression indicating syntax error
	 */
	public static createSyntaxErrorRegex(): RegExp {
		return /syntax\s+error/i;
	}

}