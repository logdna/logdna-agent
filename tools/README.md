# How to Build

## Requirements
- Update the [`CHANGELOG`](../CHANGELOG.md)
- Update the `version` in [`package.json`](../package.json#L3)
- Update the `version` in [`logdna-agent.rb`](./files/darwin/logdna-agent.rb#L2)
- Update the `version` in [`logdna-agent.nuspec`](./files/win32/logdna-agent.nuspec#L7)

## LogDNA Agent for Debian Systems
LogDNA Agent can be built and released for Debian systems by running the `scripts/debian.sh` script:
`bash tools/scripts/debian.sh`

### Dependencies
- `Node.js: v8.3.0` and `NPM: v5.3.0`
- `NEXE: v3.3.3` by `npm install -g nexe@3.3.3`
- `fpm` by `sudo gem install --no-document fpm`
- `ghr` by `go get -u github.com/tcnksm/ghr`
- `deb-s3` by `sudo gem install deb-s3`

### Environment Variables
- `AWS_ACCESS_KEY`
- `AWS_SECRET_KEY`
- `GITHUB_API_TOKEN`

### Steps
1. Compile the source code into the executable
2. Package the executable into the Debian package
3. Create / Update the GitHub Release for the specified tag by uploading the Debian package
4. Publish the Debian package into the specified S3 bucket

## LogDNA Agent for RedHat Systems
LogDNA Agent can be built and released for RedHat systems by running the `scripts/redhat.sh` script from the project directory:
`bash tools/scripts/redhat.sh`

### Dependencies
- `Node.js: v8.3.0` and `NPM: v5.3.0`
- `NEXE: v3.3.3` by `npm install -g nexe@3.3.3`
- `fpm` by `sudo gem install --no-document fpm`
- `ghr` by `go get -u github.com/tcnksm/ghr`
- `rpm-s3` by `git clone https://github.com/crohr/rpm-s3 --recurse-submodules`

### Environment Variables
- `AWS_ACCESS_KEY`
- `AWS_SECRET_KEY`
- `GITHUB_API_TOKEN`

### Steps
1. Compile the source code into the executable
2. Package the executable into the RedHat package
3. Create / Update the GitHub Release for the specified tag by uploading the RedHat package
4. Publish the RedHat package into the specified S3 bucket

## LogDNA Agent for Darwin Systems
LogDNA Agent can be built and released for Darwin systems by running the `scripts/darwin.sh` script from the project directory:
`bash tools/scripts/darwin.sh`

### Dependencies
- `Node.js: v8.3.0` and `NPM: v5.3.0`
- `NEXE: v3.3.3` by `npm install -g nexe@3.3.3`
- `fpm` by `sudo gem install --no-document fpm`
- `ghr` by `brew install ghr`

### Environment Variables
- `GITHUB_API_TOKEN`

### Steps
1. Compile the source code into the executable
2. Package the executable into the MacOSX package
3. Create / Update the GitHub Release for the specified tag by uploading the MacOSX package
4. Sign the MacOSX package using the private keychain
5. Publish the MacOSX package by creating a Pull Request to update [logdna-agent.rb](https://github.com/Homebrew/homebrew-cask/blob/master/Casks/logdna-agent.rb) using [logdna-bot/homebrew-cask](https://github.com/logdnabot/homebrew-cask)

## LogDNA Agent for Win32 Systems
LogDNA Agent can be built and released for Win32 systems by running the `scripts/win32.sh` script from the project directory:
`./tools/scripts/win32.sh`

### Dependencies
- `choco` by `iex ((new-object net.webclient).DownloadString('https://chocolatey.org/install.ps1'))` on `PowerShell`
- `nssm` by `choco install -y nssm`
- `Node.js: v8.3.0` and `NPM: v5.3.0` by `choco install nodejs --version=8.3.0`
- `NEXE: v3.3.3` by `npm install -g nexe@3.3.3`
- `ghr` by `go get -u github.com/tcnksm/ghr`

### Environment Variables
- `GITHUB_API_TOKEN`
- `CHOCO_API_KEY`

### Steps
1. Compile the source code into the executable
2. Package the executable into the NuPKG package
3. Create / Update the GitHub Release for the specified tag by uploading the NuPKG package
4. Publish the NuPKG package into [Chocolatey](https://chocolatey.org/packages/logdna-agent)
