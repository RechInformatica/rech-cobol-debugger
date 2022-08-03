import { expect } from 'chai';
import 'mocha';
import { ICommand } from '../../debugProcess/DebugConfigs';
import { RequestAvailableSourceDirectoriesCommand } from '../../debugProcess/RequestAvailableSourceDirectoriesCommand';

const COMMAND: ICommand = {
    name: 'display -env java.class.path',
    successRegularExpression: '.*java\\.class\\.path\\s+=\\s+(?<directories>.*)'
}

describe('Request available source directories command', () => {

    it('Checks a single available windows directory', () => {
        const output =
            ' \n' +
            ' + java.class.path = F:\\SIGER\\wc\\DES\\cassel\\bin\\isCOBOL\\debug\n' +
            'isdb>';
        const expected: string[] = ['F:\\SIGER\\wc\\DES\\cassel\\bin\\isCOBOL\\debug'];
        const result = new RequestAvailableSourceDirectoriesCommand(COMMAND).validateOutput(output);
        expect(expected.length).to.equal(result!.length);
        expect(expected[0]).to.equal(result![0]);
    });

    it('Checks two available windows directories', () => {
        const output =
            ' \n' +
            ' + java.class.path = F:\\SIGER\\wc\\DES\\cassel\\bin\\isCOBOL\\debug;F:\\SIGER\\wc\\DES\\cassel\\src\\isCOBOL\\debug\n' +
            'isdb>';
        const expected: string[] = ['F:\\SIGER\\wc\\DES\\cassel\\bin\\isCOBOL\\debug', 'F:\\SIGER\\wc\\DES\\cassel\\src\\isCOBOL\\debug'];
        const result = new RequestAvailableSourceDirectoriesCommand(COMMAND).validateOutput(output);
        expect(expected.length).to.equal(result!.length);
        expect(expected[0]).to.equal(result![0]);
        expect(expected[1]).to.equal(result![1]);
    });

    it('Checks a single available linux directory', () => {
        const output =
            ' \n' +
            ' + java.class.path = /SIGER/wc/DES/cassel/bin/isCOBOL/debug\n' +
            'isdb>';
        const expected: string[] = ['/SIGER/wc/DES/cassel/bin/isCOBOL/debug'];
        const result = new RequestAvailableSourceDirectoriesCommand(COMMAND).validateOutput(output);
        expect(expected.length).to.equal(result!.length);
        expect(expected[0]).to.equal(result![0]);
    });

    it('Checks two available linux directories', () => {
        const output =
            ' \n' +
            ' + java.class.path = /SIGER/wc/DES/cassel/bin/isCOBOL/debug:/SIGER/wc/DES/cassel/src/isCOBOL/debug\n' +
            'isdb>';
        const expected: string[] = ['/SIGER/wc/DES/cassel/bin/isCOBOL/debug', '/SIGER/wc/DES/cassel/src/isCOBOL/debug'];
        const result = new RequestAvailableSourceDirectoriesCommand(COMMAND).validateOutput(output);
        expect(expected.length).to.equal(result!.length);
        expect(expected[0]).to.equal(result![0]);
        expect(expected[1]).to.equal(result![1]);
    });

});

