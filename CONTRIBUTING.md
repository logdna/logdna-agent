# Contributing

## Github Workflow

Contributions are always welcome! Be sure to follow the [github workflow](https://guides.github.com/introduction/flow/) when contributing to this project:

* Create an issue, or comment on an issue to indicate what you are working on. This avoids work duplication.
* Fork the repository and clone to your local machine
* You should already be on the default branch `master` - if not, check it out (`git checkout master`)
* Create a new branch for your feature/fix `git checkout -b my-new-feature`)
* Write your feature/fix
* Stage the changed files for a commit (`git add .`)
* Commit your files with a *useful* commit message ([example](https://github.com/Azure/azure-quickstart-templates/commit/53699fed9983d4adead63d9182566dec4b8430d4)) (`git commit`)
* Push your new branch to your GitHub Fork (`git push origin my-new-feature`)
* Visit this repository in GitHub and create a Pull Request.

# Developer Guide

To run various tasks you'll need to have [grunt-cli](https://npmjs.com/grunt-cli) installed.

## Running the Tests

All tests are written in the [`./test`](./test) folder.

To run all the tests & validations (including `eslint` for code style) do:

```
grunt test
```

To just run the validations do:

```
grunt validate
```

This is the same command that is ran on within the CI system on pull-request.

## Debugging

Each file has a `debug` variable defined such as:

```js
var debug = require('debug')('logdna:index');
```

To enable logs for the [index.js](https://github.com/logdna/logdna-agent/blob/master/index.js) file just set the environment variable `DEBUG`:

```bash
# Unix/Linux
export DEBUG=logdna:index
# windows
set DEBUG=logdna:index
```

This enables `debug` log messages for the [index.js](https://github.com/logdna/logdna-agent/blob/master/index.js) file.

You can also enable one or more modules to log by using `*`:

```bash
# Unix/Linux
export DEBUG=*
# windows
set DEBUG=*
```

You can use this to control which parts of the agent logs it's debug output.

## Building

To build the agent, ensure you have [nexe](https://www.npmjs.com/package/nexe) installed (`npm install -g nexe@1.1.2`). This packages the LogDNA agent as a native executable with the node.js runtime bundled. This will automatically build the runtime from source.

### Linux

Ensure you have a native C++ compiler installed.

### Windows

Ensure you have Visual Studio 2015 or newer installed.

### macOS

Ensure you have Xcode 7 or newer installed.

### Creating the binary

To start the build,:

```
grunt build
```

This takes a bit of time and will output a binary at `./logdna-agent` (or `.\logdna-agent.exe` if on Windows). For the initial build, majority of time will be spent building node.js. Subsequent builds will be much faster as node.js would've already been built.

### Docker

To create the binary for Linux via Docker, run:

    docker build -t logdna-agent-build -f linux-build.Dockerfile .

`logdna-agent` will be available in the `/usr/local/bin` directory. To copy the
binary to your local machine, run:

    docker create -ti --name logdna-dummy logdna-agent-build sh
    docker cp logdna-dummy:/usr/local/bin/logdna-agent .
    docker rm -f logdna-dummy

## Packaging

### Linux

```
sudo gem install fpm
sudo yum install rpm-build createrepo
sudo yum --enablerepo=epel install dpkg-devel dpkg-dev
grunt linux
```

This will output the `deb` and `yum` files to the root of the repo.

### Windows

Install [chocolatey](https://chocolatey.org). Then do:

```
grunt windows
```

This will output the chocolatey package under `.\.builds\windows`.

### macOS

```
gem install fpm
grunt mac
```

This will output the `pkg` file to the root of the repo. Signing will likely fail since we typically sign it with our Apple Developer key, but the package should still be usable, just unsigned.
