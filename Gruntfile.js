/*
 * The following packages should be installed in the following way:
 * npm install -g nexe
*/

let pkg = require('./package.json');
let grunt = require('grunt');
let path = require('path');
let os = require('os');

require('load-grunt-tasks')(grunt);

module.exports = function(grunt) {
    const execOutputPath = `./bin/${os.platform() !== 'win32' ? 'logdna-agent' : 'logdna-agent.exe'}`;
    const nodeVersion = '10.17.0';
    const fpm = {
        input_type: 'dir'
        , output_type: {
            debian: 'deb'
            , redhat: 'rpm'
            , darwin: 'osxpkg'
        }, name: 'logdna-agent'
        , version: pkg.version
        , license: 'MIT'
        , vendor: '"LogDNA, Inc."'
        , description: {
            linux: '"LogDNA Agent for Linux"'
            , darwin: '"LogDNA Agent for OSX"'
        }, url: 'https://logdna.com'
        , maintainer: 'support@logdna.com'
    };

    grunt.initConfig({
        exec: {
            nexe: {
                cmd: `nexe -i index.js -o ${execOutputPath} -ftr ${nodeVersion}`
                , maxBuffer: 20000 * 1024
            }, fpm_debian: `fpm \
                --input-type ${fpm.input_type} \
                --output-type ${fpm.output_type.debian} \
                --name ${fpm.name} \
                --version ${fpm.version} \
                --license  ${fpm.license} \
                --vendor ${fpm.vendor} \
                --description ${fpm.description.linux} \
                --maintainer ${fpm.maintainer} \
                --before-remove ./build/linux/before-remove \
                --after-upgrade ./build/linux/after-upgrade \
                -f --deb-no-default-config-files \
                    ${execOutputPath}=/usr/bin/logdna-agent \
                    ./build/linux/init-script=/etc/init.d/logdna-agent \
                    ./build/linux/logrotate=/etc/logrotate.d/logdna-agent`
            , fpm_redhat: `fpm \
                --input-type ${fpm.input_type} \
                --output-type ${fpm.output_type.redhat} \
                --name ${fpm.name} \
                --version ${fpm.version} \
                --license  ${fpm.license} \
                --vendor ${fpm.vendor} \
                --description ${fpm.description.linux} \
                --maintainer ${fpm.maintainer} \
                --before-remove ./build/linux/before-remove \
                --after-upgrade ./build/linux/after-upgrade \
                -f \
                    ${execOutputPath}=/usr/bin/logdna-agent \
                    ./build/linux/init-script=/etc/init.d/logdna-agent \
                    ./build/linux/logrotate=/etc/logrotate.d/logdna-agent`
            , fpm_darwin: `fpm \
                --input-type ${fpm.input_type} \
                --output-type ${fpm.output_type.darwin} \
                --name ${fpm.name} \
                --version ${fpm.version} \
                --license  ${fpm.license} \
                --vendor ${fpm.vendor} \
                --description ${fpm.description.linux} \
                --maintainer ${fpm.maintainer} \
                --osxpkg-identifier-prefix com.logdna \
                --after-install ./build/darwin/mac-after-install \
                -f \
                    ${execOutputPath}=/usr/local/bin/logdna-agent \
                    ./build/darwin/com.logdna.logdna-agent.plist=/Library/LaunchDaemons/com.logdna.logdna-agent.plist`
            , copy_debian: `mkdir -p pkg && cp -f logdna-agent*${fpm.version}*.deb ./pkg/logdna-agent-unsigned.deb`
            , copy_redhat: `mkdir -p pkg && cp -f logdna-agent*${fpm.version}*.rpm ./pkg/logdna-agent-unsigned.rpm`
            , sign_pkg: `productsign --sign "Developer ID Installer: Answerbook, Inc. (TT7664HMU3)" logdna-agent-${fpm.version}.pkg ./pkg/logdna-agent.pkg`
            , verify_pkg: 'spctl --assess --type install -v ./pkg/logdna-agent.pkg'
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
                    src: './build/windows/chocolateyInstall.ps1'
                    , dest: './.builds/windows/tools/chocolateyInstall.ps1'
                }, {
                    src: './build/windows/winTail.ps1'
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

    grunt.registerTask('build', ['exec:nexe']);
    grunt.registerTask('windows', ['build', 'copy:nuspec', 'copy:winexe', 'copy:windowsScripts', 'exec:choco']);
    // NEW
    grunt.registerTask('debian', ['build', 'exec:fpm_debian', 'exec:copy_debian']);
    grunt.registerTask('redhat', ['build', 'exec:fpm_redhat', 'exec:copy_redhat']);
    grunt.registerTask('darwin', ['build', 'exec:fpm_darwin', 'exec:sign_pkg', 'exec:verify_pkg']);
    // OLD
    grunt.registerTask('linux', ['build', 'exec:fpm_redhat', 'exec:fpm_debian']);
    grunt.registerTask('mac', ['build', 'exec:fpm_darwin', 'exec:sign_pkg']);
};
