/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import {
	InitializedEvent, TerminatedEvent, StoppedEvent, OutputEvent,
	Source, DebugSession, Thread, Scope, Handles, ContinuedEvent
} from '@vscode/debugadapter';
import { DebugProtocol } from '@vscode/debugprotocol';
import { basename } from 'path';
import { EventEmitter } from 'events';
import { DebugInterface } from './debugProcess/DebugInterface';
import { ExternalDebugAdapter } from './debugProcess/ExternalDebugAdapter';
import { VariableParser } from './parser/VariableParser';
import { DebugPosition } from './debugProcess/DebugPosition';
import { BreakpointManager } from './breakpoint/BreakpointManager';
import { DebuggerReplManager } from './repl/DebuggerReplManager';
import { window, debug, Uri, Position, Location, SourceBreakpoint } from 'vscode';
import { CobolBreakpoint } from './breakpoint/CobolBreakpoint';
import { CobolStack } from './CobolStack';
import { Configuration } from './config/Configuration';
import * as fs from "fs";

/** Scope of current variables */
const CURRENT_VARIABLES_SCOPE_NAME = "Current variables";
/** Scope of watched variables */
const WATCHED_VARIABLES_SCOPE_NAME = "Watched variables";
/** Custom comand indicating to step out of the current program */
export const CUSTOM_COMMAND_STEP_OUT_PROGRAM = "stepOutProgram";
/** Custom comand indicating to run to the next program */
export const CUSTOM_COMMAND_RUN_TO_NEXT_PROGRAM = "runToNextProgram";
/** Custom comand indicating to add a COBOL Monitor */
export const CUSTOM_COMMAND_ADD_MONITOR = "addMonitor";
/** Custom comand indicating to remove a COBOL Monitor */
export const CUSTOM_COMMAND_REMOVE_MONITOR = "removeMonitor";
/** Custom comand indicating to remove every existing COBOL Monitor */
export const CUSTOM_COMMAND_REMOVE_ALL_MONITORS = "removeAllMonitors";

export class CobolDebugSession extends DebugSession {

	// we don't support multiple threads, so we can use a hardcoded ID for the default thread
	private static THREAD_ID = 1;
	/** Instance representing the stack of current COBOL program */
	private cobolStack: CobolStack;
	/** Emitter of VSCode debugger API events */
	private emitter = new EventEmitter();
	/** Content of the last debugged line */
	private lastDebuggerOutput: string = "";
	/** Content of the current debugged line */
	private currentDebuggerOutput: string = "";
	/** Implementatin to send debug commands to external COBOL debug process */
	private debugRuntime: DebugInterface | undefined;
	/** Variable handles to group variables within sections */
	private variableHandles = new Handles<string>();
	/** Class to manage source breakpoints */
	private breakpointManager: BreakpointManager | undefined;
	/** Indicates wheter the code is running or not */
	private running: boolean = false;
	/** Variables currently watched */
	private watchedVariables: WatchedVariable[] = [];

	/**
	 * Creates a new debug adapter that is used for one debug session.
	 * We configure the default implementation of a debug adapter here.
	 */
	public constructor(cobolStack: CobolStack) {
		super();
		// this debugger uses zero-based lines and columns
		this.setDebuggerLinesStartAt1(false);
		this.setDebuggerColumnsStartAt1(false);
		this.cobolStack = cobolStack;
		// setup event handlers
		this.emitter.on('stopOnEntry', () => {
			this.sendEvent(new StoppedEvent('entry', CobolDebugSession.THREAD_ID));
		});
		this.emitter.on('stopOnStep', () => {
			this.sendEvent(new StoppedEvent('step', CobolDebugSession.THREAD_ID));
		});
		this.emitter.on('stopOnBreakpoint', () => {
			this.sendEvent(new StoppedEvent('breakpoint', CobolDebugSession.THREAD_ID));
		});
		this.emitter.on('stopOnDataBreakpoint', () => {
			this.sendEvent(new StoppedEvent('data breakpoint', CobolDebugSession.THREAD_ID));
		});
		this.emitter.on('stopOnException', () => {
			this.sendEvent(new StoppedEvent('exception', CobolDebugSession.THREAD_ID));
		});
		this.emitter.on('continued', () => {
			this.sendEvent(new ContinuedEvent(CobolDebugSession.THREAD_ID, true));
		});
		this.emitter.on('output', (text, filePath, line, column) => {
			const e: DebugProtocol.OutputEvent = new OutputEvent(`${text}\n`);
			e.body.source = this.createSource(filePath);
			e.body.line = this.convertDebuggerLineToClient(line);
			e.body.column = this.convertDebuggerColumnToClient(column);
			this.sendEvent(e);
		});
		this.emitter.on('end', () => {
			this.sendEvent(new TerminatedEvent());
		});
	}

	/**
	 * The 'initialize' request is the first request called by the frontend
	 * to interrogate the features the debug adapter provides.
	 */
	protected initializeRequest(response: DebugProtocol.InitializeResponse, _args: DebugProtocol.InitializeRequestArguments): void {
		response.body = response.body || {};
		response.body.supportsTerminateRequest = true;
		response.body.supportsSetVariable = true;
		response.body.supportsEvaluateForHovers = true;
		response.body.supportsConditionalBreakpoints = true;
		response.body.supportsHitConditionalBreakpoints = false;
		response.body.supportsLogPoints = false;
		this.sendResponse(response);
		// since this debug adapter can accept configuration requests like 'setBreakpoint' at any time,
		// we request them early by sending an 'initializeRequest' to the frontend.
		// The frontend will end the configuration sequence by calling 'configurationDone' request.
		this.sendEvent(new InitializedEvent());
	}

	protected async launchRequest(response: DebugProtocol.LaunchResponse, args: DebugProtocol.LaunchRequestArguments) {
		const commandLine = (<any>args).commandLine;
		const configFilePath = this.locateConfiguredDebugFile();
		const traceFilePath = this.locateTraceFile();
		const externalPathResolver = this.externalPathResolver();
		this.debugRuntime = new ExternalDebugAdapter(commandLine, this.appendOutputToDebugConsole, configFilePath, traceFilePath, externalPathResolver);
		// Gets information about the first line of source code
		this.debugRuntime.start().then((position) => {
			// Finally, tells VSCode API/UI to position on first line of source code
			this.fireDebugLineChangedEvent(position, "stopOnEntry", response);
		}).catch(() => {
			this.onProblemStartingDebugger(response);
		});
	}

	private locateConfiguredDebugFile(): string {
		const configuration = new Configuration("rech.cobol.debug")
		const configuredPath = configuration.get<string>("externalDebugConfigs");
		if (configuredPath && !fs.existsSync(configuredPath)) {
			return "";
		}
		return configuredPath;
	}

	private locateTraceFile(): string {
		const configuration = new Configuration("rech.cobol.debug")
		const traceFile = configuration.get<string>("traceFile");
		return traceFile;
	}

	private externalPathResolver(): string {
		const configuration = new Configuration("rech.cobol.debug")
		const externalPathResolver = configuration.get<string>("externalPathResolver");
		return externalPathResolver;
	}

	private onProblemStartingDebugger(response: DebugProtocol.LaunchResponse): void {
		window.showWarningMessage("Could not start external COBOL debugger.");
		this.fireTerminateDebugEvent(response);
	}

	protected setBreakPointsRequest(response: DebugProtocol.SetBreakpointsResponse, args: DebugProtocol.SetBreakpointsArguments): void {
		if (!this.debugRuntime) {
			return this.sendResponse(response);
		}
		if (!this.breakpointManager) this.breakpointManager = new BreakpointManager(this.debugRuntime)
		this.breakpointManager.setBreakpoints(args.source, args.breakpoints ? args.breakpoints : []).then((breakpoints) => {
			response.body = {
				breakpoints: breakpoints
			};
			this.sendResponse(response);
		}).catch(() => {
			this.sendResponse(response);
		});
	}

	protected pauseRequest(response: DebugProtocol.PauseResponse, _args: DebugProtocol.PauseArguments): void {
		if (!this.debugRuntime || !this.running) {
			return this.sendResponse(response);
		}
		this.debugRuntime.pause();
		this.sendResponse(response);
	}

	protected threadsRequest(response: DebugProtocol.ThreadsResponse): void {
		response.body = {
			threads: [
				new Thread(CobolDebugSession.THREAD_ID, "thread 1")
			]
		};
		this.sendResponse(response);
	}

	protected stackTraceRequest(response: DebugProtocol.StackTraceResponse, _args: DebugProtocol.StackTraceArguments): void {
		response.body = {
			stackFrames: [{
				id: 1,
				column: 1,
				line: this.cobolStack.currentLineNumber,
				name: "Current",
				source: new Source(this.cobolStack.currentSourceName)
			}],
			totalFrames: 1
		};
		this.sendResponse(response);
	}

	protected nextRequest(response: DebugProtocol.NextResponse, _args: DebugProtocol.NextArguments): void {
		if (!this.debugRuntime || this.running) {
			return this.sendResponse(response);
		}
		this.fireContinuedEvent();
		this.debugRuntime.next().then((position) => {
			this.fireDebugLineChangedEvent(position, "stopOnStep", response);
		}).catch(() => {
			this.fireTerminateDebugEvent(response);
		});
	}

	protected continueRequest(response: DebugProtocol.ContinueResponse, _args: DebugProtocol.ContinueArguments): void {
		if (!this.debugRuntime || this.running) {
			return this.sendResponse(response);
		}
		this.fireContinuedEvent();
		this.debugRuntime.continue().then((position) => {
			this.fireDebugLineChangedEvent(position, "stopOnBreakpoint", response);
		}).catch(() => {
			this.fireTerminateDebugEvent(response);
		});
	}

	protected stepInRequest(response: DebugProtocol.StepInResponse, _args: DebugProtocol.StepInArguments): void {
		if (!this.debugRuntime || this.running) {
			return this.sendResponse(response);
		}
		this.fireContinuedEvent();
		this.debugRuntime.stepIn().then((position) => {
			this.fireDebugLineChangedEvent(position, "stopOnStep", response);
		}).catch(() => {
			this.fireTerminateDebugEvent(response);
		});
	}

	protected stepOutRequest(response: DebugProtocol.StepOutResponse, _args: DebugProtocol.StepOutArguments): void {
		if (!this.debugRuntime || this.running) {
			return this.sendResponse(response);
		}
		this.fireContinuedEvent();
		this.debugRuntime.stepOut().then((position) => {
			this.fireDebugLineChangedEvent(position, "stopOnStep", response);
		}).catch(() => {
			this.fireTerminateDebugEvent(response);
		});
	}

	protected scopesRequest(response: DebugProtocol.ScopesResponse, _args: DebugProtocol.ScopesArguments): void {
		response.body = {
			scopes: [
				new Scope(CURRENT_VARIABLES_SCOPE_NAME, this.variableHandles.create(CURRENT_VARIABLES_SCOPE_NAME), false),
				new Scope(WATCHED_VARIABLES_SCOPE_NAME, this.variableHandles.create(WATCHED_VARIABLES_SCOPE_NAME), true),
			]
		};
		this.sendResponse(response);
	}

	protected async terminateRequest(response: DebugProtocol.TerminateResponse, _args: DebugProtocol.TerminateArguments): Promise<void> {
		if (!this.debugRuntime) {
			return this.sendResponse(response);
		}
		this.debugRuntime.stop();
		this.fireTerminateDebugEvent(response);
	}

	protected async variablesRequest(response: DebugProtocol.VariablesResponse, args: DebugProtocol.VariablesArguments, _request?: DebugProtocol.Request) {
		const reference = this.variableHandles.get(args.variablesReference);
		switch (reference) {
			case CURRENT_VARIABLES_SCOPE_NAME: {
				this.resolveCurrentVariables(response);
				break;
			}
			case WATCHED_VARIABLES_SCOPE_NAME: {
				this.resolveWatchedVariables(response);
				break;
			}
		}
	}

	protected setVariableRequest(response: DebugProtocol.SetVariableResponse, args: DebugProtocol.SetVariableArguments, _request?: DebugProtocol.Request): void {
		if (!this.debugRuntime) {
			return this.sendResponse(response);
		}
		this.debugRuntime.changeVariableValue(args.name, args.value).then((success) => {
			if (success) {
				response.body = {
					value: args.value
				};
			}
			this.sendResponse(response);
		}).catch(() => {
			this.fireTerminateDebugEvent(response);
		});
	}

	protected customRequest(command: string, response: DebugProtocol.Response, args: any): void {
		if (this.running) {
			return this.sendResponse(response);
		}
		switch (command) {
			case CUSTOM_COMMAND_STEP_OUT_PROGRAM:
				this.stepOutProgramRequest(response);
				break;
			case CUSTOM_COMMAND_RUN_TO_NEXT_PROGRAM:
				this.runToNextProgramRequest(response);
				break;
			case CUSTOM_COMMAND_ADD_MONITOR:
				this.addMonitorRequest(response, args);
				break;
			case CUSTOM_COMMAND_REMOVE_MONITOR:
				this.removeMonitorRequest(response, args);
				break;
			case CUSTOM_COMMAND_REMOVE_ALL_MONITORS:
				this.removeAllMonitorsRequest(response);
				break;
			default:
				return this.sendResponse(response);
		}
	}

	/**
	 * Request to step out of the current COBOL program
	 */
	private stepOutProgramRequest(response: DebugProtocol.Response): void {
		if (!this.debugRuntime) {
			return this.sendResponse(response);
		}
		this.fireContinuedEvent();
		this.debugRuntime.stepOutProgram().then((position) => {
			this.fireDebugLineChangedEvent(position, "stopOnStep", response);
		}).catch(() => {
			this.fireTerminateDebugEvent(response);
		});
	}

	/**
	 * Request to run to the next COBOL program
	 */
	private runToNextProgramRequest(response: DebugProtocol.Response): void {
		if (!this.debugRuntime) {
			return this.sendResponse(response);
		}
		this.fireContinuedEvent();
		this.debugRuntime.runToNextProgram().then((position) => {
			this.fireDebugLineChangedEvent(position, "stopOnStep", response);
		}).catch(() => {
			this.fireTerminateDebugEvent(response);
		});
	}

	/**
	 * Request to add a COBOL monitor on external debugger
	 */
	private addMonitorRequest(response: DebugProtocol.Response, args: any): void {
		if (!this.debugRuntime) {
			return this.sendResponse(response);
		}
		this.debugRuntime.addMonitor(args).then((success) => {
			this.sendBooleanResponse(response, success);
		}).catch(() => {
			this.sendBooleanResponse(response, false);
		});
	}

	/**
	 * Request to remove a COBOL monitor on external debugger
	 */
	private removeMonitorRequest(response: DebugProtocol.Response, args: any): void {
		if (!this.debugRuntime) {
			return this.sendResponse(response);
		}
		this.debugRuntime.removeMonitor(args).then((success) => {
			this.sendBooleanResponse(response, success);
		}).catch(() => {
			this.sendBooleanResponse(response, false);
		});
	}

	/**
	 * Request to remove every existing COBOL monitors on external debugger
	 */
	private removeAllMonitorsRequest(response: DebugProtocol.Response): void {
		if (!this.debugRuntime) {
			return this.sendResponse(response);
		}
		this.debugRuntime.removeAllMonitors().then((success) => {
			this.sendBooleanResponse(response, success);
		}).catch(() => {
			this.sendBooleanResponse(response, false);
		});
	}

	/**
	 * Sends a boolean response representing the result of the current custom request
	 */
	private sendBooleanResponse(response: DebugProtocol.Response, success: boolean): void {
		response.body = {};
		response.body.success = success;
		this.sendResponse(response);
	}

	protected evaluateRequest(response: DebugProtocol.EvaluateResponse, args: DebugProtocol.EvaluateArguments, _request?: DebugProtocol.Request): void {
		switch (args.context) {
			case 'hover':
				this.hoverRequest(response, args);
				break;
			case 'watch':
				this.watchRequest(response, args);
				break;
			case 'repl':
				this.replRequest(response, args);
				break;
		}
	}

	private hoverRequest(response: DebugProtocol.EvaluateResponse, args: DebugProtocol.EvaluateArguments): void {
		if (!this.debugRuntime) {
			return this.sendResponse(response);
		}
		new VariableParser(this.debugRuntime).captureVariableInfo(args.expression).then((variable) => {
			this.sendVariableValueResponse(variable, response);
		}).catch(() => {
			// On hover does not set result when value is not found so hint is not shown in UI
			this.sendResponse(response);
		});
	}

	private watchRequest(response: DebugProtocol.EvaluateResponse, args: DebugProtocol.EvaluateArguments): void {
		if (!this.debugRuntime) {
			return this.sendResponse(response);
		}
		new VariableParser(this.debugRuntime).captureVariableInfo(args.expression).then((variable) => {
			this.updateWatchedVarArray(variable);
			this.sendVariableValueResponse(variable, response);
		}).catch(() => {
			this.removeWatchedVarFromArray(args.expression);
			// This is needed because otherwise VSCode would show the last successful watch result, which might be
			// outdated
			response.body = {
				result: "<Invalid watch expression>",
				variablesReference: 0
			};
			this.sendResponse(response);
		});
	}

	/**
	 * Updates the array which contains information about the watched variables
	 */
	private updateWatchedVarArray(variable: DebugProtocol.Variable): void {
		let existsOnArray: boolean = false;
		for (let i = 0; i < this.watchedVariables.length; i++) {
			const watched = this.watchedVariables[i];
			if (watched.name === variable.name) {
				watched.originalInstance = variable;
				existsOnArray = true;
			}
		}
		if (!existsOnArray) {
			this.watchedVariables.push({ name: variable.name, originalInstance: variable });
		}
	}

	/**
	 * Removes the variable with whe specified name from watched variables array
	 */
	private removeWatchedVarFromArray(name: string): void {
		this.watchedVariables = this.watchedVariables.filter(w => w.name !== name);
	}

	private replRequest(response: DebugProtocol.EvaluateResponse, args: DebugProtocol.EvaluateArguments): void {
		if (!this.debugRuntime) {
			return this.sendResponse(response);
		}
		new DebuggerReplManager(this.debugRuntime, this.addLineBreak).handleCommand(args.expression);
		this.sendResponse(response);
	}

	/**
	 * Adds a Cobol Breakpoint on the specified line.
	 * This method invokes VSCode API so the breakpoint red circle is rendered on UI.
	 *
	 * Besides, this method also invokes 'setBreakPointsRequest' method and updates breakpoint on
	 * BreakpointManager and on external debugger if needed.
	 *
	 * @param bp breakpoint which will be added, with relevant information about Cobol source
	 */
	private addLineBreak(bp: CobolBreakpoint): void {
		const uri = Uri.file(bp.source);
		const pos = new Position(bp.line - 1, 0);
		const loc = new Location(uri, pos);
		const breakpoint = new SourceBreakpoint(loc, true, bp.condition);
		debug.addBreakpoints([breakpoint]);
	}

	private sendVariableValueResponse(variable: DebugProtocol.Variable, response: DebugProtocol.EvaluateResponse): void {
		response.body = {
			result: variable.value,
			variablesReference: 0
		};
		this.sendResponse(response);
	}

	private resolveCurrentVariables(response: DebugProtocol.VariablesResponse) {
		if (!this.debugRuntime) {
			return this.sendResponse(response);
		}
		const parser = new VariableParser(this.debugRuntime);
		parser.parse(this.currentDebuggerOutput).then((currentVariables) => {
			parser.parse(this.lastDebuggerOutput).then((lastVariables) => {
				const concatVariables = currentVariables.concat(lastVariables);
				const uniqueVariables = Array.from(new Map(concatVariables.map(v => [v.name, v])).values());
				response.body = {
					variables: uniqueVariables
				};
				this.sendResponse(response);
			}).catch(() => {
				this.sendResponse(response);
			});
		}).catch(() => {
			this.sendResponse(response);
		});
	}

	private resolveWatchedVariables(response: DebugProtocol.VariablesResponse) {
		if (!this.debugRuntime) {
			return this.sendResponse(response);
		}
		response.body = {
			variables: this.getAllWatchedVariables()
		};
		this.watchedVariables = [];
		this.sendResponse(response);
	}

	/**
	 * Returns an array with every existing watched variable
	 */
	private getAllWatchedVariables(): DebugProtocol.Variable[] {
		const originalVarInstances = this.watchedVariables.map(w => w.originalInstance);
		return originalVarInstances;
	}

	/**
	 * Fires debugger terminated event
	 *
	 * @param response debug response
	 */
	private fireTerminateDebugEvent(response: DebugProtocol.Response): void {
		setImmediate(() => {
			this.emitter.emit("end");
		});
		this.sendResponse(response);
	}

	/**
	 * Fires continued event to change Debugger UI control buttons and indicate
	 * that a possible heavy operation is being performed
	 */
	private fireContinuedEvent(): void {
		this.running = true;
		setImmediate(_ => {
			this.emitter.emit("continued");
		});
	}

	/**
	 * Fires debug line changed event and updates information related to current line being debugged
	 *
	 * @param position current position
	 * @param event event type
	 * @param response debug response
	 */
	private fireDebugLineChangedEvent(position: DebugPosition, event: string, response: DebugProtocol.Response): void {
		this.running = false;
		this.updateCurrentPositionInfo(position);
		setImmediate(_ => {
			this.emitter.emit(event);
		});
		this.sendResponse(response);
	}

	/**
	 * Update information related to current line being debugged
	 */
	private updateCurrentPositionInfo(position: DebugPosition): void {
		this.lastDebuggerOutput = this.currentDebuggerOutput;
		this.cobolStack.currentLineNumber = position.line;
		this.cobolStack.currentSourceName = position.file;
		this.currentDebuggerOutput = position.output;
	}

	/**
	 * Appends output data to debug console
	 *
	 * @param outData data to be appended
	 */
	private appendOutputToDebugConsole(outData: string): void {
		debug.activeDebugConsole.append(outData);
	}

	//---- helpers

	private createSource(filePath: string): Source {
		return new Source(basename(filePath), this.convertDebuggerPathToClient(filePath), undefined, undefined, 'cobol-adapter-data');
	}
}

/**
 * Single variable representation on Watch group
 */
interface WatchedVariable {
	/** Variable name */
	name: string;
	/** Variable instance on VSCode API */
	originalInstance: DebugProtocol.Variable;
}
