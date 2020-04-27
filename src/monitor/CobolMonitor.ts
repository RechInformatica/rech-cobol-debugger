/**
 * COBOL monitor
 */
export interface CobolMonitor {
	/**
	 * Variable being monitored
	 */
	variable: string;
	/**
	 * Condition to stop debugger while monitoring this variable
	 */
	condition: string;
	/**
	 * Source which this monitor is related to
	 */
	source?: string;
}
