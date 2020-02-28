const pkg = require('./package.json');
const grunt = require('grunt');
const os = require('os');

require('load-grunt-tasks')(grunt);

module.exports = (grunt) => {
    const buildOutputFile = os.platform() !== 'win32' ? 'logdna-agent' : 'logdna-agent.exe';

    grunt.initConfig({
        exec: {
            nexe: { cmd: `nexe -i index.js -o ${buildOutputFile} -f -t ~/tmp -r 8.3.0`, maxBuffer: 20000 * 1024 }
            , fpm_rpm: `fpm -s dir -t rpm -n logdna-agent -v ${pkg.version} --license MIT --vendor 'LogDNA, Inc.' --description 'LogDNA Agent for Debian' --url http://logdna.com/ -m '<support@logdna.com>' --before-remove ./scripts/linux/files/before-remove --after-upgrade ./scripts/linux/files/after-upgrade -f ./logdna-agent=/usr/bin/logdna-agent ./scripts/linux/files/init-script=/etc/init.d/logdna-agent ./scripts/linux/files/logrotate=/etc/logrotate.d/logdna-agent`
            , fpm_deb: `fpm -s dir -t deb -n logdna-agent -v ${pkg.version} --license MIT --vendor 'LogDNA, Inc.' --description 'LogDNA Agent for RedHat' --url http://logdna.com/ -m '<support@logdna.com>' --before-remove ./scripts/linux/files/before-remove --after-upgrade ./scripts/linux/files/after-upgrade -f --deb-no-default-config-files ./logdna-agent=/usr/bin/logdna-agent ./scripts/linux/files/init-script=/etc/init.d/logdna-agent ./scripts/linux/files/logrotate=/etc/logrotate.d/logdna-agent`
            , fpm_pkg: `fpm -s dir -t osxpkg -n logdna-agent -v ${pkg.version} --license MIT --vendor 'LogDNA, Inc.' --description 'LogDNA Agent for Darwin' --url http://logdna.com/ -m '<support@logdna.com>' --after-install ./scripts/macOS/mac-after-install --osxpkg-identifier-prefix com.logdna -f ./logdna-agent=/usr/local/bin/logdna-agent ./scripts/macOS/com.logdna.logdna-agent.plist=/Library/LaunchDaemons/com.logdna.logdna-agent.plist`
            , sign_pkg: `productsign --sign "Developer ID Installer: Answerbook, Inc. (TT7664HMU3)" logdna-agent-${pkg.version}.pkg logdna-agent.pkg`
            , choco: 'pushd .\\.builds\\windows & cpack'

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

        }
    });

    grunt.registerTask('linux', ['exec:nexe', 'exec:fpm_rpm', 'exec:fpm_deb']);
    grunt.registerTask('mac', ['exec:nexe', 'exec:fpm_pkg', 'exec:sign_pkg']);
    grunt.registerTask('windows', [
        'exec:nexe'
        , 'copy:nuspec'
        , 'copy:winexe'
        , 'copy:windowsScripts'
        , 'exec:choco'
    ]);
};
