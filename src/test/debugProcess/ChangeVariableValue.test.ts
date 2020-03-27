import { expect } from 'chai';
import 'mocha';
import { ChangeVariableValueCommand } from '../../debugProcess/ChangeVariableValueCommand';

describe('Change value command', () => {

    it('Checks change value', () => {
        const output =
            ' \n' +
            ' + new value of W-SIG-DEBUG is P\n' +
            'isdb>';
        const cmd = new ChangeVariableValueCommand();
        cmd.buildCommand({name: 'w-sig-debug', value: 'P'})
        const result = cmd.validateOutput(output);
        expect(true).to.equal(result);
    });

});
