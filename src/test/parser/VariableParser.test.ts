import { expect } from 'chai';
import 'mocha';
import { VariableParser } from '../../parser/VariableParser';
import { DebugInterface } from '../../debugProcess/DebugInterface';
import { DebugPosition } from '../../debugProcess/DebugPosition';
import { CobolBreakpoint } from '../../breakpoint/CobolBreakpoint';
import { CobolMonitor } from '../../monitor/CobolMonitor';
import { CobolParagraphBreakpoint } from '../../breakpoint/CobolParagraphBreakpoint';

// Mock DebugInterface
class MockDebugInterface implements DebugInterface {
    requestVariableValue(variableName: string): Promise<string> {
        return Promise.resolve('mockedValue_' + variableName);
    }
    start(): Promise<DebugPosition> { return Promise.resolve({} as DebugPosition); }
    stepIn(): Promise<DebugPosition> { return Promise.resolve({} as DebugPosition); }
    stepOut(): Promise<DebugPosition> { return Promise.resolve({} as DebugPosition); }
    stepOutProgram(): Promise<DebugPosition> { return Promise.resolve({} as DebugPosition); }
    stepOver(): Promise<DebugPosition> { return Promise.resolve({} as DebugPosition); }
    continue(): Promise<DebugPosition> { return Promise.resolve({} as DebugPosition); }
    pause(): Promise<void> { return Promise.resolve(); }
    stop(): Promise<void> { return Promise.resolve(); }
    setBreakOnFirstLine(): Promise<boolean> { return Promise.resolve(true); }
    setBreakOnLocation(): Promise<boolean> { return Promise.resolve(true); }
    removeBreakpoint(_breakpoint: CobolBreakpoint): Promise<boolean> { return Promise.resolve(true); }
    listBreakpoints(): Promise<CobolBreakpoint[]> { return Promise.resolve([]); }
    changeVariableValue(_variable: string, _newValue: string): Promise<boolean> { return Promise.resolve(true); }
    monitorVariable(): Promise<void> { return Promise.resolve(); }
    unmonitorVariable(): Promise<void> { return Promise.resolve(); }
    unmonitorAllVariables(): Promise<void> { return Promise.resolve(); }
    requestAvailableSourceDirectories(): Promise<string[]> { return Promise.resolve([]); }
    runToNextProgram(): Promise<DebugPosition> { return Promise.resolve({} as DebugPosition); }
    next(): Promise<DebugPosition> { return Promise.resolve({} as DebugPosition); }
    addMonitor(_monitor: CobolMonitor): Promise<boolean> { return Promise.resolve(true); }
    removeMonitor(_variable: string): Promise<boolean> { return Promise.resolve(true); }
    removeAllMonitors(): Promise<boolean> { return Promise.resolve(true); }
    addBreakpoint(_breakpoint: CobolBreakpoint): Promise<string | undefined> { return Promise.resolve(undefined); }
    addParagraphBreakpoint(_breakpoint: CobolParagraphBreakpoint): Promise<string | undefined> { return Promise.resolve(undefined); }
    addBreakpointOnFirstLine(_program: string): Promise<boolean> { return Promise.resolve(true); }
    sendRawCommand(_cmd: string): Promise<string> { return Promise.resolve('ok'); }
    onOutput() { }
    onStopped() { }
    onContinued() { }
    onTerminated() { }
}

describe('VariableParser', () => {
    let parser: VariableParser;
    let mockDebug: MockDebugInterface;

    beforeEach(() => {
        mockDebug = new MockDebugInterface();
        parser = new VariableParser(mockDebug);
    });

    it('should extract simple subscripted variables', async () => {
        const output = `isdb>
 line=10 file=TEST.CBL
   MOVE 100 TO W-VAR(1) W-VAR(2) W-VAR(3)`;

        const variables = await parser.parse(output);
        const names = variables.map(v => v.name);

        expect(names).to.deep.equal([
            'W-VAR(1)',
            'W-VAR(2)',
            'W-VAR(3)'
        ]);
    });

    it('should extract variables with complex subscripts', async () => {
        const output = `isdb>
 line=20 file=TEST.CBL
   COMPUTE W-VAR(1:10) = W-VAR(W-IND:10) + W-VAR(W-IND(1):10)`;

        const variables = await parser.parse(output);
        const names = variables.map(v => v.name);

        expect(names).to.deep.equal([
            'W-VAR(1:10)',
            'W-VAR(W-IND:10)',
            'W-VAR',
            'W-IND(1)'
        ]);
    });

    it('should extract nested subscripted variables', async () => {
        const output = `isdb>
 line=30 file=TEST.CBL
   IF W-VAR(W-IND(W-OCO):10) > W-VAR(1,1)`;

        const variables = await parser.parse(output);
        const names = variables.map(v => v.name);

        expect(names).to.deep.equal([
            'W-VAR',
            'W-IND(W-OCO)',
            'W-VAR(1,1)'
        ]);
    });

    it('should extract mixed variables with various subscript formats', async () => {
        const output = `isdb>
 line=40 file=TEST.CBL
   PERFORM VARYING W-IND FROM 1 BY 1 UNTIL W-IND > 10
       ADD W-VAR(W-IND, 1) TO TOTAL-ITEM`;

        const variables = await parser.parse(output);
        const names = variables.map(v => v.name);

        expect(names).to.deep.equal([
            'W-IND',
            'W-IND',
            'W-VAR(W-IND, 1)',
            'TOTAL-ITEM'
        ]);
    });

    it('should handle variables with special characters', async () => {
        const output = `isdb>
 line=50 file=TEST.CBL
   MOVE WS-Élément TO WS-Âccentué(1)`;

        const variables = await parser.parse(output);
        const names = variables.map(v => v.name);

        expect(names).to.deep.equal([
            'WS-Élément',
            'WS-Âccentué(1)'
        ]);
    });

    it('should ignore language keywords and focus on variables', async () => {
        const output = `isdb>
 line=60 file=TEST.CBL
   PERFORM PARA-1 THRU PARA-1-EXIT
       VARYING W-ÍNDICE FROM 1 BY 1
       UNTIL W-ÍNDICE > 20`;

        const variables = await parser.parse(output);
        const names = variables.map(v => v.name);

        expect(names).to.deep.equal([
            'PARA-1',
            'PARA-1-EXIT',
            'W-ÍNDICE',
            'W-ÍNDICE'
        ]);
    });

    it('should handle complex real-world example', async () => {
        const output = `isdb>
 line=94 file=F:/SIGER/25.20a/src/isCOBOL/debug/TURECISC.CBL
   MOVE SRecursosIsCobol:>indiceInlineLacos
        TO W-RESULTADO(W-INDICE(1):10, W-INDICE(2):10)`;

        const variables = await parser.parse(output);
        const names = variables.map(v => v.name);

        expect(names).to.deep.equal([
			'SRecursosIsCobol',
            'W-RESULTADO',
            'W-INDICE(1)',
            'W-INDICE(2)'
        ]);
    });
});
