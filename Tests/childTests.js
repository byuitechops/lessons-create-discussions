/*eslint-env node, es6*/

/* Dependencies */
const tap = require('tap');

function g1Tests(course, callback) {
	var created = course.logs.filter((log) => {
		return log.title == `Discussion Topics Created in Canvas`;
	});

	tap.equal(created.length, 2);
	tap.equal(created[0].data['Discussion Topic Name'], 'W01: Notes from Instructor');
	tap.equal(created[1].data['Discussion Topic Name'], 'W02: Notes from Instructor');
	tap.equal(created[0].data['Module Name'], 'Lesson 01: Child 17');
	tap.equal(created[1].data['Module Name'], 'Week 2: Child 18');

	var modulesMade = course.logs.filter((log) => {
		return log.title == 'Created module item \'Notes from Instructor\'';
	});

	tap.equal(modulesMade.length, 2);
	tap.equal(modulesMade[0].data[`Module Item Name`], `W01: Notes from Instructor`);
	tap.equal(modulesMade[1].data[`Module Item Name`], `W02: Notes from Instructor`);

	callback(null, course);
}


module.exports = [
	{
		gauntlet: 1,
		tests: g1Tests
        }
];
