import { expect } from 'chai';
import 'mocha';
import { DebuggerReplManager } from '../../repl/DebuggerReplManager';
import { ExternalDebugAdapter } from '../../debugProcess/ExternalDebugAdapter';
import { BaseMockProvider } from '../debugProcess/ExternalDebugAdapter.test';
import { CobolBreakpoint } from '../../breakpoint/CobolBreakpoint';
import { ProcessProvider } from '../../debugProcess/ProcessProvider';
import { fail } from 'assert';

describe('REPL console commands', () => {

    it('Checks add breakpoint at line', () => {
        const expected: CobolBreakpoint = { line: 12543, source: 'srim00.cbl', condition: '' };
        new DebuggerReplManager(new TestDebugAdapter(new EmptyProvider()),
            (br: CobolBreakpoint) => validateBreakpoint(expected, br))
            .handleCommand('br 12543 srim00.cbl');
    });

    it('Checks add breakpoint at line with condition', () => {
        const expected: CobolBreakpoint = { line: 12543, source: 'srim00.cbl', condition: 'mk-ccl = 10' };
        new DebuggerReplManager(new TestDebugAdapter(new EmptyProvider()),
            (br: CobolBreakpoint) => validateBreakpoint(expected, br))
            .handleCommand('br 12543 srim00.cbl when mk-ccl = 10');
    });

    it('Checks add breakpoint at paragraph', () => {
        const expected: CobolBreakpoint = { line: 379851, source: 'F:/SIGER/wc/DES/lucas-camargo/src/is-COBOL/debug/SRHPED.CBL', condition: '' };
        new DebuggerReplManager(new TestDebugAdapter(new ParagraphBreakpointProvider()),
            (br: CobolBreakpoint) => validateBreakpoint(expected, br))
            .handleCommand('br srhped-inicio srhped.cbl');
    });

    it('Checks add breakpoint at paragraph with \'break\' command', () => {
        const expected: CobolBreakpoint = { line: 379851, source: 'F:/SIGER/wc/DES/lucas-camargo/src/is-COBOL/debug/SRHPED.CBL', condition: '' };
        new DebuggerReplManager(new TestDebugAdapter(new ParagraphBreakpointProvider()),
            (br: CobolBreakpoint) => validateBreakpoint(expected, br))
            .handleCommand('break srhped-inicio srhped.cbl');
    });

    it('Checks add breakpoint at paragraph with condition', () => {
        const expected: CobolBreakpoint = { line: 379851, source: 'F:/SIGER/wc/DES/lucas-camargo/src/is-COBOL/debug/SRHPED.CBL', condition: 'mk-lrc = myUser' };
        new DebuggerReplManager(new TestDebugAdapter(new ParagraphBreakpointProvider()),
            (br: CobolBreakpoint) => validateBreakpoint(expected, br))
            .handleCommand('br srhped-inicio srhped.cbl when mk-lrc = myUser');
    });

    it('Checks add breakpoint at line without file', () => {
        const expected: CobolBreakpoint = { line: 379851, source: 'F:/SIGER/wc/DES/lucas-camargo/src/is-COBOL/debug/SRHPED.CBL', condition: '' };
        new DebuggerReplManager(new TestDebugAdapter(new ParagraphBreakpointProvider()),
            (br: CobolBreakpoint) => validateBreakpoint(expected, br))
            .handleCommand('br 379851');
    });

    it('Checks add breakpoint at line without file with condition', () => {
        const expected: CobolBreakpoint = { line: 379851, source: 'F:/SIGER/wc/DES/lucas-camargo/src/is-COBOL/debug/SRHPED.CBL', condition: 'mk-cha = xxx' };
        new DebuggerReplManager(new TestDebugAdapter(new ParagraphBreakpointProvider()),
            (br: CobolBreakpoint) => validateBreakpoint(expected, br))
            .handleCommand('br 379851 when mk-cha = xxx');
    });

    it('Checks add breakpoint at paragraph without file', () => {
        const expected: CobolBreakpoint = { line: 379851, source: 'F:/SIGER/wc/DES/lucas-camargo/src/is-COBOL/debug/SRHPED.CBL', condition: '' };
        new DebuggerReplManager(new TestDebugAdapter(new ParagraphBreakpointProvider()),
            (br: CobolBreakpoint) => validateBreakpoint(expected, br))
            .handleCommand('br srhped-inicio');
    });

    it('Checks add breakpoint at paragraph without file with condition', () => {
        const expected: CobolBreakpoint = { line: 379851, source: 'F:/SIGER/wc/DES/lucas-camargo/src/is-COBOL/debug/SRHPED.CBL', condition: 'mk-cha = xxx' };
        new DebuggerReplManager(new TestDebugAdapter(new ParagraphBreakpointProvider()),
            (br: CobolBreakpoint) => validateBreakpoint(expected, br))
            .handleCommand('br srhped-inicio when mk-cha = xxx');
    });

    it('Checks add breakpoint on first line of program', () => {
        const expected: CobolBreakpoint = { line: 374904, source: 'F:/SIGER/wc/DES/cassel/src/is-COBOL/debug/SRHPED.CBL', condition: '' };
        new DebuggerReplManager(new TestDebugAdapter(new FirstLineBreakProvider()),
            (br: CobolBreakpoint) => validateBreakpoint(expected, br))
            .handleCommand('b0 srhped');
    });

    it('Checks add breakpoint on first line of program, with multiple programs', () => {
        const expected: CobolBreakpoint = { line: 374904, source: 'F:/SIGER/wc/DES/cassel/src/is-COBOL/debug/SRHPED.CBL', condition: '' };
        new DebuggerReplManager(new TestDebugAdapter(new FirstLineBreakMultipleProgramsProvider()),
            (br: CobolBreakpoint) => validateBreakpoint(expected, br))
            .handleCommand('b0 srhped');
    });

    it('Checks add breakpoint on first line of program with extension, with multiple programs', () => {
        const expected: CobolBreakpoint = { line: 374904, source: 'F:/SIGER/wc/DES/cassel/src/is-COBOL/debug/SRHPED.CBL', condition: '' };
        new DebuggerReplManager(new TestDebugAdapter(new FirstLineBreakMultipleProgramsProvider()),
            (br: CobolBreakpoint) => validateBreakpoint(expected, br))
            .handleCommand('b0 srhped.cbl');
    });

    it('Checks add breakpoint on first line of inexisting program', () => {
        new DebuggerReplManager(new TestDebugAdapter(new FirstLineBreakInexistingProgramProvider()),
            () => fail('Should not invoke this callback'))
            .handleCommand('b0 sxsaxsax');
    });

    it('Checks add breakpoint on first line of different program', () => {
        new DebuggerReplManager(new TestDebugAdapter(new FirstLineBreakDifferentProgramProvider()),
            () => fail('Should not invoke this callback'))
            .handleCommand('b0 srhped');
    });

});

function validateBreakpoint(expected: CobolBreakpoint, bp: CobolBreakpoint): void {
    expect(expected.line).to.equal(bp.line);
    expect(expected.source).to.equal(bp.source);
    expect(expected.condition).to.equal(bp.condition);
}

/**
 * Class to simplify construction of tests
 */
class TestDebugAdapter extends ExternalDebugAdapter {

    constructor(processProvider: ProcessProvider) {
        super("", () => { }, "", "", processProvider);
    }

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

enum Stage { AddBreakOnLocation, AddBreakOnFirstLine, ListBreakpoont };

class ParagraphBreakpointProvider extends BaseMockProvider {

    private stage: Stage = Stage.AddBreakOnLocation;

    getOutputContent(): string {
        if (this.stage === Stage.AddBreakOnLocation) {
            this.stage = Stage.ListBreakpoont;
            return ' \n' +
                ' + set breakpoint in paragraph srhped-inicio, file F:/SIGER/wc/DES/lucas-camargo/src/is-COBOL/debug/SRHPED.CBL\n' +
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

//------- Classes for testing breakpoint on first executable line of the specified program

class FirstLineBreakProvider extends BaseMockProvider {

    private stage: Stage = Stage.AddBreakOnFirstLine;

    getOutputContent(): string {
        if (this.stage === Stage.AddBreakOnFirstLine) {
            this.stage = Stage.ListBreakpoont;
            return ' \n' +
                ' + set breakpoint at the first line of program \'srhped\'\n' +
                'isdb>';
        }
        if (this.stage === Stage.ListBreakpoont) {
            this.stage = Stage.AddBreakOnLocation;
            return '[line: 374904, file: SRHPED.CBL]\n' +
                'isdb>';
        }
        return ' \n' +
            ' + set breakpoint at line 374904, file F:/SIGER/wc/DES/cassel/src/is-COBOL/debug/SRHPED.CBL\n' +
            'isdb>';
    }

}

class FirstLineBreakMultipleProgramsProvider extends BaseMockProvider {

    private stage: Stage = Stage.AddBreakOnFirstLine;

    getOutputContent(): string {
        if (this.stage === Stage.AddBreakOnFirstLine) {
            this.stage = Stage.ListBreakpoont;
            return ' \n' +
                ' + set breakpoint at the first line of program \'srhped\'\n' +
                'isdb>';
        }
        if (this.stage === Stage.ListBreakpoont) {
            this.stage = Stage.AddBreakOnLocation;
            return '[line: 390019, file: srhped.cbl]\n' +
                '[line: 57368, file: SRIM00.CBL]\n' +
                '[dummy: 83207, dummy: ctb005.cbl]\n' +
                '[line: 57376, file: SRIM00.CBL, index: 0]\n' +
                '[line: 374904, file: SRHPED.CBL]\n' +
                'isdb>';
        }
        return ' \n' +
            ' + set breakpoint at line 374904, file F:/SIGER/wc/DES/cassel/src/is-COBOL/debug/SRHPED.CBL\n' +
            'isdb>';
    }

}

class FirstLineBreakInexistingProgramProvider extends BaseMockProvider {

    private called: boolean = false;

    getOutputContent(): string {
        if (this.called) {
            fail('Should not call more than once');
        }
        this.called = true;
        return ' \n' +
            ' - no such program \'sxsaxsax\'\n' +
            'isdb>';
    }

}

class FirstLineBreakDifferentProgramProvider extends BaseMockProvider {

    private stage: Stage = Stage.AddBreakOnFirstLine;

    getOutputContent(): string {
        if (this.stage === Stage.AddBreakOnFirstLine) {
            this.stage = Stage.ListBreakpoont;
            return ' \n' +
                ' + set breakpoint at the first line of program \'srhped\'\n' +
                'isdb>';
        }
        if (this.stage === Stage.ListBreakpoont) {
            this.stage = Stage.AddBreakOnLocation;
            return '[line: 390019, file: srhped.cbl]\n' +
                '[line: 57368, file: SRIM00.CBL]\n' +
                '[dummy: 83207, dummy: ctb005.cbl]\n' +
                '[line: 57376, file: SRIM00.CBL, index: 0]\n' +
                '[line: 374904, file: ctb005.CBL]\n' +
                'isdb>';
        }
        fail('Should not call three times');
        return "";
    }

}
