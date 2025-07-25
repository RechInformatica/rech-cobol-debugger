import { DebugProtocol } from '@vscode/debugprotocol';
import { DebugInterface } from '../debugProcess/DebugInterface';
import Q from "q";

/** Array of COBOL Reserved words */
const COBOL_RESERVED_WORDS = ["perform", "move", "to", "set", "add", "subtract", "call", "inquire", "modify", "invoke", "if", "not", "end-if", "until", "varying", "evaluate", "true", "when", "false", "go", "thru", "zeros", "spaces", "zero", "space", "inspect", "tallying", "exit", "paragraph", "method", "cycle", "from", "by", "and", "or", "of", "length", "function", "program", "synchronized", "end-synchronized", "string", "end-string", "on", "reference", "value", "returning", "giving", "replacing", "goback", "all", "open", "i-o", "input", "output", "close", "compute", "unstring", "using", "delete", "start", "read", "write", "rewrite", "with", "lock", "else", "upper-case", "lower-case", "display", "accept", "at", "clear-screen", "initialize", "line", "col", "key", "is", "self", "null", "stop", "run", "upon", "environment-name", "environment-value"]

/**
 * Class to parse Variable output from COBOL command-line debugger process
 */
export class VariableParser {

	/** Debugger runtime which will receive commands */
	private debugRuntime: DebugInterface;

	/**
	 * Creates a variable parser
	 *
	 * @param debugRuntime debugger runtime which will receive commands
	 */
	constructor(debugRuntime: DebugInterface) {
		this.debugRuntime = debugRuntime;
	}

	/**
	 * Parses the debugger output related to line information
	 *
	 * @param output debugger output which will have line information parsed
	 */
	public parse(output: string): Promise<DebugProtocol.Variable[]> {
		return new Promise((resolve, reject) => {
			const variables: DebugProtocol.Variable[] = [];
			const variableNames = this.extractNamesFromOutput(output);
			const variablesPromises: Promise<DebugProtocol.Variable>[] = [];
			variableNames.forEach(name => {
				variablesPromises.push(this.captureVariableInfo(name));
			});
			Q.allSettled(variablesPromises).then((results) => {
				results.forEach((result) => {
					if (result.state == "fulfilled") {
						variables.push(result.value!);
					}
				});
				return resolve(variables);
			}).catch(() => {
				return reject();
			});
		});
	}

	/**
	 * Parses the debugger output and extract variable names from current command
	 *
	 * @param output debugger output
	 */
	private extractNamesFromOutput(output: string): string[] {
		const names: string[] = [];
		const parts = output.substring(output.indexOf("line=")).split("\n");
		for (let i = 1; i < parts.length; i++) {
			const currentLine = this.removeLanguageTokensFromLine(parts[i]);
			const regex = /\b[a-zA-Z0-9ÇéâäàçêëèïîÄôöòûùÖÜáíóúñÑÁÂÀãÃÊËÈÍÎÏÌÓÔÒõÕÚÛÙüÉì_\-]+/g;
			const tokens: string[] = [];
			let match: RegExpExecArray | null;

			while ((match = regex.exec(currentLine)) !== null) {
				let token = match[0];
				const startIndex = match.index;
				const endIndex = startIndex + token.length;
				if (currentLine[endIndex] === '(') {
					const nextCloseParen = currentLine.indexOf(')', endIndex + 1);
					if (nextCloseParen !== -1) {
						const contentInside = currentLine.substring(endIndex + 1, nextCloseParen);
						if (!contentInside.includes('(') && !contentInside.includes(')')) {
							token = currentLine.substring(startIndex, nextCloseParen + 1);
							regex.lastIndex = nextCloseParen + 1;
						}
					}
				}

				tokens.push(token);
			}

			for (const token of tokens) {
				let textWord = token;
				textWord = this.removeFunctionPrefixes(textWord);
				if (this.isVariableName(textWord)) {
					names.push(textWord);
				}
			}
		}
		return names;
	}

	/**
	 * Removes function-like prefixes from a word, leaving only the variable name.
	 *
	 * @param word The word to process.
	 * @returns The word without function-like prefixes.
	 */
	private removeFunctionPrefixes(word: string): string {
		const VARIABLE_POSITION = 2;
		const functionPattern = /^(ABS|ABSOLUTE-VALUE|ACOS|ANNUITY|ASIN|ATAN|BIN2DEC|BOOLEAN-OF-INTEGER|BYTE-LENGTH|CAPACITY|CHAR|COMPILED-INFO|COS|CURRENT-DATE|DATE-OF-INTEGER|DATE-TO-YYYYMMDD|DAY-OF-INTEGER|DAY-TO-YYYYMMDD|DEC2BIN|DEC2HEX|DEC2OCT|DISPLAY-OF|E|EXP|EXP10|FACTORIAL|FRACTION-PART|HANDLE-TYPE|HEX2DEC|INTEGER|INTEGER-OF-BOOLEAN|INTEGER-OF-DATE|INTEGER-OF-DAY|INTEGER-PART|LENGTH|LOG|LOG10|LOWER-CASE|MAX|MEAN|MEDIAN|MIDRANGE|MIN|MOD|NATIONAL-OF|NUMVAL|NUMVAL-C|NUMVAL-F|OCT2DEC|ORD|ORD-MAX|ORD-MIN|PI|PRESENT-VALUE|RANDOM|RANGE|REM|REVERSE|SIGN|SIN|SQRT|STANDARD-DEVIATION|SUM|TAN|TEST-NUMVAL|TEST-NUMVAL-C|TEST-NUMVAL-F|TRIM|TRIML|TRIMR|UPPER-CASE|VARIANCE|WHEN-COMPILED|YEAR-TO-YYYY)\((.*)\)$/i;
		const match = functionPattern.exec(word);
		return match ? match[VARIABLE_POSITION] : word;
	}

	/**
	 * Remove from the current line the COBOL elements which certainly are not COBOL variables.
	 * This way we perform less communications with external debugger and improve performance.
	 *
	 * @param currentLine current line content
	 */
	private removeLanguageTokensFromLine(currentLine: string) {
		let result = "";
		let quotes = false;
		let method = false;
		for (let i = 0; i < currentLine.length; i++) {
			const character = currentLine[i];
			const lookAhead = (i + 1) < currentLine.length ? currentLine[i + 1] : "";
			if (!quotes && character == "\"") {
				quotes = true;
				continue;
			}
			if (quotes && character == "\"") {
				quotes = false;
				continue;
			}
			if (quotes) {
				continue;
			}
			if (character == "*" && lookAhead == ">") {
				break;
			}
			if (character == ":" && (lookAhead == ">" || lookAhead == ":")) {
				method = true;
				continue;
			}
			if (method && (character == "(" || character == " ")) {
				method = false;
			}
			if (method) {
				continue;
			}
			result += character;
		}
		return result;
	}

	/**
	 * Retuns true if the word represents a variable name
	 *
	 * @param word current word of the line
	 */
	private isVariableName(word: string): boolean {
		if (COBOL_RESERVED_WORDS.indexOf(word.toLowerCase()) >= 0) {
			return false;
		}
		if (this.createOnlyNumbersRegex().test(word)) {
			return false;
		}
		return true;
	}

	/**
	 * Creates and returns a regular expression to detect only numbers, possibly with decimal.
	 */
	private createOnlyNumbersRegex(): RegExp {
		return /^[0-9\,\.]*$/g;
	}

	public captureVariableInfo(variableName: string): Promise<DebugProtocol.Variable> {
		return new Promise((resolve, reject) => {
			this.debugRuntime.requestVariableValue(variableName).then((variableValue) => {
				if (variableValue) {
					return resolve({
						name: variableName,
						value: variableValue,
						variablesReference: 0,
						evaluateName: variableName
					});
				} else {
					return reject("Invalid variable name: " + variableName);
				}
			}).catch((e) => {
				reject(e);
			})
		})
	}

}
