/* globals describe, it, before, after */

// External Modules
const assert = require('assert');
const debug = require('debug')('logdna:test:lib:os-version');

// Internal Modules
const osVersion = require('../../lib/os-version');

// Constants
const testConfig = '../assets/test-os-version.config';

describe('lib:os-version', () => {
    it('Gets the correct OS version', () => {
        return osVersion(testConfig, (error, os) => {
            debug(os);
            assert.equal(os.code, '14.04.4 LTS, Trusty Tahr');
            assert.equal(os.os, 'Ubuntu');
            assert.equal(os.release, '14.04');
            assert.equal(os.name, 'Ubuntu 14.04.4 LTS');
        });
    });
});
