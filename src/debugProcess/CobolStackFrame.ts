/**
 * Represents a single frame in the COBOL call stack
 */
export interface CobolStackFrame {
	/** Paragraph name where execution is paused or called from */
	paragraph: string;
	/** COBOL program name containing the paragraph */
	program: string;
	/** Source file from infostack output (file name or full path) */
	file?: string;
	/** Line number from infostack output */
	line?: number;
}
