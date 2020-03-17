import { ChildProcess, exec } from "child_process";
import { debug } from "vscode";

/**
 * Class to run commands on external process.
 *
 * By default, TypeScript libraries run commands in an async way but sometimes we need
 * to wait until the command is executed on the external process.
 *
 * This class is responsible for waiting the execution finish on the external process.
 */
export class SyncProcess {

	/** Command which will be executed to launch external process */
	private command: string = "";
	/** External process */
	private externalProcess: ChildProcess | undefined;
	/** Last response */
	private lastResponse: string = "";
	/** Command currently handled */
	private currentCommand: Command | undefined;
	/** Queue of pending commands to be executed on external process */
	private commandQueue: Command[] = [];
	/** Function which receives/redirects every process output */
	private outputRedirector: ((output: string) => void) | undefined = undefined;

	/**
	 * Spawns the external process and returns a new instance of SyncProcess
	 *
	 * @param command command to spawn the process
	 */
	public static spawn(command: string): SyncProcess {
		return new SyncProcess(command).spawn();
	}

	/**
	 * Creates an instance of SyncProcess with the specified command line
	 *
	 * @param command command which will be executed to launch external process
	 */
	public constructor(command: string) {
		this.command = command;
	}

	/**
	 * Configures the function which receives/redirects every process output
	 *
	 * @param outputRedirector
	 */
	public withOutputRedirector(outputRedirector: (output: string) => void): SyncProcess {
		this.outputRedirector = outputRedirector;
		return this;
	}

	/**
	 * Spawns the external process and returns the current instance of SyncProcess
	 *
	 * @param command command to spawn the process
	 */
	public spawn(): SyncProcess {
		this.externalProcess = exec(this.command, {encoding: "win1252"});
		this.configureOutputCallbacks();
		return this;
	}

	/**
	 * Sends command to the external process attached to this instance.
	 * This method waits until the external process return a response that matches with the specified regular expression.
	 *
	 * @param command command to be executed on the external process
	 */
	public sendCommand(command: Command): void {
		this.commandQueue.push(command);
		if (!this.currentCommand) {
			this.fireNextCommand();
		}
	}

	/**
	 * Configure callbacks to intercept external process output
	 */
	private configureOutputCallbacks(): void {
		this.externalProcess!.stdout.on('data', (outdata) => {
			this.handleOutput(outdata.toString('binary'));
		});
		this.externalProcess!.stderr.on('data', (errdata) => {
			this.handleOutput(errdata.toString('binary'));
		});
	}

	/**
	 * Handles the process output
	 *
	 * @param outData current process output
	 */
	private handleOutput(outData: string): void {
		this.redirectOutput(outData);
		this.lastResponse = this.lastResponse + outData;
		const currentCommand = this.getAvailableCommand();
		if (currentCommand) {
			this.handleCommand(currentCommand);
		}
	}

    /**
	 * Redirects the output data to the configured callback, if any.
	 *
	 * @param outData output data to be redirected
	 */
	private redirectOutput(outData: string): void {
		if (this.outputRedirector) {
			this.outputRedirector(outData);
		}
	}

	/**
	 * Returns the current command being handled at the moment
	 */
	private getAvailableCommand(): Command | undefined {
		if (this.currentCommand != null) {
			return this.currentCommand;
		}
		this.currentCommand = this.commandQueue.shift();
		return this.currentCommand;
	}

	/**
	 * Handles the specified command
	 *
	 * @param command command to be handled
	 */
	private handleCommand(command: Command): void {
		if (this.responseMatches(this.lastResponse, command.successRegexes)) {
			if ((/isdb>\s*$/i).test(this.lastResponse)) {
				command.success(this.lastResponse);
				this.fireNextCommand();
				return;
			}
		}
		if (this.responseMatches(this.lastResponse, command.failRegexes)) {
			command.fail(this.lastResponse);
			this.fireNextCommand();
			return;
		}
	}

	/**
	 * Returns true if the process response matches with any of the expected regular expressions
	 *
	 * @param response process output response
	 * @param expectedRegexes expected regular expressions
	 */
	private responseMatches(response: string, expectedRegexes: RegExp[]): boolean {
		for (let i = 0; i < expectedRegexes.length; i++) {
			const currentRegEx = expectedRegexes[i];
			if (currentRegEx.test(response)) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Fires the next command available on the queue
	 */
	private fireNextCommand(): void {
		this.lastResponse = "";
		this.currentCommand = undefined;
		const command = this.getAvailableCommand();
		if (command) {
			this.writeComanndToProcessInput(command.command);
		}
	}

	/**
	 * Writes a command directly to process STDIN.
	 *
	 * Important: this method does not add the command to the queue and therefore
	 * the output will be considered on the command which is currently on the top
	 * of the queue, if not empty.
	 *
	 * @param command command to be written
	 */
	public writeComanndToProcessInput(command: string): void {
        debug.activeDebugConsole.append("\nCurrent command is: " + command + "\n");
		const fullCommand = command + "\n";
		this.externalProcess!.stdin.write(fullCommand);
	}

}

/**
 * Command to be executed on external process
 */
interface Command {
    /**
	 * The command itself
	 */
	command: string;
	/**
	 * Expected output regexes to know when command has successfully finished
	 */
	successRegexes: RegExp[];
	/**
	 * Callback executed when command successfully finishes it's execution
	 */
	success: (output: string) => void;
	/**
	 * Expected output regexes to know when command has failed
	 */
	failRegexes: RegExp[];
	/**
	 * Callback executed when command fails during it's execution
	 */
	fail: (output: string) => void;
}
