# UBIX Solution Tools

CLI tools for UBIX solutions

## Installation

     npm install -g https://github.com/Ubix/ubixsolutiontools

## Create a Solution

     ubix create <solutionname>
     
This will create a folder called _solutionname_ with the following:
 
* `data` folder
* `scripts` folder (prefilled with `R` and `py` folders)
* `dsl` folder
* `ubix.json` solution manifest
 
## Get Solution Information

     ubix info

## Managing Solution Version

Solutions use [Semantic Versining](http://semver.org/).

You can view the current solution version with:

     ubix version
     
Run this in the root folder of the solution.

To set it to a new version you can use one of:

     ubix version -v <new-version>
     ubix version -M <major-version-increment>
     ubix version -m <minor-version-increment>
     ubix version -p <patch-version-increment>

## Packaging a Solution

Solutions must be packaged in order to upload to a UBIX cluster.

     ubix package
          
Run this in the root folder of the solution.

## Getting Help

     ubix --help
     ubix <command> --help

# The Solution

The solution wraps up the files needed for the Ubix platform to perform your analysis.

## Folders

The solution has the following folders:

* `data` - any (relatively small) data sets you want to reference.
* `scripts` - any non-DSL scripts you might run in the platform.
  * `R` - R scripts
  * `py` - python scripts
* `dsl` - any DSL scripts you might run in the platform.

Content outside these folders will not be packaged into the solution.

## `ubix.json`

The `ubix.json` file is the manifest of the solution.  It is created when the solution is generated.

### Execute scripts

You can add an `execute` section to your `ubix.json` file to provide a list of scripts
you want to run directly from the UBIX management console.  For example:

     "execute":{
       "test":"test.dsl",
       "init":"initalize.dsl",
       "prep-data-1":"datasets/data1/prep.dsl"
     }
     
The name of each entry is shown on the Solution page as a link.  Clicking that link will
execute the specified script.  Scripts are assumed to be in the `dsl` folder (or in a folder
under that).

### Solution File References

If you want to reference a solution file in a DSL script, you should use a `SFILE` tag so
that it will be properly set up once it has been uploaded.

For example, if you wanted to execute another script in one of your dsl scripts you would specify the command as:

     script loadexec-file -s http -p %%SFILE(myscript.dsl)%% -f --scriptName myScript
     
The `%%SFILE(` _filepath_ `)%%` tag will be replaced on upload with the correct url for that file.

The _filepath_ can either be relative to the current file, or "absolute" from the root of the solution.
(so `%%SFILE(/dsl/myscript.dsl)%%` would be the equivalent absolute path, assuming `myscript.dsl` is
in the `dsl` folder.
