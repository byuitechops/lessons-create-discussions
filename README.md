# Notes from Instructor
### *Package Name*: notes-from-instructor
### *Child Type*: post import
### *Platform*: online
### *Required*: Recommended

This child module is built to be used by the Brigham Young University - Idaho D2L to Canvas Conversion Tool. It utilizes the standard `module.exports => (course, stepCallback)` signature and uses the Conversion Tool's standard logging functions. You can view extended documentation [Here](https://github.com/byuitechops/d2l-to-canvas-conversion-tool/tree/master/documentation).

## Purpose

All online courses are meant to have a 'Notes from Instructor' discussion topic in each week's module. This child module addresses this issue and creates one in each week's module if one does not already exist.

## How to Install

```
npm install notes-from-instructor
```

## Run Requirements

None

## Options

None

## Outputs

None

## Process

1. Check to see if the current course is an online course or not
	- If it is an online course, run the module
	- If not, throw a warning and skip this child module (only online courses need a 'Notes from Instructor' discussion topic)
2. Get the module list and loop through each of them
3. Check if the module already has the discussion topic:
	- If it does have the discussion topic, don't make a new one for it and move to the next module in the loop
	- If it doesn't have the discussion topic, continue to make a new one for the module
4. Make the discussion topic if the module name is 'Week x' or 'Lesson x'
5. Make a module item and link it to the discussion topic
6. Set the module item to 'published'

## Log Categories

- Discussion Topics Created in Canvas
- Created Module Item 'Notes from Instructor'
- Published Module Item 'Notes from Instructor'

## Requirements

1. Each week's module will have a Notes from Instructor discussion topic