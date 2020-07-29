import { expect } from 'chai';
import 'mocha';
import { DebugPositionCommand } from '../../debugProcess/DebugPositionCommand';
import { DebugPosition } from '../../debugProcess/DebugPosition';
import { ICommand } from '../../debugProcess/DebugConfigs';

const COMMAND: ICommand = {
    name: 'line',
    successRegularExpression: '^\\+*\\s+line=(\\d+)\\s+file=([\\w\\.:\\\/ \\-]+)'
}

describe('Debug position command', () => {

    it('Checks file with path', () => {
        const output =
            ' line=55680 file=F:/SIGER/20.10a/src/isCOBOL/debug/SRIM00.CBL\n' +
            '              if sig-debug-sim                                                                                              *>   61570      44';
        const expected: DebugPosition = {file: 'F:/SIGER/20.10a/src/isCOBOL/debug/SRIM00.CBL', line: 55680, output: output};
        const result = new DebugPositionCommand(COMMAND).validateOutput(output);
        expect(expected.file).to.equal(result!.file);
        expect(expected.line).to.equal(result!.line);
        expect(expected.output).to.equal(result!.output);
    });

    it('Checks file without path', () => {
        const output =
            ' line=55680 file=SRIM00.CBL\n' +
            '              if sig-debug-sim                                                                                              *>   61570      44';
        const expected: DebugPosition = {file: 'SRIM00.CBL', line: 55680, output: output};
        const result = new DebugPositionCommand(COMMAND).validateOutput(output);
        expect(expected.file).to.equal(result!.file);
        expect(expected.line).to.equal(result!.line);
        expect(expected.output).to.equal(result!.output);
    });

    it('Checks ignoring monitor output', () => {
        const output =
            '+ at  line=55678 file=SRIM00.CBL\n' +
            '            accept                 w-sig-debug from environment-value.                                                    *>   61568      42\n' +
            '+ changed variables: \n' +
            ' W-SIG-DEBUG [SRIM00] = S\n' +
            ' line=55680 file=F:/SIGER/20.10a/src/isCOBOL/debug/SRIM00.CBL\n' +
            '            if sig-debug-sim                                                                                              *>   61570      44';
        const expected: DebugPosition = {file: 'F:/SIGER/20.10a/src/isCOBOL/debug/SRIM00.CBL', line: 55680, output: output};
        const result = new DebugPositionCommand(COMMAND).validateOutput(output);
        expect(expected.file).to.equal(result!.file);
        expect(expected.line).to.equal(result!.line);
        expect(expected.output).to.equal(result!.output);
    });

    it('Checks invalid output output', () => {
        const output =
            '+ at  line=55678 file=SRIM00.CBL\n' +
            '            accept                 w-sig-debug from environment-value.                                                    *>   61568      42\n' +
            '+ changed variables: \n' +
            ' W-SIG-DEBUG [SRIM00] = S\n' +
            ' dummy message instead of line and file\n' +
            '            if sig-debug-sim                                                                                              *>   61570      44';
        const result = new DebugPositionCommand(COMMAND).validateOutput(output);
        expect(undefined).to.equal(result);
    });

});
