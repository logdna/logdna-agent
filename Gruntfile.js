var pkg = require('./package.json');
var grunt = require('grunt');
var path = require('path');
var os = require('os');

require('load-grunt-tasks')(grunt);

module.exports = function(grunt) {
    var files = ['./*.js', 'lib/**/*.js', 'test/**/*.js'];
    var buildOutputFile = os.platform() !== 'win32' ? 'logdna-agent' : 'logdna-agent.exe';

    grunt.initConfig({
        lineremover: {
            nukebrowser: {
                files: {
                    'node_modules/ws/package.json': path.join('node_modules', 'ws', 'package.json')
                }, options: {
                    exclusionPattern: /browser/
                }
            }

        }, exec: {
            nexe: { cmd: 'nexe -i index.js -o ' + buildOutputFile + ' -f -t ~/tmp -r 10.15.3', maxBuffer: 20000 * 1024 }
            , fpm_rpm: 'fpm -s dir -t rpm -n logdna-agent -v ' + pkg.version + ' --license MIT --vendor \'Answerbook, Inc.\' --description \'LogDNA Agent for Linux\' --url http://logdna.com/ -m \'<help@logdna.com>\' --before-remove ./scripts/before-remove --after-upgrade ./scripts/after-upgrade -f ./logdna-agent=/usr/bin/logdna-agent ./scripts/init-script=/etc/init.d/logdna-agent ./scripts/logrotate=/etc/logrotate.d/logdna-agent'
            , fpm_deb: 'fpm -s dir -t deb -n logdna-agent -v ' + pkg.version + ' --license MIT --vendor \'Answerbook, Inc.\' --description \'LogDNA Agent for Linux\' --url http://logdna.com/ -m \'<help@logdna.com>\' --before-remove ./scripts/before-remove --after-upgrade ./scripts/after-upgrade -f --deb-no-default-config-files ./logdna-agent=/usr/bin/logdna-agent ./scripts/init-script=/etc/init.d/logdna-agent ./scripts/logrotate=/etc/logrotate.d/logdna-agent'
            , fpm_pkg: 'fpm -s dir -t osxpkg -n logdna-agent -v ' + pkg.version + ' --license MIT --vendor \'Answerbook, Inc.\' --description \'LogDNA Agent for Mac\' --url http://logdna.com/ -m \'<help@logdna.com>\' --after-install ./scripts/mac-after-install --osxpkg-identifier-prefix com.logdna -f ./logdna-agent=/usr/local/bin/logdna-agent ./scripts/com.logdna.logdna-agent.plist=/Library/LaunchDaemons/com.logdna.logdna-agent.plist'
            , sign_pkg: 'productsign --sign "Developer ID Installer: Answerbook, Inc. (TT7664HMU3)" logdna-agent-' + pkg.version + '.pkg logdna-agent.pkg'
            , choco: 'pushd .\\.builds\\windows & cpack'

        }, mochacli: {
            options: {
                reporter: 'spec'
                , bail: true
            }, all: ['test/**/*.js']

        }, copy: {
            nuspec: {
                files: [{
                    src: './logdna-agent.nuspec'
                    , dest: './.builds/windows/'
                }]
            }, winexe: {
                files: [{
                    src: './logdna-agent.exe'
                    , dest: './.builds/windows/tools/'
                }]
            }, windowsScripts: {
                files: [{
                    src: './scripts/windows/chocolateyInstall.ps1'
                    , dest: './.builds/windows/tools/chocolateyInstall.ps1'
                }, {
                    src: './scripts/windows/winTail.ps1'
                    , dest: './.builds/windows/tools/winTail.ps1'
                }, {
                    src: './license.txt'
                    , dest: './.builds/windows/tools/license.txt'
                }, {
                    src: './verification.txt'
                    , dest: './.builds/windows/tools/verification.txt'
                }]
            }

        }, eslint: {
            target: files
            , options: {
                configFile: '.eslintrc'
                , fix: true
            }
        }
    });

    grunt.registerTask('test', ['mochacli', 'eslint']);
    grunt.registerTask('validate', ['eslint']);
    grunt.registerTask('build', ['lineremover', 'exec:nexe']);
    grunt.registerTask('linux', ['build', 'exec:fpm_rpm', 'exec:fpm_deb']);
    grunt.registerTask('mac', ['build', 'exec:fpm_pkg', 'exec:sign_pkg']);
    grunt.registerTask('windows', [
        'build'
        , 'copy:nuspec'
        , 'copy:winexe'
        , 'copy:windowsScripts'
        , 'exec:choco'
    ]);
};
