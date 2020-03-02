/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import {
	InitializedEvent, TerminatedEvent, StoppedEvent, OutputEvent,
	Source, DebugSession, Thread, Scope, Handles, ContinuedEvent
} from 'vscode-debugadapter';
import { DebugProtocol } from 'vscode-debugprotocol';
import { basename } from 'path';
import { EventEmitter } from 'events';
import { DebugInterface } from './debugProcess/DebugInterface';
import { IsCobolDebug } from './debugProcess/IsCobolDebug';
import { VariableParser } from './parser/VariableParser';
import { DebugPosition } from './debugProcess/DebugPosition';
import { BreakpointManager } from './breakpoint/BreakpointManager';
import { DebuggerReplManager } from './DebuggerReplManager';
const { Subject } = require('await-notify');

const CURRENT_VARIABLES_SCOPE_NAME = "Current variables";

export class CobolDebugSession extends DebugSession {

	// we don't support multiple threads, so we can use a hardcoded ID for the default thread
	private static THREAD_ID = 1;
	/** Current line number within buffer source */
	private currentLineNumber = 0;
	/** Name of the current file/source code */
	private currentSourceName = "";
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

	/**
	 * Creates a new debug adapter that is used for one debug session.
	 * We configure the default implementation of a debug adapter here.
	 */
	public constructor() {
		super();
		// this debugger uses zero-based lines and columns
		this.setDebuggerLinesStartAt1(false);
		this.setDebuggerColumnsStartAt1(false);
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
		this.sendResponse(response);
		// since this debug adapter can accept configuration requests like 'setBreakpoint' at any time,
		// we request them early by sending an 'initializeRequest' to the frontend.
		// The frontend will end the configuration sequence by calling 'configurationDone' request.
		this.sendEvent(new InitializedEvent());
	}

	protected async launchRequest(response: DebugProtocol.LaunchResponse, args: DebugProtocol.LaunchRequestArguments) {
		const commandLine = (<any>args).commandLine;
		this.debugRuntime = new IsCobolDebug(commandLine);
		this.debugRuntime.setup().then(() => {
			this.debugRuntime!.start().then((position) => {
				this.fireDebugLineChangedEvent(position, "stopOnEntry", response);
			}).catch(() => {
				this.fireTerminateDebugEvent(response);
			});
		}).catch();
	}

	protected setBreakPointsRequest(response: DebugProtocol.SetBreakpointsResponse, args: DebugProtocol.SetBreakpointsArguments): void {
		if (!this.debugRuntime) {
			return this.sendResponse(response);
		}
		if (!this.breakpointManager) this.breakpointManager = new BreakpointManager(this.debugRuntime)
		this.breakpointManager.setBreakpoints(args.source, args.breakpoints).then((breakpoints) => {
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
				line: this.currentLineNumber,
				name: "Current",
				source: new Source(this.currentSourceName)
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
		}
	}

	protected setVariableRequest(response: DebugProtocol.SetVariableResponse, args: DebugProtocol.SetVariableArguments, _request?: DebugProtocol.Request): void {
		if (!this.debugRuntime) {
			return this.sendResponse(response);
		}
		this.debugRuntime.changeVariableValue(args.name, args.value).then(() => {
			response.body = {
				value: args.value
			};
			this.sendResponse(response);
		}).catch(() => {
			this.fireTerminateDebugEvent(response);
		});
	}

	protected evaluateRequest(response: DebugProtocol.EvaluateResponse, args: DebugProtocol.EvaluateArguments, _request?: DebugProtocol.Request): void {
		if (!this.debugRuntime) {
			return this.sendResponse(response);
		}
		switch (args.context) {
			case 'hover':
			case 'watch':
				new VariableParser(this.debugRuntime).captureVariableInfo(args.expression).then((variable) => {
					response.body = {
						result: variable.value,
						variablesReference: 0
					};
					this.sendResponse(response);
				}).catch(() => {
					this.sendResponse(response);
				});
				break;
			case 'repl':
				new DebuggerReplManager(this.debugRuntime).handleCommand(args.expression);
				this.sendResponse(response);
				break;
		}
	}

	private resolveCurrentVariables(response: DebugProtocol.VariablesResponse) {
		if (!this.debugRuntime) {
			return this.sendResponse(response);
		}
		const parser = new VariableParser(this.debugRuntime);
		parser.parse(this.currentDebuggerOutput).then((currentVariables) => {
			parser.parse(this.lastDebuggerOutput).then((lastVariables) => {
				response.body = {
					variables: currentVariables.concat(lastVariables)
				};
				this.sendResponse(response);
			}).catch(() => {
				this.sendResponse(response);
			});
		}).catch(() => {
			this.sendResponse(response);
		});
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
		this.currentLineNumber = position.line;
		this.currentSourceName = position.file;
		this.currentDebuggerOutput = position.output;
	}

	//---- helpers

	private createSource(filePath: string): Source {
		return new Source(basename(filePath), this.convertDebuggerPathToClient(filePath), undefined, undefined, 'cobol-adapter-data');
	}
}
