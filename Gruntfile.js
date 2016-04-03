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
                },
                options: {
                    exclusionPattern: /browser/
                }
            }
        },
        exec: {
            nexe: { cmd: 'nexe -i index.js -o ' + buildOutputFile + ' -f -t ~/tmp -r 5.9.0', maxBuffer: 20000 * 1024 },
            fpm_rpm: 'fpm -s dir -t rpm -n logdna-agent -v ' + pkg.version + ' --license MIT --vendor \'Answerbook, Inc.\' --description \'LogDNA Agent for Linux\' --url http://logdna.com/ -m \'<help@logdna.com>\' --before-remove ./scripts/before-remove --after-upgrade ./scripts/after-upgrade -f ./logdna-agent=/usr/bin/logdna-agent ./scripts/init-script=/etc/init.d/logdna-agent',
            fpm_deb: 'fpm -s dir -t deb -n logdna-agent -v ' + pkg.version + ' --license MIT --vendor \'Answerbook, Inc.\' --description \'LogDNA Agent for Linux\' --url http://logdna.com/ -m \'<help@logdna.com>\' --before-remove ./scripts/before-remove --after-upgrade ./scripts/after-upgrade -f --deb-no-default-config-files ./logdna-agent=/usr/bin/logdna-agent ./scripts/init-script=/etc/init.d/logdna-agent',
            choco: 'pushd .\\.builds\\windows & cpack'
        },
        mochacli: {
            options: {
                reporter: 'spec',
                bail: true
            },
            all: ['test/**/*.js']
        },
        copy: {
            nuspec: {
                files: [{
                    src: './logdna-agent.nuspec',
                    dest: './.builds/windows/'
                }]
            },
            winexe: {
                files: [{
                    src: './logdna-agent.exe',
                    dest: './.builds/windows/tools/'
                }]
            },
            windowsScripts: {
                files: [{
                    src: './scripts/windows/chocolateyInstall.ps1',
                    dest: './.builds/windows/tools/chocolateyInstall.ps1'
                },
                {
                    src: './scripts/windows/chocolateyUninstall.ps1',
                    dest: './.builds/windows/tools/chocolateyUninstall.ps1'
                }]
            }
        },
        jshint: {
            files: files,
            options: {
                jshintrc: '.jshintrc'
            }
        },
        jscs: {
            files: {
                src: files
            },
            options: {
                config: '.jscsrc',
                esnext: true,
                verbose: true,
                fix: true
            }
        }
    });
    grunt.registerTask('test', ['mochacli', 'jscs', 'jshint']);
    grunt.registerTask('validate', ['jscs', 'jshint']);
    grunt.registerTask('build', ['lineremover', 'exec:nexe']);
    grunt.registerTask('linux', ['build', 'exec:fpm_rpm', 'exec:fpm_deb']);
    grunt.registerTask('windows', [
        'build',
        'copy:nuspec',
        'copy:winexe',
        'copy:windowsScripts',
        'exec:choco'
    ]);
};
