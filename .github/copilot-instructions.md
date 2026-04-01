# Rech COBOL Debugger — Copilot Instructions

## Project Overview

This is a **VS Code extension** (`rech-cobol-debugger`) that implements the **Debug Adapter Protocol (DAP)** for COBOL programs. It acts as a bridge between VS Code's debug UI and an external COBOL debugger (isdb), translating VS Code debug operations into debugger-specific commands and parsing responses via regex patterns.

- **Publisher:** Rech Informatica
- **Language:** TypeScript (target ES2020, CommonJS modules)
- **Engine:** VS Code ^1.69.0
- **Output:** `./out/` (compiled from `./src/`)
- **License:** MIT

## Architecture

### High-Level Data Flow

```
VS Code Debug UI
    ↓ (DAP requests)
CobolDebugSession (extends DebugSession from @vscode/debugadapter)
    ↓ (delegates to)
ExternalDebugAdapter (implements DebugInterface — facade)
    ↓ (builds commands via)
Command classes (implement DebugCommand<T,K> — Command Pattern)
    ↓ (sends to)
SyncProcess (command queue + regex matching)
    ↓ (process I/O via)
NodeProcessProvider (child_process.exec)
    ↓ (stdin/stdout)
External COBOL Debugger (isdb)
```

### Core Modules

| Module | Path | Purpose |
|--------|------|---------|
| **Extension Entry** | `src/extension.ts` | Activation, command registration, provider setup |
| **Debug Session** | `src/CobolDebug.ts` | DAP implementation (~600 lines), handles all debug protocol requests |
| **Debug Interface** | `src/debugProcess/DebugInterface.ts` | Contract for all debugger operations (Strategy pattern) |
| **External Adapter** | `src/debugProcess/ExternalDebugAdapter.ts` | Facade implementing `DebugInterface`, orchestrates commands |
| **Sync Process** | `src/debugProcess/SyncProcess.ts` | Queued command execution with external process, regex-based output parsing |
| **Debug Configs** | `src/debugProcess/DebugConfigs.ts` | Loads command definitions from JSON config |
| **Breakpoint Manager** | `src/breakpoint/BreakpointManager.ts` | Delta-based breakpoint synchronization |
| **Monitor (MVC)** | `src/monitor/` | Variable monitoring with Controller/Model/View separation |
| **Variable Parser** | `src/parser/VariableParser.ts` | Extracts COBOL variables from debugger output, filters reserved words |
| **REPL** | `src/repl/` | Debug console command routing (`br`, `b0`, raw passthrough) |
| **Providers** | `src/provider/` | VS Code extension points: config, adapter factory, hover expressions |

### Key Design Patterns

- **Command Pattern**: All debug operations implemented as `DebugCommand<T, K>` with `buildCommand()`, `getExpectedRegExes()`, `validateOutput()`. Over 20 command classes in `src/debugProcess/`.
- **Facade**: `ExternalDebugAdapter` simplifies debugger interaction behind `DebugInterface`.
- **Configuration-Driven Protocol**: All command names and regex patterns defined in `defaultDebugConfigs.json`, allowing different debugger backends without code changes.
- **MVC**: Monitor system (`CobolMonitorController` → `CobolMonitorModel` + `CobolMonitorView`).
- **Queue + State Machine**: `SyncProcess` manages sequential command execution with regex matching on stdout.
- **Strategy/Adapter**: `ProcessProvider` interface abstracts child process for testability (`NodeProcessProvider` is the real implementation).
- **Delta Detection**: `BreakpointManager` calculates added/removed breakpoints by diffing current vs desired state.

### Configuration-Driven Debugger Protocol

The file `defaultDebugConfigs.json` defines:
- **17 debug commands** with their names, success regex patterns, and error patterns
- **Execution finished patterns** (program end, exceptions, errors)
- **Retry patterns** (e.g., "Waiting for a Debuggable thread")
- **Command terminator** (`isdb>\s*$`)

This allows the debugger protocol to be customized via an external JSON file pointed to by the `rech.cobol.debug.externalDebugConfigs` setting.

### Extension Settings

| Setting | Type | Purpose |
|---------|------|---------|
| `rech.cobol.debug.params` | `string[]` | Parameter prompts shown before debugging |
| `rech.cobol.debug.commandline` | `string` | Command template with `$1`, `$2` placeholders |
| `rech.cobol.debug.externalDebugConfigs` | `string` | Path to external debug configs JSON |
| `rech.cobol.debug.traceFile` | `string` | Optional debug trace log file |
| `rech.cobol.debug.externalPathResolver` | `string` | External command for resolving source paths |

### Extension Commands

| Command ID | Keybinding | Purpose |
|------------|------------|---------|
| `rech.cobol.debug.startDebugger` | — | Start debug with parameter prompts |
| `rech.cobol.debug.stepOutProgram` | Ctrl+Shift+F11 | Step out of COBOL program |
| `rech.cobol.debug.runToNextProgram` | Alt+F9 | Run to next program call |
| `rech.cobol.debug.addCobolMonitor` | Context menu | Add variable monitor |
| `rech.cobol.debug.removeCobolMonitor` | Inline button | Remove specific monitor |
| `rech.cobol.debug.removeAllCobolMonitors` | Toolbar button | Clear all monitors |

## Code Style & Conventions

### TypeScript

- **Strict mode** enabled: `noImplicitAny`, `noUnusedParameters`, `noFallthroughCasesInSwitch`.
- `noImplicitReturns` is intentionally **disabled**.
- Use `const` for immutable bindings (enforced by tslint `prefer-const`).
- No magic numbers — use named constants (enforced by tslint `no-magic-numbers`).
- No floating promises — all promises must be handled (enforced by tslint `no-floating-promises`).
- No duplicate imports or switch cases.
- Module resolution: Node, with `esModuleInterop` and `allowSyntheticDefaultImports`.

### Naming & Structure

- Classes use PascalCase: `CobolDebugSession`, `BreakpointManager`.
- Interfaces use PascalCase prefixed with `I` for config types (`ICommand`, `IDebugConfigs`) but plain PascalCase for domain interfaces (`DebugInterface`, `CobolBreakpoint`, `Variable`).
- Files are named after their main export (one class/interface per file).
- Modules organized by feature domain: `breakpoint/`, `debugProcess/`, `monitor/`, `parser/`, `provider/`, `repl/`, `config/`.

### Async Patterns

- Use `async/await` for async operations.
- Use `Q.allSettled()` (from the `q` library) for concurrent operations where all results matter (not just first failure).
- The `SyncProcess` manages command serialization — commands are queued and executed one at a time.
- Callbacks are used for process I/O event handling (`onStdOut`, `onStdErr`).

### Path Handling

- Always normalize paths for cross-platform compatibility.
- `SourceUtils.normalize()` handles VS Code API inconsistencies (empty paths, mixed slashes, drive letter case).
- File comparison is case-insensitive (COBOL programs on Windows).
- `FallbackDirectoriesFinder` resolves source files with multi-level fallback: direct path → current directory → fallback directories → external resolver.

### COBOL-Specific

- COBOL file extensions: `.cbl`, `.cob`, `.cpy`, `.cpb`, `.tpl`.
- Comment symbol: `*>`.
- Custom folding regions: `$region` / `$end-region`.
- Word pattern includes accented characters (Portuguese/Spanish support).
- Variable parser filters 50+ COBOL reserved words (PERFORM, MOVE, IF, etc.).
- Paragraph-based breakpoints are a COBOL-specific feature alongside line-based breakpoints.
- Single-threaded model: `THREAD_ID = 1` (COBOL has no multithreading).

## Build & Test

```bash
# Install dependencies
npm install

# Compile (lint + tsc)
npm run compile

# Watch mode (incremental compilation)
npm run watch

# Run tests
npm run test

# Lint
npm run tslint
```

### Testing

- **Framework:** Mocha + Chai (with `ts-node` for direct TypeScript execution).
- **Test location:** `src/test/` mirroring source structure (`debugProcess/`, `parser/`, `repl/`).
- Tests use mock implementations of `ProcessProvider` and `DebugInterface` to avoid external process dependencies.
- Test file naming: `<ClassName>.test.ts`.

### CI/CD

- **CI workflow:** `.github/workflows/tests.yml` — runs on push/PR to `master` (Windows runner).
- **Version bumping:** `.github/workflows/bump-version.yml`.
- Steps: `npm i` → `npm run compile` → `npm run test`.

## Important Implementation Details

### SyncProcess Command Queue

`SyncProcess` is the most critical infrastructure component. It:
1. Launches the external debugger process via `ProcessProvider`.
2. Queues commands sequentially (only one executes at a time).
3. Matches stdout output against success/fail/retry regex patterns.
4. Detects command completion via the command terminator pattern (`isdb>\s*$`).
5. Triggers success/fail callbacks when patterns match.
6. Automatically retries commands on retry pattern matches.
7. Supports optional trace file logging.

### Breakpoint Synchronization

`BreakpointManager.setBreakpoints()` uses delta detection:
1. Receives desired breakpoints from VS Code.
2. Compares with currently tracked breakpoints (stored in a Map keyed by uppercase file path).
3. Calculates breakpoints to add (new) and remove (old).
4. Executes add/remove operations in parallel via `Q.allSettled()`.
5. Returns verified breakpoints to VS Code.

### Variable Resolution

`VariableParser` performs two-phase variable extraction:
1. **Parse phase**: Extracts potential variable names from debugger output using regex, filtering COBOL reserved words, function calls, and language tokens.
2. **Fetch phase**: Requests each variable's value from the external debugger concurrently.

### Call Stack Resolution (`infostack -a`)

The call stack implementation uses `infostack -a` and parses file/line directly from debugger output.

1. `CobolDebugSession.stackTraceRequest()` calls `DebugInterface.requestCallStack()` only when execution is paused.
2. `ExternalDebugAdapter.requestCallStack()` executes `infostack -a` through `InfoStackCommand`.
3. `InfoStackCommand` parses frames in the format `+ PARAGRAPH [PROGRAM or METHOD of PROGRAM] FILE:LINE`.
4. Parsed frames are reversed to innermost-first order before returning to DAP.
5. If `FILE` is not a full path, the adapter tries to resolve it using fallback source directories (`display -env java.class.path`).
6. `CobolDebugSession` keeps a single in-flight promise to avoid duplicated concurrent stack requests from the UI.

### Debug Adapter Server

`CobolDebugAdapterDescriptorFactory` creates a TCP server on a random port. Each socket connection creates a new `CobolDebugSession` instance running in server mode. The server is lazily initialized and reused across debug sessions.

### REPL Command Dispatch

The debug console supports:
- `br <line> [program] [when condition]` — Set breakpoint at location.
- `br <paragraph> [when condition]` — Set paragraph breakpoint.
- `b0 <program>` — Set breakpoint on first executable line.
- Any other input is sent as a raw command to the external debugger.

## Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@vscode/debugadapter` | 1.56.1 | Debug Adapter Protocol implementation |
| `await-notify` | 1.0.1 | Async notification utility |
| `q` | 1.4.1 | Promise library with `allSettled()` support |

## isdb External Debugger — Command Reference

The external debugger (`isdb`) is a COBOL debugger whose protocol is mapped in `defaultDebugConfigs.json`. Below is the full command reference:

| Command | Description | Usage |
|---------|-------------|-------|
| `b0` | Set breakpoint at start of program | `b0 [-d] progname [when var [op] const]` |
| `break` | Set breakpoint at line or paragraph | `break [-d] line\|paragraph [cobolfile] [when var [op] const]` / `break -l` (list) |
| `clear` | Clear breakpoint at line or paragraph | `clear line\|paragraph [cobol-file]` / `clear -a` (clear all) |
| `continue` | Continue until next breakpoint | — |
| `directory` | Add directory to source search path | `directory dirname` / `directory` (show path) |
| `display` | Display value of variable | `display [-tree] [-x] [-c class[:>method]] [-full] varname` / `display [-full] -env env-name` |
| `down` | View next lower stack frame | — |
| `env` | Print environment variable value | `env [-full] property-name` |
| `exit` | Exit debug session | — |
| `f` | Repeat last find | — |
| `fb` | Find backwards | `fb text` |
| `ff` | Find forwards | `ff text` |
| `ft` | Find from top | `ft text` |
| `gc` | Force garbage collector | — |
| `help` / `?` | Show help | `help [command]` |
| `infostack` | Display call stack information | `infostack -a` |
| `jump` | Jump to line, paragraph, or relative position | `jump line\|paragraph` / `jump -outpar\|-outprog\|-next` |
| `length` | Display length of variable | `length [-c class[:>method]] varname` |
| `let` | Assign new value to variable | `let [-x] [-c class[:>method]] varname = value` / `let -env env-name = value` |
| `line` | Display current line | — |
| `list` | Display source code | `list [fromLine[,toLine]]` / `list -f\|-get\|-set size\|+\|-` |
| `m0` | Set breakpoint at start of method | `m0 [-d] [class.]method[(sig)] [when var [op] const]` |
| `memory` | Print memory information | — |
| `monitor` | Set monitor on variable (stop when changed) | `monitor [-d] [-x] [-c class[:>method]] varname [when [op const]\|always\|never]` / `monitor -l` (list) |
| `next` | Step one line (step OVER calls) | — |
| `offset` | Display offset of variable | `offset [-c class[:>method]] varname` |
| `outpar` | Step out of current paragraph | — |
| `outprog` | Step out of current program back to caller | — |
| `pause` | Pause execution | — |
| `prog` | Continue until next program call | — |
| `quit` | Stop execution | — |
| `readsession` | Load debugger session | `readsession [filename]` |
| `restart` | Restart execution | `restart [arg1 ... argN]` |
| `run` | Start execution | `run [arg1 ... argN]` |
| `step` | Execute next statement (step INTO calls) | — |
| `stoff` | Stop autostep | — |
| `ston` | Start autostep | — |
| `thread` | Choose thread to debug | `thread threadname` / `thread -l` (list) |
| `to` | Continue until given line is reached | `to line-number [file-name]` |
| `troff` | Stop tracing program execution | — |
| `tron` | Start tracing program execution | `tron tracelevel [logfile]` |
| `unmonitor` | Clear monitor on variable | `unmonitor [-c class[:>method]] varname` / `unmonitor -a` (clear all) |
| `up` | View next higher stack frame | — |
| `w0` | First executable line | — |
| `wb` | Last line | — |
| `writesession` | Save debugger session | `writesession [filename]` |
| `wt` | First line | — |

### Notes on Key Commands

- **`display -env`**: Used internally to resolve source paths — `display -env user.dir` returns current working directory, `display -env java.class.path` returns classpath (source directories).
- **`infostack`**: The extension uses `infostack -a`. Output format includes source and line: `+ PARAGRAPH [PROGRAM] FILE:LINE` or `+ PARAGRAPH [METHOD of PROGRAM] FILE:LINE`. Raw output is outermost→innermost and is reversed before sending to DAP.
- **Call stack source lookup**: When `FILE` is not absolute, resolution reuses fallback source directories (`display -env java.class.path`) instead of creating temporary breakpoints.
- **`monitor`**: Condition operators are `=`, `!=`, `<`, `>`, `<=`, `>=`, `always`, `never`.
- **`let -x`**: Assigns value in hexadecimal format.
- **`display -tree`**: Shows variable with all children (group items).

## File Network (Key Relationships)

```
extension.ts
  ├── CobolDebuggerSetup (parameter collection)
  ├── CobolStack (debug position state)
  ├── CobolMonitorController → CobolMonitorModel + CobolMonitorView
  └── Providers: ConfigurationProvider, AdapterDescriptorFactory, ExpressionProvider

CobolDebug.ts (CobolDebugSession)
  ├── ExternalDebugAdapter (DebugInterface)
  │   ├── SyncProcess → NodeProcessProvider → child_process
  │   ├── DebugConfigsProvider → defaultDebugConfigs.json
  │   ├── FallbackDirectoriesFinder (source resolution)
  │   └── 20+ Command classes (DebugCommand<T,K>)
  ├── BreakpointManager → SourceUtils
  ├── VariableParser
  └── DebuggerReplManager → ReplCommand implementations
```
