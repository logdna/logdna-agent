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

To run all the tests & validations (including `jshint` and `jscs` for code style) do:

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

To enable logs for the [index.js](https://github.com/sedouard/logdna-agent/blob/master/index.js) file just set the environment variable `DEBUG`:

```bash
# Unix/Linux
export DEBUG=logdna:index
# windows
set DEBUG=logdna:index
```

This enables `debug` log messages for the [index.js](https://github.com/sedouard/logdna-agent/blob/master/index.js) file.

You can also enable one or more modules to log by using `*`:

```bash
# Unix/Linux
export DEBUG=logdna:*
# windows
set DEBUG=logdna:lib:lib:api-client,logdna:index
```

You can use this to control which parts of the agent logs it's debug output.

## Building

To build the agent, ensure you have [nexe](https://www.npmjs.com/package/nexe) installed. This packages the logdna agent as a native executable with the node.js runtime bundled. This will automatically build the runtime from source.

### Linux/OS X

Ensure you have a native C++ compiler installed.

### Windows

Ensure you have Visual Studio 2015 or newer installed.

### Creating the Executable

To start the build do:

```
grunt build
```

For first-time initial build, use:
```
grunt build --force
```
Node.js is built on initial build and grunt might timeout and fail, using --force will override timeout.

This takes a bit of time and will output a binary at `./logdna-agent` (or `.\logdna-agent.exe` if on Windows).

## Packaging

### Linux

Install [fpm](https://github.com/jordansissel/fpm) using `gem`. Then do:

```
grunt linux
```

This will output the `deb` and `yum` files to the root of the repo.

### Windows

Install [chocolatey](https://chocolatey.org). Then do:

```
grunt windows
```

This will output the chocolatey package under `./.builds/windows`.
