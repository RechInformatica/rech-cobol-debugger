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

    it('Hits breakpoint on step in', async () => {
        const expected: DebugPosition = { file: 'F:/SIGER/wc/DES/lucas-camargo/src/isCOBOL/debug/PDV201.CBL', line: 75151, output: 'dummy' };
        const adapter = new ExternalDebugAdapter("dummyCommandLine", () => { }, new HitBreakpointProvider());
        const result = await adapter.stepIn();
        expect(expected.file).to.equal(result.file);
        expect(expected.line).to.equal(result.line);
    });

    it('Hits breakpoint on step out', async () => {
        const expected: DebugPosition = { file: 'F:/SIGER/wc/DES/lucas-camargo/src/isCOBOL/debug/PDV201.CBL', line: 75151, output: 'dummy' };
        const adapter = new ExternalDebugAdapter("dummyCommandLine", () => { }, new HitBreakpointProvider());
        const result = await adapter.stepOut();
        expect(expected.file).to.equal(result.file);
        expect(expected.line).to.equal(result.line);
    });

    it('Hits breakpoint on step out program', async () => {
        const expected: DebugPosition = { file: 'F:/SIGER/wc/DES/lucas-camargo/src/isCOBOL/debug/PDV201.CBL', line: 75151, output: 'dummy' };
        const adapter = new ExternalDebugAdapter("dummyCommandLine", () => { }, new HitBreakpointProvider());
        const result = await adapter.stepOutProgram();
        expect(expected.file).to.equal(result.file);
        expect(expected.line).to.equal(result.line);
    });

    it('Hits breakpoint on run to next program', async () => {
        const expected: DebugPosition = { file: 'F:/SIGER/wc/DES/lucas-camargo/src/isCOBOL/debug/PDV201.CBL', line: 75151, output: 'dummy' };
        const adapter = new ExternalDebugAdapter("dummyCommandLine", () => { }, new HitBreakpointProvider());
        const result = await adapter.runToNextProgram();
        expect(expected.file).to.equal(result.file);
        expect(expected.line).to.equal(result.line);
    });

    it('Hits breakpoint on next', async () => {
        const expected: DebugPosition = { file: 'F:/SIGER/wc/DES/lucas-camargo/src/isCOBOL/debug/PDV201.CBL', line: 75151, output: 'dummy' };
        const adapter = new ExternalDebugAdapter("dummyCommandLine", () => { }, new HitBreakpointProvider());
        const result = await adapter.next();
        expect(expected.file).to.equal(result.file);
        expect(expected.line).to.equal(result.line);
    });

    it('Adds breakpoint', async () => {
        const expected = 'F:/SIGER/20.10a/src/is-COBOL/debug/SRIM00.CBL';
        const adapter = new ExternalDebugAdapter("dummyCommandLine", () => { }, new AddBreakpointProvider());
        const result = await adapter.addBreakpoint({ line: 55682, source: 'SRIM00.CBL' })
        expect(expected).to.equal(result);
    });

    it('Removes breakpoint', async () => {
        const adapter = new ExternalDebugAdapter("dummyCommandLine", () => { }, new RemoveBreakpointProvider());
        const result = await adapter.removeBreakpoint({ line: 55682, source: 'F:/SIGER/20.10a/src/isCOBOL/debug/SRIM00.CBL' })
        expect(true).to.equal(result);
    });

    it('Unmonitors with success', async () => {
        const adapter = new ExternalDebugAdapter("dummyCommandLine", () => { }, new UnmonitorSuccessProvider());
        const result = await adapter.removeMonitor('w-dummy-var');
        expect(true).to.equal(result);
    });

    it('Unmonitors with failure', async () => {
        const adapter = new ExternalDebugAdapter("dummyCommandLine", () => { }, new UnmonitorFailureProvider());
        const result = await adapter.removeMonitor('w-dummy-var');
        expect(false).to.equal(result);
    });

    it('Monitors variable', async () => {
        const adapter = new ExternalDebugAdapter("dummyCommandLine", () => { }, new MonitorProvider());
        const result = await adapter.addMonitor({ variable: 'w-dummy-var', condition: 'always' });
        expect(true).to.equal(result);
    });

    it('Changes variable value', async () => {
        const adapter = new ExternalDebugAdapter("dummyCommandLine", () => { }, new ChangeValueProvider());
        const result = await adapter.changeVariableValue('w-dummy-var', 'L');
        expect(true).to.equal(result);
    });

    it('Changes variable value in hexadecimal', async () => {
        const adapter = new ExternalDebugAdapter("dummyCommandLine", () => { }, new ChangeValueProvider());
        const result = await adapter.changeVariableValue('-x w-dummy-var', '20');
        expect(true).to.equal(result);
    });

    it('Changes variable value with subindex', async () => {
        const adapter = new ExternalDebugAdapter("dummyCommandLine", () => { }, new ChangeValueProvider());
        const result = await adapter.changeVariableValue('wapi-r07-nomdco(wapi-r07-tadcoc:1)', 'L');
        expect(true).to.equal(result);
    });

    it('Changes variable value with subindex and hexadecimal', async () => {
        const adapter = new ExternalDebugAdapter("dummyCommandLine", () => { }, new ChangeValueProvider());
        const result = await adapter.changeVariableValue('-x wapi-r07-nomdco(wapi-r07-tadcoc:1)', 'L');
        expect(true).to.equal(result);
    });

    it('Requests variable value', async () => {
        const adapter = new ExternalDebugAdapter("dummyCommandLine", () => { }, new RequestValueProvider());
        const result = await adapter.requestVariableValue('w-dummy-var');
        expect('true [S] ').to.equal(result);
    });

    it('Requests variable value in hexadecimal', async () => {
        const adapter = new ExternalDebugAdapter("dummyCommandLine", () => { }, new RequestValueInHexProvider());
        const result = await adapter.requestVariableValue('-x w-dummy-var');
        expect('63617373656C202020202020202020').to.equal(result);
    });

});

export abstract class BaseMockProvider implements ProcessProvider {

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

class RemoveBreakpointProvider extends BaseMockProvider {

    getOutputContent(): string {
        return ' \n' +
            ' + clear breakpoint at line 55682, file F:/SIGER/20.10a/src/isCOBOL/debug/SRIM00.CBL\n' +
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

class MonitorProvider extends BaseMockProvider {

    getOutputContent(): string {
        return ' \n' +
            ' + add monitor on \'w-dummy-var\'\n' +
            'isdb>';
    }

}

class ChangeValueProvider extends BaseMockProvider {

    getOutputContent(): string {
        return ' \n' +
            ' + new value of w-dummy-var is L\n' +
            'isdb>';
    }

}

class RequestValueProvider extends BaseMockProvider {

    getOutputContent(): string {
        return ' \n' +
            ' + w-dummy-var = true [S] \n' +
            'isdb>';
    }

}

class RequestValueInHexProvider extends BaseMockProvider {

    getOutputContent(): string {
        return ' \n' +
            ' + w-dummy-var = 63617373656C202020202020202020\n' +
            'isdb>';
    }

}
