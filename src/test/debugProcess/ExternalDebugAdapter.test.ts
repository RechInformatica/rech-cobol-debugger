import { expect } from 'chai';
import 'mocha';
import { ExternalDebugAdapter } from '../../debugProcess/ExternalDebugAdapter';
import { ProcessProvider } from '../../debugProcess/ProcessProvider';
import { DebugPosition } from '../../debugProcess/DebugPosition';

describe('External debug adapter', () => {

    it('Hits breakpoint on continue', async () => {
        const expected: DebugPosition = { file: 'F:/SIGER/wc/DES/lucas-camargo/src/isCOBOL/debug/PDV201.CBL', line: 75151, output: 'dummy' };
        const adapter = new ExternalDebugAdapter("dummyCommandLine", () => { }, new HitBreakpointProvider());
        const result = await adapter.continue();
        expect(expected.file).to.equal(result.file);
        expect(expected.line).to.equal(result.line);
    });

    it('Add breakpoint', async () => {
        const expected = 'F:/SIGER/20.10a/src/is-COBOL/debug/SRIM00.CBL';
        const adapter = new ExternalDebugAdapter("dummyCommandLine", () => { }, new AddBreakpointProvider());
        const result = await adapter.addBreakpoint({ line: 55682, source: 'SRIM00.CBL' })
        expect(expected).to.equal(result);
    });

    it('Unmonitor with success', async () => {
        const adapter = new ExternalDebugAdapter("dummyCommandLine", () => { }, new UnmonitorSuccessProvider());
        const result = await adapter.removeMonitor('w-dummy-var');
        expect(true).to.equal(result);
    });

    it('Unmonitor with failure', async () => {
        const adapter = new ExternalDebugAdapter("dummyCommandLine", () => { }, new UnmonitorFailureProvider());
        const result = await adapter.removeMonitor('w-dummy-var');
        expect(false).to.equal(result);
    });

});

/**
 * Base class for mocks
 */
abstract class BaseMockProvider implements ProcessProvider {

    private stdOutCallback: (chunk: string) => void = () => { };

    exec(_command: string, _encoding: string): void { }

    write(_command: string): void {
        this.stdOutCallback(this.getOutputContent());
    }

    onStdOut(callback: (chunk: string) => void): void {
        this.stdOutCallback = callback;
    }

    onStdErr(_callback: (chunk: string) => void): void { }

    abstract getOutputContent(): string;

}

class HitBreakpointProvider extends BaseMockProvider {

    getOutputContent(): string {
        return ' \n' +
            ' + hit breakpoint in paragraph PCPR-CONFIGURACAO, file PDV201.CBL\n' +
            ' line=75151 file=F:/SIGER/wc/DES/lucas-camargo/src/isCOBOL/debug/PDV201.CBL\n' +
            '         pcpr-configuracao.                                                                                                *>  107606     780\n' +
            'isdb>';
    }

}

class AddBreakpointProvider extends BaseMockProvider {

    getOutputContent(): string {
        return ' \n' +
            ' + set breakpoint at line 55682, file F:/SIGER/20.10a/src/is-COBOL/debug/SRIM00.CBL\n' +
            'isdb>';
    }

}

class UnmonitorSuccessProvider extends BaseMockProvider {

    getOutputContent(): string {
        return ' \n' +
            ' + clear monitor on \'w-dummy-var\'\n' +
            'isdb>';
    }

}

class UnmonitorFailureProvider extends BaseMockProvider {

    getOutputContent(): string {
        return ' \n' +
            ' - not found monitor \'w-dummy-var\'\n' +
            'isdb>';
    }

}

