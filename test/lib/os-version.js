/* globals describe, it, before, after */
const assert = require('assert');
const debug = require('debug')('logdna:test:lib:os-version');
const mockery = require('mockery');
const osVersion = require('../../lib/os-version');

describe('lib:file-utilities', () => {
    before(() => {
        mockery.enable({
            warnOnUnregistered: false
            , useCleanCache: true
        });
        mockery.registerMock('fs', {
            readFile: (path, cb) => {
                assert.equal(typeof path, 'string');
                assert(path.length > 0);
                debug('responding with fake os info');
                cb(null, [''
                    , 'NAME="Ubuntu"'
                    , 'VERSION="14.04.4 LTS, Trusty Tahr"'
                    , 'ID=ubuntu'
                    , 'ID_LIKE=debian'
                    , 'PRETTY_NAME="Ubuntu 14.04.4 LTS"'
                    , 'VERSION_ID="14.04"'
                    , 'HOME_URL="sttp://www.ubuntu.com/"'
                    , 'SUPPORT_URL="http://help.ubuntu.com/"'
                    , 'BUG_REPORT_URL="http://bugs.launchpad.net/ubuntu/"'
                    , ''].join('\n'));
            }
        });
    });

    it('Gets the correct OS version', () => {
        return osVersion((error, os) => {
            debug(os);
            assert.equal(os.code, '14.04.4 LTS, Trusty Tahr');
            assert.equal(os.name, 'Ubuntu 14.04.4 LTS');
            assert.equal(os.os, 'Ubuntu');
            assert.equal(os.release, '14.04');
            assert.equal(os.name, 'Ubuntu 14.04.4 LTS');
        });
    });

    after(() => {
        mockery.disable();
    });
});
