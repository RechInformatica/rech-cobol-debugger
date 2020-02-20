import { DebugProtocol } from 'vscode-debugprotocol';
import { DebugInterface } from '../debugProcess/DebugInterface';
import Q from "q";

/** Array of COBOL Reserved words */
const COBOL_RESERVED_WORDS = ["perform", "move", "to", "set", "add", "subtract", "call", "inquire", "modify", "invoke", "if", "not", "end-if", "until", "varying", "evaluate", "true", "when", "false", "go", "thru", "zeros", "spaces", "zero", "space", "inspect", "tallying", "exit", "paragraph", "method", "cycle", "from", "by", "and", "or", "of", "length", "function", "program", "synchronized", "end-synchronized", "string", "end-string", "on", "reference", "value", "returning", "giving", "replacing", "goback", "all", "open", "i-o", "input", "output", "close", "compute", "unstring", "using", "delete", "start", "read", "write", "rewrite", "with", "lock", "else", "upper-case", "lower-case", "display", "accept", "at", "clear-screen", "initialize", "line", "col", "key", "is", "self", "null", "stop", "run"]

/**
 * Class to parse Variable output from isCobol command-line debugger process
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
		const names: string[] = []
		const parts = output.substring(output.indexOf("line=")).split("\n")
		const pattern = /[a-zA-Z0-9ÇéâäàçêëèïîÄôöòûùÖÜáíóúñÑÁÂÀãÃÊËÈÍÎÏÌÓÔÒõÕÚÛÙüÉì_\\-]+/g;
		const currentLinePosition = 1;
		if (parts.length > currentLinePosition) {
			const currentLine = this.removeLanguageTokensFromLine(parts[currentLinePosition]);
			let word = pattern.exec(currentLine);
			while (word) {
				const textWord = word.toString();
				if (this.isVariableName(textWord)) {
					names.push(textWord);
				}
				word = pattern.exec(currentLine);
			}
		}
		return names;
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
		if (COBOL_RESERVED_WORDS.indexOf(word) >= 0) {
			return false;
		}
		if (/[0-9]+/g.test(word)) {
			return false;
		}
		return true;
	}

	public captureVariableInfo(variableName: string): Promise<DebugProtocol.Variable> {
		return new Promise((resolve, reject) => {
			this.debugRuntime.requestVariableValue(variableName).then((variableValue) => {
				return resolve({
					name: variableName,
					value: variableValue,
					variablesReference: 0,
					evaluateName: variableName
				});
			}).catch((e) => {
				reject(e);
			})
		})
	}

	/**
	 * Creates a RegEx to parse variable output from external debugger output
	 *
	 * @param variableName variable name
	 */
	public static createVariableValueRegex(variableName: string): RegExp {
		return new RegExp(`${variableName.replace("-", "\\-")}\\s*=\\s*(.*)\\s?`, "gi");
	}

}