import { ReplCommand } from "./ReplCommand";
import { DebugInterface } from "../debugProcess/DebugInterface";
import { CobolBreakpoint } from "../breakpoint/CobolBreakpoint";

/**
 * Class to set breakpoint on first line of a program through REPL console
 */
export class SetBreakOnFirstLineReplCommand implements ReplCommand {

	/** Callback to add breakpoint on VSCode debug API */
	private addLineBreakCallback: (bp: CobolBreakpoint) => void;

	constructor(addLineBreakCallback: (bp: CobolBreakpoint) => void) {
		this.addLineBreakCallback = addLineBreakCallback;
	}

	fireCommand(debugRuntime: DebugInterface, command: string): void {
		const program = this.extractProgramFromCommand(command);
		// Adds the breakpoint on the first line of the program
		debugRuntime.addBreakpointOnFirstLine(program).then((success) => {
            // If breakpoint could be successfully set on the first line of program
			if (success) {
				// External debugger might not return the full filename where
				// this breakpoint has been set and neither the line.
				// So, we need to list the existing breakpoints for get
				// further information
				debugRuntime.listBreakpoints().then((allBreaks) => {
					// We now have the line where the breakpoint has been set,
					// but we still don't know the full filename.
					const bp = allBreaks[allBreaks.length - 1];
					//
					// Check whether the last breakpoint really refers to the same recently set.
					//
					// When 'b0' is performed on an already existing breakpoint, it doesn't
					// appear on the end of the list.
					if (this.isSameProgram(bp, program)) {
						//
						// We will fire another breakpoint command, but this time
						// exactly on the line where the previous breakpoint has been set.
						//
						// With this workaround we can find the full filename of the breakpoint
						debugRuntime.addBreakpoint(bp).then((fullFileName) => {
							if (fullFileName) {
								const finalBreak: CobolBreakpoint = {line: bp.line, source: fullFileName, condition: ''};
								this.addLineBreakCallback(finalBreak);
							}
						}).catch();
					}
				}).catch();
			}
		}).catch();
	}

	/**
	 * Extracts the program name from the command typed on 'repl' console.
	 *
	 * The program name is always the last part, when splitted into spaces.
	 */
	private extractProgramFromCommand(command: string): string {
		const splitted = command.split(/\s+/i);
		const program = splitted[splitted.length - 1];
		return program;
	}

	/**
	 * Checks whether the breakpoint is related to the specified program
	 */
	private isSameProgram(bp: CobolBreakpoint, program: string): boolean {
		const loweredSourceLastBp = bp.source.toLowerCase().trim();
		const loweredProgramCmd = program.toLowerCase().trim();
		return loweredSourceLastBp.startsWith(loweredProgramCmd);
	}

}
