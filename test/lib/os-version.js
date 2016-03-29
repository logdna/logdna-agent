/* globals describe, it, before, after */
require('../helpers/before');
var mockery = require('mockery');
var assert = require('assert');
var debug = require('debug')('logdna:test:lib:os-version');
describe('lib:file-utilities', function () {
    before (function () {
        mockery.enable({
            warnOnUnregistered: false,
            useCleanCache: true
        });
        mockery.registerMock('fs', {
            readFile: function (path, cb) {
                assert.equal(typeof path, 'string');
                assert(path.length > 0);
                debug('responding with fake os info');
                /*jshint multistr: true */
                cb (null,'\n\
NAME="Ubuntu" \n\
VERSION="14.04.4 LTS, Trusty Tahr"\n\
ID=ubuntu\n\
ID_LIKE=debian\n\
PRETTY_NAME="Ubuntu 14.04.4 LTS"\n\
VERSION_ID="14.04"\n\
HOME_URL="sttp://www.ubuntu.com/"\n\
SUPPORT_URL="http://help.ubuntu.com/"\n\
BUG_REPORT_URL="http://bugs.launchpad.net/ubuntu/"\n\
                ');
                /*jshint multistr: true */
            }
        });
    });

    it('Gets the correct OS version', function () {
        var osVersion = Promise.promisify(require('../../lib/os-version'));

        return osVersion()
        .then(os => {
            debug(os);
            assert.equal(os.code, '14.04.4 LTS, Trusty Tahr');
            assert.equal(os.name, 'Ubuntu 14.04.4 LTS');
            assert.equal(os.os, 'Ubuntu');
            assert.equal(os.release, '14.04');
            assert.equal(os.name, 'Ubuntu 14.04.4 LTS');
        });
    });

    after (function () {
        mockery.disable();
    });
});
