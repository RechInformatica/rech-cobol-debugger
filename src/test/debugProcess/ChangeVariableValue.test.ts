import { expect } from 'chai';
import 'mocha';
import { ChangeVariableValueCommand } from '../../debugProcess/ChangeVariableValueCommand';
import { ICommand } from '../../debugProcess/DebugConfigs';

const COMMAND: ICommand = {
    name: 'let',
    successRegularExpression: 'new\\s+value\\s+of\\s+',
    extraRegularExpressions: [
        'not\\s+a\\s+Cobol\\s+variable\\s+',
        'data-item\\s+not\\s+found\\s+',
        'boolean\\s+value\\s+required\\s+\\(true\\|false\\)'
    ]
}

describe('Change value command', () => {

    it('Checks change value', () => {
        const output =
            ' \n' +
            ' + new value of W-SIG-DEBUG is P\n' +
            'isdb>';
        const cmd = new ChangeVariableValueCommand(COMMAND);
        cmd.buildCommand({name: 'w-sig-debug', value: 'P'})
        const result = cmd.validateOutput(output);
        expect(true).to.equal(result);
    });

    it('Checks change value in hexadecimal', () => {
        const output =
            ' \n' +
            ' + new value of W-SIG-DEBUG is P\n' +
            'isdb>';
        const cmd = new ChangeVariableValueCommand(COMMAND);
        cmd.buildCommand({name: '-x w-sig-debug', value: '20'})
        const result = cmd.validateOutput(output);
        expect(true).to.equal(result);
    });

});
