import { expect } from 'chai';
import 'mocha';
import { CobolBreakpoint } from '../../breakpoint/CobolBreakpoint';
import { ListBreakpointsCommand } from '../../debugProcess/ListBreakpointsCommand';
import { ICommand } from '../../debugProcess/DebugConfigs';

const COMMAND: ICommand = {
    name: 'break -l',
    successRegularExpression: '\\[line:\\s+(?<linenumber>[0-9]+)\\,\\s+file:\\s+(?<path>[\\w\\.]+).*\\]'
}

describe('List breakpoints command', () => {

    it('List with 5 breakpoints', () => {
        const output =
            '[line: 83207, file: ctb005.cbl]\n' +
            '[line: 390019, file: srhped.cbl]\n' +
            '[line: 57368, file: SRIM00.CBL]\n' +
            '[line: 57376, file: SRIM00.CBL]\n' +
            '[line: 379851, file: srhgnf.cbl, index: 0]';
        const expected: CobolBreakpoint[] = [
            {
                line: 83207,
                source: 'ctb005.cbl'
            },
            {
                line: 390019,
                source: 'srhped.cbl'
            },
            {
                line: 57368,
                source: 'SRIM00.CBL'
            },
            {
                line: 57376,
                source: 'SRIM00.CBL'
            },
            {
                line: 379851,
                source: 'srhgnf.cbl'
            }
        ];
        const result = new ListBreakpointsCommand(COMMAND).validateOutput(output);
        expect(expected.length).to.equal(result.length);
        for (let i = 0; i < result.length; i++) {
            expect(expected[i].line).to.equal(result[i].line);
            expect(expected[i].source).to.equal(result[i].source);
        }
    });

    it('List with 4 valid breakpoints', () => {
        const output =
            '[line: 390019, file: srhped.cbl]\n' +
            '[line: 57368, file: SRIM00.CBL]\n' +
            '[dummy: 83207, dummy: ctb005.cbl]\n' +
            '[line: 57376, file: SRIM00.CBL]\n' +
            '[line: 379851, file: srhgnf.cbl, index: 0]';
        const expected: CobolBreakpoint[] = [
            {
                line: 390019,
                source: 'srhped.cbl'
            },
            {
                line: 57368,
                source: 'SRIM00.CBL'
            },
            {
                line: 57376,
                source: 'SRIM00.CBL'
            },
            {
                line: 379851,
                source: 'srhgnf.cbl'
            }
        ];
        const result = new ListBreakpointsCommand(COMMAND).validateOutput(output);
        expect(expected.length).to.equal(result.length);
        for (let i = 0; i < result.length; i++) {
            expect(expected[i].line).to.equal(result[i].line);
            expect(expected[i].source).to.equal(result[i].source);
        }
    });

    it('List with 4 valid breakpoints in reverse order', () => {
        const reverseOrderCommand: ICommand = {
            name: 'break -l',
            successRegularExpression: '\\[file:\\s+(?<path>[\\w\\.]+)\\,\\s+line:\\s+(?<linenumber>[0-9]+).*\\]'
        }
        const output =
            '[file: srhped.cbl, line: 390019]\n' +
            '[file: SRIM00.CBL, line: 57368]\n' +
            '[dummy: 83207, dummy: ctb005.cbl]\n' +
            '[file: SRIM00.CBL, line: 57376]\n' +
            '[file: srhgnf.cbl, line: 379851, index: 0]';
        const expected: CobolBreakpoint[] = [
            {
                line: 390019,
                source: 'srhped.cbl'
            },
            {
                line: 57368,
                source: 'SRIM00.CBL'
            },
            {
                line: 57376,
                source: 'SRIM00.CBL'
            },
            {
                line: 379851,
                source: 'srhgnf.cbl'
            }
        ];
        const result = new ListBreakpointsCommand(reverseOrderCommand).validateOutput(output);
        expect(expected.length).to.equal(result.length);
        for (let i = 0; i < result.length; i++) {
            expect(expected[i].line).to.equal(result[i].line);
            expect(expected[i].source).to.equal(result[i].source);
        }
    });

    it('List with empty output', () => {
        const output = '   ';
        const result = new ListBreakpointsCommand(COMMAND).validateOutput(output);
        expect(0).to.equal(result.length);
    });


});
