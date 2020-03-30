import { expect } from 'chai';
import 'mocha';
import { DebuggerReplManager } from '../DebuggerReplManager';
import { ExternalDebugAdapter } from '../debugProcess/ExternalDebugAdapter';
import { BaseMockProvider } from './debugProcess/ExternalDebugAdapter.test';
import { CobolBreakpoint } from '../breakpoint/CobolBreakpoint';

describe('REPL console commands', () => {

    it('Checks add breakpoint at line', () => {
        const expected: CobolBreakpoint = { line: 12543, source: 'srim00.cbl', condition: '' };
        new DebuggerReplManager(new ExternalDebugAdapter("", () => { }, new EmptyProvider()),
            (br: CobolBreakpoint) => validateBreakpoint(expected, br))
            .handleCommand('br 12543 srim00.cbl');
    });

    it('Checks add breakpoint at line with condition', () => {
        const expected: CobolBreakpoint = { line: 12543, source: 'srim00.cbl', condition: 'mk-ccl = 10' };
        new DebuggerReplManager(new ExternalDebugAdapter("", () => { }, new EmptyProvider()),
            (br: CobolBreakpoint) => validateBreakpoint(expected, br))
            .handleCommand('br 12543 srim00.cbl when mk-ccl = 10');
    });

    it('Checks add breakpoint at paragraph', () => {
        const expected: CobolBreakpoint = { line: 379851, source: 'F:/SIGER/wc/DES/lucas-camargo/src/is-COBOL/debug/SRHPED.CBL', condition: '' };
        new DebuggerReplManager(new ExternalDebugAdapter("", () => { }, new ParagraphBreakpointProvider()),
            (br: CobolBreakpoint) => validateBreakpoint(expected, br))
            .handleCommand('br srhped-inicio srhped.cbl');
    });

    it('Checks add breakpoint at paragraph with condition', () => {
        const expected: CobolBreakpoint = { line: 379851, source: 'F:/SIGER/wc/DES/lucas-camargo/src/is-COBOL/debug/SRHPED.CBL', condition: 'mk-lrc = myUser' };
        new DebuggerReplManager(new ExternalDebugAdapter("", () => { }, new ParagraphBreakpointProvider()),
            (br: CobolBreakpoint) => validateBreakpoint(expected, br))
            .handleCommand('br srhped-inicio srhped.cbl when mk-lrc = myUser');
    });

    it('Checks add breakpoint at line without file', () => {
        const expected: CobolBreakpoint = { line: 379851, source: 'F:/SIGER/wc/DES/lucas-camargo/src/is-COBOL/debug/SRHPED.CBL', condition: '' };
        new DebuggerReplManager(new ExternalDebugAdapter("", () => { }, new ParagraphBreakpointProvider()),
            (br: CobolBreakpoint) => validateBreakpoint(expected, br))
            .handleCommand('br 379851');
    });

    it('Checks add breakpoint at line without file with condition', () => {
        const expected: CobolBreakpoint = { line: 379851, source: 'F:/SIGER/wc/DES/lucas-camargo/src/is-COBOL/debug/SRHPED.CBL', condition: 'mk-cha = xxx' };
        new DebuggerReplManager(new ExternalDebugAdapter("", () => { }, new ParagraphBreakpointProvider()),
            (br: CobolBreakpoint) => validateBreakpoint(expected, br))
            .handleCommand('br 379851 when mk-cha = xxx');
    });

    it('Checks add breakpoint at paragraph without file', () => {
        const expected: CobolBreakpoint = { line: 379851, source: 'F:/SIGER/wc/DES/lucas-camargo/src/is-COBOL/debug/SRHPED.CBL', condition: '' };
        new DebuggerReplManager(new ExternalDebugAdapter("", () => { }, new ParagraphBreakpointProvider()),
            (br: CobolBreakpoint) => validateBreakpoint(expected, br))
            .handleCommand('br srhped-inicio');
    });

    it('Checks add breakpoint at paragraph without file with condition', () => {
        const expected: CobolBreakpoint = { line: 379851, source: 'F:/SIGER/wc/DES/lucas-camargo/src/is-COBOL/debug/SRHPED.CBL', condition: 'mk-cha = xxx' };
        new DebuggerReplManager(new ExternalDebugAdapter("", () => { }, new ParagraphBreakpointProvider()),
            (br: CobolBreakpoint) => validateBreakpoint(expected, br))
            .handleCommand('br srhped-inicio when mk-cha = xxx');
    });

});

function validateBreakpoint(expected: CobolBreakpoint, bp: CobolBreakpoint): void {
    expect(expected.line).to.equal(bp.line);
    expect(expected.source).to.equal(bp.source);
    expect(expected.condition).to.equal(bp.condition);
}

//------- Empty provider when no command is fired to external debugger

class EmptyProvider extends BaseMockProvider {

    write(command: string): void {
        super.write(command);
    }

    getOutputContent(): string {
        return "";
    }

}

//------- Classes for testing breakpoints on paragraphs, since we need to fire a 'list' command to detect the line where
//------- the breakpoint has been set

enum Stage { AddBreakpoint, ListBreakpoont };

class ParagraphBreakpointProvider extends BaseMockProvider {

    private stage: Stage = Stage.AddBreakpoint;

    getOutputContent(): string {
        if (this.stage === Stage.AddBreakpoint) {
            this.stage = Stage.ListBreakpoont;
            return ' \n' +
                ' set breakpoint in paragraph srhped-inicio, file F:/SIGER/wc/DES/lucas-camargo/src/is-COBOL/debug/SRHPED.CBL\n' +
                'isdb>';
        }
        return '[line: 390019, file: srhped.cbl]\n' +
            '[line: 57368, file: SRIM00.CBL]\n' +
            '[dummy: 83207, dummy: ctb005.cbl]\n' +
            '[line: 57376, file: SRIM00.CBL]\n' +
            '[line: 379851, file: srhped.cbl, index: 0]\n' +
            'isdb>';
        }

}
