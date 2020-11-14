# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.1.2] - November 16, 2020
### Fixed
- Send SIGKILL if the process refuses to stop [#213](https://github.com/logdna/logdna-agent/pull/213)

## [2.1.1] - November 12, 2020
### Fixed
- Cancel timers to prevent shutdown hanging [#215](https://github.com/logdna/logdna-agent/pull/215)

## [2.1.0] - November 2, 2020
### Changed
- Use systemd service name as the app name [#210](https://github.com/logdna/logdna-agent/pull/210)

### Fixed
- Revert environment variable changes [#208](https://github.com/logdna/logdna-agent/pull/208)

## [2.0.0] - October 2, 2020
### Removed
- Deprecate the unstable WinEvent Logging component [#194](https://github.com/logdna/logdna-agent/pull/194)
- Remove Kubernetes support [#196](https://github.com/logdna/logdna-agent/pull/196)

### Changed
- Use the node client for logging [#195](https://github.com/logdna/logdna-agent/pull/195)
- Use `eslint-config-logdna` from NPM [#198](https://github.com/logdna/logdna-agent/pull/198)
- Upgrade node version to `12.16.2` [#199](https://github.com/logdna/logdna-agent/pull/199)

## [1.6.5] - August 21, 2020
### Changed
- Update internal logging [#164](https://github.com/logdna/logdna-agent/pull/164)

### Fixed
- Fix stringification issue on handling 207 [#152](https://github.com/logdna/logdna-agent/pull/152)
- Fix memory leak issue [#157](https://github.com/logdna/logdna-agent/pull/157)
- Make sure `process.getuid` doesn't get called on `Windows` [#188](https://github.com/logdna/logdna-agent/pull/188)

## [1.6.2] - December 5, 2019
### Added
- Add support for remote restart and redirection to new endpoint [#119](https://github.com/logdna/logdna-agent/pull/119)
- Add user-agent into request headers [#126](https://github.com/logdna/logdna-agent/pull/126)
- Add retry on receiving 5xx [#135](https://github.com/logdna/logdna-agent/pull/135)
- Add handling 207 response [#143](https://github.com/logdna/logdna-agent/pull/143)
- Add RBAC YAML [#141](https://github.com/logdna/logdna-agent/pull/141)

### Changed
- Source /etc/sysconfig/logdna-agent if exists [#66](https://github.com/logdna/logdna-agent/pull/66)
- Rename LogDNA Agent for OpenShift YAML [#127](https://github.com/logdna/logdna-agent/pull/127)
- Update user-agent header by adding distro info [#137](https://github.com/logdna/logdna-agent/pull/137)
- Update failure condition and debug statements [#139](https://github.com/logdna/logdna-agent/pull/139)
- Update custom internal logger [#134](https://github.com/logdna/logdna-agent/pull/134)
- Update retry mechanism [#140](https://github.com/logdna/logdna-agent/pull/140)
- Update user-agent header [#142](https://github.com/logdna/logdna-agent/pull/142)

### Fixed
- Fix globbing issue [#126](https://github.com/logdna/logdna-agent/pull/126)
- Fix configuration-related bugs [#130](https://github.com/logdna/logdna-agent/pull/130)
- Make sure to check `networkInterface` is defined [#185](https://github.com/logdna/logdna-agent/pull/185)

## [1.6.1] - July 19, 2019
### Added
- Add LogDNA Agent v2.0 instructions [#84](https://github.com/logdna/logdna-agent/pull/84)
- Add IBM instructions for LogDNA Agent v2.0 [#86](https://github.com/logdna/logdna-agent/pull/86)
- Add support for having whitespace in WinEvent entries [#91](https://github.com/logdna/logdna-agent/pull/91)
- Add OpenShift version of the LogDNA Agent daemonset [#53](https://github.com/logdna/logdna-agent/pull/53)

### Changed
- Make some variables customizable thru environment variables [#73](https://github.com/logdna/logdna-agent/pull/73)
- Simplify the LogDNA Agent v2.0 upgrade instructions [#88](https://github.com/logdna/logdna-agent/pull/88)

### Fixed
- Fix npm vulnerabilities [#72](https://github.com/logdna/logdna-agent/pull/72)
- Fix the broken promises and the websocket [#106](https://github.com/logdna/logdna-agent/pull/106)
- Allow the execution if the config file doesn't exist yet [#116](https://github.com/logdna/logdna-agent/pull/116)

## [1.5.6] - December 17, 2018
### Added
- Add LOGDNA_LOGENDPOINT option [#68](https://github.com/logdna/logdna-agent/pull/68)

## [1.5.5] - October 9, 2018
### Added
- Add support for custom config variables [#60](https://github.com/logdna/logdna-agent/pull/60)

### Changed
- Simplify and Optimize WinEvent Logging [#56](https://github.com/logdna/logdna-agent/pull/56)
- Update WinEvent Logging by specifying winTail.ps1 [#58](https://github.com/logdna/logdna-agent/pull/58)

### Fixed
- Fix WinEvent Logging [#55](https://github.com/logdna/logdna-agent/pull/55)
- Fix WinEvent Logging issue in getting restrictions on executing PS scripts [#61](https://github.com/logdna/logdna-agent/pull/61)

## [1.5.1] - April 19, 2018
### Added
- Add support for multiple Windows Event Log Providers [#49](https://github.com/logdna/logdna-agent/pull/49)
- Set requests.cpu for K8s [#51](https://github.com/logdna/logdna-agent/pull/51)
- Add Extra Parameters and Better Utilization [#50](https://github.com/logdna/logdna-agent/pull/50)

## [1.5.0] - February 27, 2018
### Added
- Add file disk queue [29e737a](https://github.com/logdna/logdna-agent/commit/29e737ab330dc8cba954d7fec4fc88eadea86100)

### Changed
- Tail journald on only firstrun [b09f326](https://github.com/logdna/logdna-agent/commit/b09f326b9cc015f96050e85e71f97e89e0c1d020)
- Don't use file disk queue for windows [f8ff7ec](https://github.com/logdna/logdna-agent/commit/f8ff7ec39236bea42b4a297913304abfcd7bf31c)

### Fixed
- Fix and improve the support for K8s labels [06e6e1c](https://github.com/logdna/logdna-agent/commit/06e6e1cad52727e59e0ebe09fbe4ad81a2adb35f)
- Fix label parsing for HTTP [47be470](https://github.com/logdna/logdna-agent/commit/47be470cc9d2ea513b482fb52f44251243c627cb)

## [1.4.14] - January 25, 2018
### Added
- Add basic stream processing for journald [c8f64e2](https://github.com/logdna/logdna-agent/commit/c8f64e2a5b89a3d8c265d0f0411365c61e1df2ec)

## [1.4.13] - January 24, 2018
### Added
- Add journald support [55233d4](https://github.com/logdna/logdna-agent/commit/55233d4cc7caf12f3434bdcf5016274902a06045)

## [1.4.12] - January 16, 2018
### Added
- Add label support for K8s [#32](https://github.com/logdna/logdna-agent/pull/32)

## [1.4.10] - January 10, 2018
### Added
- Add binary and manpage for binary [#33](https://github.com/logdna/logdna-agent/pull/33)
- Add openrc init script [cb47841](https://github.com/logdna/logdna-agent/commit/cb47841a1d71ec2c830466c5ba4e94d4de59ecd4)

## [1.4.8] - January 5, 2018
### Changed
- Allow rescan to pick up new file [cadc2c7](https://github.com/logdna/logdna-agent/commit/cadc2c7ef3629273d66916defeb8496e20220f42)

## [1.4.7] - November 16, 2017
### Added
- Include tags into http transport payload [e6552cc](https://github.com/logdna/logdna-agent/commit/e6552ccf719ed4010c45ba14bcb3c2556ba5ce7d)

## [1.4.6] - October 24, 2017
### Added
- Add proxy support for websocket [9e3dd79](https://github.com/logdna/logdna-agent/commit/9e3dd79b6cc65a7ef274b40caa7b4067a92e47d4)

## [1.4.5] - September 18, 2017
### Added
- Allow regex exclusion to be passed via environment variable [21c0c4c](https://github.com/logdna/logdna-agent/commit/21c0c4cccbd4d7863a451e267b83b129258f2578)

### Changed
- Double check if response body exists [07d1e11](https://github.com/logdna/logdna-agent/commit/07d1e11c62743cc2999998f4c1f373c59df7503b)

## [1.4.4] - August 31, 2017
### Added
- Use LogDNA Eslint Config and lint [5f60345](https://github.com/logdna/logdna-agent/commit/5f60345e79bc6b280e72f816119cc57545d7a861)
- Add exclude_regex support [2a86035](https://github.com/logdna/logdna-agent/commit/2a86035a7b950934989fa4d038a4e60b711198b7)

### Changed
- Improve compatibility with K8s v1.6+ [96138a0](https://github.com/logdna/logdna-agent/commit/96138a07cbb54eb1ec93d39c2a19730db65dccad)
- Replace got with request [6bbd461](https://github.com/logdna/logdna-agent/commit/6bbd4619ecd279833ac74137539c09f501cedfcf)
- Promisify request module [5b8af06](https://github.com/logdna/logdna-agent/commit/5b8af064da65a024c600581968e1a93e76065f17)

## [1.4.3] - May 25, 2017
### Added
- Exclude items via environment variable [7f682b8](https://github.com/logdna/logdna-agent/commit/7f682b8c16c913f34ecfe7d25f1c0246252a8d85)

## [1.4.2] - May 19, 2017
### Changed
- Make sure it checks file before trying to read [9a5d3a6](https://github.com/logdna/logdna-agent/commit/9a5d3a66942d848800344cf8ded2ae08078188f0)

## [1.4.1] - April 6, 2017
### Changed
- Use /etc/hostname for K8s too [ee7ab20](https://github.com/logdna/logdna-agent/commit/ee7ab20bfcad2223b7cb8e44700168c4ba7ebc12)

## [1.4.0] - April 4, 2017
### Added
- Add hostname option (-n or --hostname) to command parameters [914a9af](https://github.com/logdna/logdna-agent/commit/914a9af1523097bf1b1b07f2ce30f81daaa69ba4)
- Add file exclusion feature [6c72652](https://github.com/logdna/logdna-agent/commit/6c72652891ca68dd7925ae8fbe0c7ee760a93e7d)
- Add http_retry on errors [09c501d](https://github.com/logdna/logdna-agent/commit/09c501d6fa74116cd44812908cfa6cd94fdb0e91)
- Read from config for http_retry [54ba27b](https://github.com/logdna/logdna-agent/commit/54ba27be88518f9ab91d347407027f7a5b5f98fe)
- Add TailReadStream as new experimental tail module [d5314e0](https://github.com/logdna/logdna-agent/commit/d5314e0eb58d9d5af70c2f543a519e10f14db5e0)
- Add tailhead age check for TailReadStream [61c176f](https://github.com/logdna/logdna-agent/commit/61c176f3d690a0b75ada2e79d3dbf220502adbe5)
- Allow overriding default TailReadStream settings via environment variables [7353762](https://github.com/logdna/logdna-agent/commit/7353762cd1640eb8b840bd7721b5d8e5e3dbfae8)

### Changed
- Allow multiple options at once [d5991a3](https://github.com/logdna/logdna-agent/commit/d5991a310d17c5fc508273abd2eeeec7dd34602e)
- Make rescan interval for K8s smaller [b9e9ffc](https://github.com/logdna/logdna-agent/commit/b9e9ffc96a1e29808bb5459569df46e15af3287b)
- Ensure reconnect() is only called once [21aab6e](https://github.com/logdna/logdna-agent/commit/21aab6e1c0b1b6f321b33c9bbb49978247bfbb9c)
- Ensure reliable 2-way socket communication [b50d756](https://github.com/logdna/logdna-agent/commit/b50d7560021d2df69e4d3bcc75db3fa6238a929a)
- Make TailReadStream default tail library [217a5f7](https://github.com/logdna/logdna-agent/commit/217a5f7773c9f80d025f095f6c19796f7c880a7d)
- Default to using TailReadStream tail module and http transport with tls [c94396d](https://github.com/logdna/logdna-agent/commit/c94396dc94b246781db3d2d333042bb474e83ab6)

### Fixed
- Fix bug in sending stats [6549510](https://github.com/logdna/logdna-agent/commit/6549510536f945c5cebacb52c50a23d9c4461763)

## [1.3.11] - February 2, 2017
### Added
- Allow overriding hostname and tags with environment variable [ee64c58](https://github.com/logdna/logdna-agent/commit/ee64c58b41fc815ff49f4cb5857e55034047796b)

### Fixed
- Make sure parseConfig overrides the items in config [ee82968](https://github.com/logdna/logdna-agent/commit/ee829681a43612076bde1abc0fc2095f92b01c13)

## [1.3.10] - January 5, 2017
### Added
- Allow ingestion key to be passed via environment variable [7869c5e](https://github.com/logdna/logdna-agent/commit/7869c5ee82f0511c5082ba0fc6c1c6df29c53963)
- Show help for missing ingestion key [b9ddca6](https://github.com/logdna/logdna-agent/commit/b9ddca6475783d5d78f241151bb9ce85d111f50d)

### Changed
- Ensure http transport also respects 10k buffer limit [4a2b7af](https://github.com/logdna/logdna-agent/commit/4a2b7af00e7ba30fd7277f112061585756e645b7)
- Ensure bash commands run detached from the parent process [d2783ce](https://github.com/logdna/logdna-agent/commit/d2783ceb05bf75201c3338062525fa6d5b238112)

## [1.3.6] - September 22, 2016
### Added
- Add hostname override option to config file [7ee74e7](https://github.com/logdna/logdna-agent/commit/7ee74e7de5d1ced5c581761b7b2675bff28ef35f)

### Fixed
- Scan continously all logdir's even if not accessible at startup [a0db745](https://github.com/logdna/logdna-agent/commit/a0db745d83e2e43ed5363267c2571055c88cde7f)

## [1.3.4] - August 18, 2016
### Added
- Show modes sent by server or thru local config [916d98d](https://github.com/logdna/logdna-agent/commit/916d98dcb51ac3261c64e933c56fab370fe49709)

### Changed
- Ensure logrotate.d script always has 0644 file mode [6c5342e](https://github.com/logdna/logdna-agent/commit/6c5342e1dbef490e5394d18110ba333fc8bfc409)

## [1.3.1] - April 19, 2016
### Added
- Support glob patterns for logdir [3a7cf7b](https://github.com/logdna/logdna-agent/commit/3a7cf7b14040f93631adc2bec69561428a5c76ad)
- Add logrotate script [39a2b56](https://github.com/logdna/logdna-agent/commit/39a2b560ba8096cb34bde38bbbde454b2b6442d0)
- Add streaming using unix tail [948911c](https://github.com/logdna/logdna-agent/commit/948911c45c0ec139e1ba7712212dea6dc43f59b4)
- Enable additional transport option [a267d86](https://github.com/logdna/logdna-agent/commit/a267d8626908246545aac0bc61a20cf97f09b98f)
- Add support for turning compression on and off [274e4a4](https://github.com/logdna/logdna-agent/commit/274e4a4cd31892c49f301b392df1f0bd392d03f3)

### Changed
- Replace getFiles with glob module [ab2d1a8](https://github.com/logdna/logdna-agent/commit/ab2d1a8e94d7c333d782c24ff319af5242302dd0)
- Raise keepAliveTimeout to 60s [ddc7468](https://github.com/logdna/logdna-agent/commit/ddc7468c2c83813eb5ce7241b1970ac9d4093f82)
- Optimize tail library settings [9c3aef0](https://github.com/logdna/logdna-agent/commit/9c3aef093aeb815b6451268cc17eb34a067b5d90)

## [1.2.0] - April 1, 2016
### Added
- Cap buffering when disconnected [6ca5b65](https://github.com/logdna/logdna-agent/commit/6ca5b6597af4349cc0d7a6b4687b52af02fa11b6)
- Add linebuffer stats [7e831d2](https://github.com/logdna/logdna-agent/commit/7e831d2795b05d49b85dd394e5b93890126f5cc7)

### Changed
- Refactor line buffer to flush at specific intervals or if a threshold is reached [158f08b](https://github.com/logdna/logdna-agent/commit/158f08be4f3486d8cd49d79f5efeff3877f2de2e)
- Send batch of lines [dcc9b83](https://github.com/logdna/logdna-agent/commit/dcc9b83fc77f56aab1557c28f0e606e754e736b7)

### Fixed
- Fix bad cutoff logic [116818b](https://github.com/logdna/logdna-agent/commit/116818be62f9c6813479c64d0cd41a3547d9b93e)

## [1.1.0] - March 29, 2016
### Added
- Windows support for log files
- Windows support for event logs
- Run as a Windows Service
- Autoupdates for Windows via Chocolatey
- Continuous Integration via Appveyor

### Changed
- Refactor agent code
- Lint & Style Validations

[Unreleased]: https://github.com/logdna/logdna-agent/compare/2.1.2...HEAD
[2.1.2]: https://github.com/logdna/logdna-agent/compare/2.1.1...2.1.2
[2.1.1]: https://github.com/logdna/logdna-agent/compare/2.1.0...2.1.1
[2.1.0]: https://github.com/logdna/logdna-agent/compare/2.0.0...2.1.0
[2.0.0]: https://github.com/logdna/logdna-agent/compare/1.6.5...2.0.0
[1.6.5]: https://github.com/logdna/logdna-agent/compare/1.6.2...1.6.5
[1.6.2]: https://github.com/logdna/logdna-agent/compare/1.6.1...1.6.2
[1.6.1]: https://github.com/logdna/logdna-agent/compare/1.5.6...1.6.1
[1.5.6]: https://github.com/logdna/logdna-agent/compare/1.5.5...1.5.6
[1.5.5]: https://github.com/logdna/logdna-agent/compare/1.5.1...1.5.5
[1.5.1]: https://github.com/logdna/logdna-agent/compare/1.5.0...1.5.1
[1.5.0]: https://github.com/logdna/logdna-agent/compare/1.4.14...1.5.0
[1.4.14]: https://github.com/logdna/logdna-agent/compare/1.4.13...1.4.14
[1.4.13]: https://github.com/logdna/logdna-agent/compare/1.4.12...1.4.13
[1.4.12]: https://github.com/logdna/logdna-agent/compare/1.4.10...1.4.12
[1.4.10]: https://github.com/logdna/logdna-agent/compare/1.4.8...1.4.10
[1.4.8]: https://github.com/logdna/logdna-agent/compare/1.4.7...1.4.8
[1.4.7]: https://github.com/logdna/logdna-agent/compare/1.4.6...1.4.7
[1.4.6]: https://github.com/logdna/logdna-agent/compare/1.4.5...1.4.6
[1.4.5]: https://github.com/logdna/logdna-agent/compare/1.4.4...1.4.5
[1.4.4]: https://github.com/logdna/logdna-agent/compare/1.4.3...1.4.4
[1.4.3]: https://github.com/logdna/logdna-agent/compare/1.4.2...1.4.3
[1.4.2]: https://github.com/logdna/logdna-agent/compare/1.4.1...1.4.2
[1.4.1]: https://github.com/logdna/logdna-agent/compare/1.4.0...1.4.1
[1.4.0]: https://github.com/logdna/logdna-agent/compare/1.3.11...1.4.0
[1.3.11]: https://github.com/logdna/logdna-agent/compare/1.3.10...1.3.11
[1.3.10]: https://github.com/logdna/logdna-agent/compare/1.3.6...1.3.10
[1.3.6]: https://github.com/logdna/logdna-agent/compare/1.3.4...1.3.6
[1.3.4]: https://github.com/logdna/logdna-agent/compare/1.3.1...1.3.4
[1.3.1]: https://github.com/logdna/logdna-agent/compare/1.2.0...1.3.1
[1.2.0]: https://github.com/logdna/logdna-agent/compare/1.1.0...1.2.0
[1.1.0]: https://github.com/logdna/logdna-agent/releases/tag/1.1.0
