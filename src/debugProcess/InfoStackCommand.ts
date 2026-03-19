import { DebugCommand } from "./DebugCommand";
import { ICommand } from "./DebugConfigs";
import { GenericDebugCommand } from "./GenericDebugCommand";
import { CobolStackFrame } from "./CobolStackFrame";

/** Regex to match each line of infostack output, e.g.:
 *   + M00-INICIO [SRIM00] SRIM00.CBL:51922
 *   + PARA [METHOD of PROGRAM] STCGER.CBL:2095
 */
const STACK_LINE_REGEX = /^\s*\+\s+([^\s]+)\s+\[([^\]]+)\]\s+(.+):([0-9]+)\s*$/gm;

/** Index of the paragraph capture group in STACK_LINE_REGEX */
const PARAGRAPH_GROUP = 1;
/** Index of the bracket content capture group in STACK_LINE_REGEX */
const BRACKET_CONTENT_GROUP = 2;
/** Index of the source capture group in STACK_LINE_REGEX */
const SOURCE_GROUP = 3;
/** Index of the line capture group in STACK_LINE_REGEX */
const LINE_GROUP = 4;

/** Regex to extract the program name from "METHOD of PROGRAM" notation */
const OF_PROGRAM_REGEX = /of\s+([\w]+)/i;

/**
 * Command to request the COBOL call stack from the external debugger via 'infostack'.
 * Returns frames ordered innermost first (current execution point at index 0).
 */
export class InfoStackCommand implements DebugCommand<void, CobolStackFrame[]> {

	constructor(private command: ICommand) { }

	buildCommand(): string {
		return this.command.name;
	}

	getExpectedRegExes(): RegExp[] {
		return new GenericDebugCommand(this.command).getExpectedRegExes("im");
	}

	validateOutput(output: string): CobolStackFrame[] {
		const frames: CobolStackFrame[] = [];
		const regex = new RegExp(STACK_LINE_REGEX.source, "gm");
		let match: RegExpExecArray | null;
		while ((match = regex.exec(output)) !== null) {
			const paragraph = match[PARAGRAPH_GROUP];
			const bracketContent = match[BRACKET_CONTENT_GROUP];
			const source = match[SOURCE_GROUP].trim();
			const line = Number(match[LINE_GROUP]);
			const ofMatch = OF_PROGRAM_REGEX.exec(bracketContent);
			const program = ofMatch ? ofMatch[PARAGRAPH_GROUP] : bracketContent.trim();
			frames.push({ paragraph, program, file: source, line: line });
		}

		// The frames are extracted in outermost to innermost order, so we reverse them before returning.
		frames.reverse();
		return frames;
	}

}
