import { expect } from 'chai';
import 'mocha';
import { AddBreakpointCommand } from '../../debugProcess/AddBreakpointCommand';
import { ICommand } from '../../debugProcess/DebugConfigs';

const COMMAND: ICommand = {
    name: 'break',
    successRegularExpression: 'set\\sbreakpoint\\s(at|in)\\s(line|paragraph)\\s.*\\,\\sfile\\s(?<path>[\\w\\.:\\\/ \\-]+)',
    extraRegularExpressions: [
        'no\\sverb\\s(at|in)\\s(line|paragraph)\\s.*\\,\\sfile\\s.*',
        'no\\s+such\\s+file',
        'no\\s+such\\s+paragraph',
        'syntax\\s+error',
        'unexpected\\s+error\\s+usage'
    ]
}

describe('Add breakpoint command', () => {

    it('Checks add breakpoint at line with full name without hyphen', () => {
        const output =
            ' \n' +
            ' + set breakpoint at line 55682, file F:/SIGER/20.10a/src/isCOBOL/debug/SRIM00.CBL\n' +
            'isdb>';
        const expected: string = 'F:/SIGER/20.10a/src/isCOBOL/debug/SRIM00.CBL';
        const result = new AddBreakpointCommand(COMMAND).validateOutput(output);
        expect(expected).to.equal(result);
    });

    it('Checks add breakpoint at line with full name with hyphen', () => {
        const output =
            ' \n' +
            ' + set breakpoint at line 55682, file F:/SIGER/wc/DES/lucas-camargo/src/isCOBOL/debug/SRIMAP.CBL\n' +
            'isdb>';
        const expected: string = 'F:/SIGER/wc/DES/lucas-camargo/src/isCOBOL/debug/SRIMAP.CBL';
        const result = new AddBreakpointCommand(COMMAND).validateOutput(output);
        expect(expected).to.equal(result);
    });

    it('Checks add breakpoint in paragraph with full name without hyphen', () => {
        const output =
            ' \n' +
            ' set breakpoint in paragraph pmap-processa-movimentos-estoque-op, file F:/SIGER/20.10a/src/isCOBOL/debug/SRIM00.CBL\n' +
            'isdb>';
        const expected: string = 'F:/SIGER/20.10a/src/isCOBOL/debug/SRIM00.CBL';
        const result = new AddBreakpointCommand(COMMAND).validateOutput(output);
        expect(expected).to.equal(result);
    });

    it('Checks add breakpoint in paragraph with full name with hyphen', () => {
        const output =
            ' \n' +
            ' set breakpoint in paragraph pmap-processa-movimentos-estoque-op, file F:/SIGER/wc/DES/lucas-camargo/src/isCOBOL/debug/SRIMAP.CBL\n' +
            'isdb>';
        const expected: string = 'F:/SIGER/wc/DES/lucas-camargo/src/isCOBOL/debug/SRIMAP.CBL';
        const result = new AddBreakpointCommand(COMMAND).validateOutput(output);
        expect(expected).to.equal(result);
    });

    it('Checks no such paragraph', () => {
        const output =
            ' \n' +
            ' no   such  paragraph\n' +
            'isdb>';
        const result = new AddBreakpointCommand(COMMAND).validateOutput(output);
        expect(undefined).to.equal(result);
    });

    it('Checks no verb at', () => {
        const output =
            ' \n' +
            ' - no verb at line 55684, file F:/SIGER/20.10a/src/isCOBOL/debug/SRIM00.CBL\n' +
            'isdb>';
        const result = new AddBreakpointCommand(COMMAND).validateOutput(output);
        expect(undefined).to.equal(result);
    });

});

