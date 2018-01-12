/*eslint-env node, es6*/

/* Module Description */

/* Put dependencies here */

/* Include this line only if you are going to use Canvas API */
const canvas = require('canvas-wrapper');
const asyncLib = require('async');

/* View available course object functions */
// https://github.com/byuitechops/d2l-to-canvas-conversion-tool/blob/master/documentation/classFunctions.md

module.exports = (course, stepCallback) => {

	/* Check against the module name, whether it's 'Lesson xx' or 'Lxx' */
	var regex1 = /^(L0\d$)|(L1[0-4])$/gi;
	var lessonList = 'Lesson';
	/* Create the module report so that we can access it later as needed.
	This MUST be done at the beginning of each child module. */
	course.addModuleReport('lessons-create-discussions');
	setTimeout(() => {
		/**********************************************
		 * 				START HERE					  *
		 **********************************************/
		canvas.get(`/api/v1/courses/${course.info.canvasOU}/modules`, (getErr, module_list) => {
			if (getErr) {
				course.throwErr(`lessons-create-discussions`, getErr);
				return;
			} else {
				course.success(`lessons-create-discussions`, `Successfully retrieved the modules.`);

				module_list.forEach(module => {
					console.log(module.name);
				  /* Swap module.name with lessonList */
					if (regex1.test(module.name) || module.name.includes(lessonList)) {
						console.log(`It workedddddd`);
						canvas.post(`/api/v1/courses/${course.info.canvasOU}/discussion_topics`, {
								'title': 'Notes from Instructor',
								'discussion_type': 'threaded',
								'allow_rating': true,
								'sort_by_rating': true,
							},
							(postErr, discussion) => {
								if (postErr) {
									// handle errs in the functionCallback
									course.throwErr(`lessons-create-discussions`, postErr);
									return;
								}
								course.success(`lessons-create-discussions`, `Successfully created the Discussion Topic in module ${module.id}`);
							});
					} else {
						console.log(`Errorrrr`);
					}
				});
				/* Used to log successful actions */
				course.success('lessons-create-discussions', 'lessons-create-discussions successfully created and dispersed');
				stepCallback(null, course);
			}
		});
	}, 15000);

}
