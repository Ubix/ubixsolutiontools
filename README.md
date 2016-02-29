# UBIX Solution Tools

CLI tools for UBIX solutions

## Installation

     npm install -g https://github.com/FrostVenturePartners/ubixsolutiontools

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
