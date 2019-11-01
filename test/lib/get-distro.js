/* globals describe, it, before, after */

// External Modules
const assert = require('assert');
const debug = require('debug')('logdna:test:lib:getDistro');

// Internal Modules
const getDistro = require('../../lib/get-distro');

// Constants
const testConfig = 'test/assets/test-getDistro.config';

describe('lib:getDistro', () => {
    it('Gets the correct Distro', () => {
        return getDistro(testConfig, (error, os) => {
            debug(os);
            assert.equal(os.code, '14.04.4 LTS, Trusty Tahr');
            assert.equal(os.os, 'Ubuntu');
            assert.equal(os.release, '14.04');
            assert.equal(os.name, 'Ubuntu 14.04.4 LTS');
        });
    });
});
