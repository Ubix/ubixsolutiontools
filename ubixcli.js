#!/usr/bin/env node --harmony

var program = require('commander');
var fs = require('fs-extra');
var sanitize = require('sanitize-filename');
var path = require('path');
var prompt = require ('prompt');
var archiver = require('archiver');

var namePattern = /^[\w\- ]+$/;
var versionPattern = /^\d+\.\d+\.\d+$/;
var apiPattern = /(latest|^\d+\.\d+\.\d+$)/;

function validatedParam(params, param, opts) {
    opts = opts || {};
    var val = null;
    var error = null;
    if (params[param] && typeof params[param] === 'string') {
        val = params[param];

        if (opts.validationPattern && !val.match(opts.validationPattern)) {
            error = opts.errorMessage || ('invalid value for ' + param + ': ' + val);
            val = null;
        } else if (opts.isInt) {
            var ival = parseInt(val);
            if (isNaN(ival)) {
                error = opts.errorMessage || ('invalid value for ' + param + ': ' + val);
                val = null;
            } else {
                val = ival;
            }
        }
    }

    if (opts.errors && error) {
        opts.errors.push(error);
    } else if (error) {
        console.log('Error: ' + error);
        process.exit(1);
    }
    return val;
}

program
    .command('init <solution_name>')
    .alias('create')
    .description('initialize a Ubix solution repository.')
    .option('-p, --path <path>', 'Path to root of ubix solution. Defaults to current folder.')
    .option('-A, --author <author>', 'Author of solution.')
    .option('-v, --version <version>', 'Solution version. Defaults to 1.0.0')
    .option('-V, --api <api>', 'UBIX API version. Defaults to latest')
    .action(function(solutionName, options) {
        var rootpath = options.path || '.';
        var sanitizedName = sanitize(solutionName);
        var solutionPath = path.join(rootpath, sanitizedName);

        try {
            fs.statSync(solutionPath);
            console.log('Cannot create solution at ' + solutionPath + ': folder already exists.');
            process.exit(1);
        } catch (e) {
            if (e.code != 'ENOENT') {
                console.log('Cannot create solution at ' + solutionPath + ': ' + e);
                process.exit(1);
            }
        }

        options.name = solutionName;

        // validate options
        prompt.start();
        prompt.message = '';
        prompt.delimiter = ':';

        var argErrors = [];
        prompt.override = {
            name: validatedParam(options, 'name', { validationPattern:namePattern, errors:argErrors }),
            author: validatedParam(options, 'author'),
            version: validatedParam(options, 'version', { validationPattern:versionPattern, errors:argErrors }),
            api: validatedParam(options, 'api', { validationPattern:apiPattern, errors:argErrors })
        };
        if (argErrors.length > 0) {
            console.log('Errors in parameters:\n  * ' + argErrors.join('\n  * '));
        }

        prompt.get({
            properties: {
                name: { description: 'Solution name', default: solutionName, pattern: namePattern, required: true },
                author: { description: 'Author', default: '' },
                version: { description: 'Solution version', default: '0.0.0', patterns: versionPattern, required: true },
                api: { description: 'UBIX API version', default: 'latest', patterns: apiPattern }
            }
        }, function (err, result) {
            if (err) {
              console.log('Error processing parameters: ' + err);
              process.exit(1);
            }
            console.log('Creating solution at ' + solutionPath);
            try {
                fs.ensureDirSync(path.join(solutionPath, 'data'));
                fs.ensureDirSync(path.join(solutionPath, 'scripts'));
                fs.ensureDirSync(path.join(solutionPath, 'scripts', 'R'));
                fs.ensureDirSync(path.join(solutionPath, 'scripts', 'py'));
                fs.ensureDirSync(path.join(solutionPath, 'dsl'));
                result.path = path.relative('/', solutionPath);
                result.fileName = sanitizedName;
                result.lastUpdate = (new Date()).toString();
                fs.writeFileSync(path.join(solutionPath, 'ubix.json'), JSON.stringify(result, null, 4) + '\n');
            } catch (err) {
                console.log('Failed to create solution: ' + err);
            }
      });
    });

function getSolutionFile(options) {
    var solutionFile = options.solution ||  './ubix.json';
    try {
        var stats = fs.statSync(solutionFile);
        if (!stats.isFile()) {
            console.log('Solution file ' + solutionFile + ' is wrong type.');
            process.exit(1);
        }
    } catch (e) {
        if (e.code == 'ENOENT') {
            console.log('Cannot find solution file at ' + solutionFile);
        } else {
            console.log('Error with solution file at ' + solutionFile + ': ' + e);
        }
        process.exit(1);
    }
    return solutionFile;
}

function updateVersion(fromVersion, params) {
    var argErrors = [];
    var newVersion = validatedParam(params, 'version', { validationPattern:versionPattern, errors:argErrors });
    var majorIncrement = validatedParam(params, 'major', { isInt:true, errors:argErrors }) || 0;
    var minorIncrement = validatedParam(params, 'minor', { isInt:true, errors:argErrors }) || 0;
    var patchIncrement = validatedParam(params, 'patch', { isInt:true, errors:argErrors }) || 1;

    if (!newVersion) {
        var splitFromVersion = fromVersion.split('.');
        var newMajor = parseInt(splitFromVersion[0]) + majorIncrement;
        var newMinor = parseInt(splitFromVersion[1]) + minorIncrement;
        var newPatch = parseInt(splitFromVersion[2]) + patchIncrement;
        if (newMajor < 0) argErrors.push('Invalid major version increment: ' + majorIncrement);
        if (newMinor < 0) argErrors.push('Invalid major version increment: ' + majorIncrement);
        if (newPatch < 0) argErrors.push('Invalid major version increment: ' + majorIncrement);
        newVersion = newMajor + '.' + newMinor + '.' + newPatch;
    }

    if (argErrors > 0) {
        console.log('Errors:\n  * ' + argErrors.join('\n  * '));
        process.exit(1);
    }

    return newVersion;
}

program
    .command('version [update]')
    .alias('ver')
    .description('reversion the solution package')
    .option('-s, --solution <solution>', 'The solution file.  Defaults to ./ubix.json')
    .option('-v, --version <version>', 'Set new version for solution')
    .option('-m, --minor [minor]', 'Increment minor version (by minor amount)')
    .option('-M, --major [major]', 'Increment major version (by major amount)')
    .option('-p, --patch [patch]', 'Increment patch version (by patch amount)')
    .action(function(update, options) {
        var update = (update == 'update' || update == 'set');
        var solutionFile = getSolutionFile(options);

        fs.readFile(solutionFile, function(err, manifest) {
            if (err) {
                console.log('Error reading solution file: ' + solutionFile + ': ' + err);
                process.exit(1);
            }
            try {
                manifest = JSON.parse(manifest);
            } catch (err) {
                console.log('Invalid solution manifest file: ' + solutionFile + ': ' + err);
                process.exit(1);
            }

            if (update) {
                var newVersion = updateVersion(manifest.version, options);
                manifest.version = newVersion;
                manifest.lastUpdate = (new Date()).toString();
                fs.writeFile(solutionFile, JSON.stringify(manifest, null, 4) + '\n');
                console.log('Version updated to ' + newVersion);
            } else {
                console.log('Version is ' + manifest.version);
            }
        })
    });

program
    .command('info')
    .description('information on the solution package')
    .option('-s, --solution <solution>', 'The solution file.  Defaults to ./ubix.json')
    .action(function(options) {
        var solutionFile = getSolutionFile(options);

        fs.readFile(solutionFile, function(err, manifest) {
            if (err) {
                console.log('Error reading solution file: ' + solutionFile + ': ' + err);
                process.exit(1);
            }
            try {
                manifest = JSON.parse(manifest);
            } catch (err) {
                console.log('Invalid solution manifest file: ' + solutionFile + ': ' + err);
                process.exit(1);
            }

            console.log(JSON.stringify(manifest, null, 4));
        })
    });

program
    .command('package')
    .alias('pack')
    .description('Package solution for upload')
    .option('-p, --path <path>', 'The path to the solution folder.  Defaults to .')
    .option('-f, --file <file>', 'The file to output the packages solution to.  Defaults to ubix.zip in solution folder.')
    .action(function(options) {
        var solutionPath = options.path || '.';

        try {
            fs.statSync(solutionPath);
            var stats = fs.statSync(solutionPath);
            if (!stats.isDirectory()) {
                console.log('Solution path ' + solutionPath + ' is wrong type.');
                process.exit(1);
            }
        } catch (e) {
            if (e.code == 'ENOENT') {
                console.log('Cannot find solution at ' + solutionPath);
            } else {
                console.log('Error with solution at ' + solutionPath + ': ' + e);
            }
            process.exit(1);
        }

        // confirm the solution manifest exists
        options.solution = path.join(solutionPath, 'ubix.json').toString();
        var solutionFile = getSolutionFile(options);

        var outputFile = options.file || path.join(solutionPath, 'ubix.zip');
        var output = fs.createWriteStream(outputFile);
        var archive = archiver('zip', {});

        output.on('close', function () {
            console.log('Solution package created at ' + outputFile);;
            console.log(archive.pointer() + ' total bytes');
        });

        archive.on('error', function(err){
            throw 'Error creating solution package: ' + err;
        });

        archive.pipe(output);
        archive
            .directory(path.join(solutionPath, 'data'), 'data')
            .directory(path.join(solutionPath, 'scripts'), 'scripts')
            .directory(path.join(solutionPath, 'dsl'), 'dsl')
            .file(solutionFile, { name: 'ubix.json' });
        archive.finalize();
    });

program.parse(process.argv);
