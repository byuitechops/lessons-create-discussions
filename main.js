/*eslint-env node, es6*/
/* eslint no-console:0 */

/* Module Description */

/* Include this line only if you are going to use Canvas API */
const canvas = require('canvas-wrapper');
const asyncLib = require('async');

var weekNum = 0;

/* View available course object functions */
// https://github.com/byuitechops/d2l-to-canvas-conversion-tool/blob/master/documentation/classFunctions.md

module.exports = (course, stepCallback) => {

	/********************************************
	 * checkForExistingDiscussion()
	 * Parameters: module, 
	 *			   checkForExistingDiscussionCallback()
	 ********************************************/
	function checkForExistingDiscussion(module, checkForExistingDiscussionCallback) {
		/* Get the list of module items that have the title "Notes from Instructor */
		canvas.get(`/api/v1/courses/${course.info.canvasOU}/modules/${module.id}/items?search_term=notes%20from%20instructor`,
			(getModuleItemsErr, moduleItems) => {
				if (getModuleItemsErr) {
					checkForExistingDiscussionCallback(getModuleItemsErr);
					return;
				}

				/* If the get request returned something, then the module already has a Notes from Instructor discussion topic */
				if (moduleItems == undefined || moduleItems.length < 1) {
					checkForExistingDiscussionCallback(null, module);
					return;
				}

				/* If the get request returned nothing, then continue to create the discussion topic */
				checkForExistingDiscussionCallback(null, null);
			});

	}
	/********************************************
	 * makeDiscussion()
	 * Parameters: module, makeDiscussionCallback()
	 ********************************************/
	function makeDiscussion(module, makeDiscussionCallback) {
		/* Module should have been set to null in checkForExistingDiscussion() if the discussion topic 
		already exists in the module, so as to not run the following functions which would create a duplicate */
		if (module == null || module == undefined) {
			/* Keep module set to null to tell the next function not to run */
			makeDiscussionCallback(null, null, null);
			return;
		}

		/* Only create discussion boards if the module name includes 'Lesson x' or 'Week x' */
		if (/(Week|Lesson)\s*(1[0-4]|0?\d(\D|$))/gi.test(module.name)) {
			var moduleTitle = module.name;
			var titleArray = moduleTitle.split(" ");

			/* Get the week number */
			titleArray.forEach((item, index) => {
				if (item == 'Week' || item == 'Lesson') {
					/* Replace each non-digit with nothing */
					weekNum = titleArray[index + 1].replace(/\D+/g, '');

					if (weekNum.length == 1) {
						/* Add 0 to the beginning of the number if single digit */
						weekNum = weekNum.replace(/^/, '0');
					}
					return;
				}
			});

			/* Make a discussion board */
			canvas.post(`/api/v1/courses/${course.info.canvasOU}/discussion_topics`, {
					'title': `W${weekNum} Notes from Instructor`,
					'discussion_type': 'threaded',
					'allow_rating': true,
					'sort_by_rating': true,
					'published': true,
				},
				(postErr, newDiscussionTopic) => {
					if (postErr) {
						makeDiscussionCallback(postErr);
						return;
					}

					course.log(`Discussion Topics Created in Canvas`, {
						'Module ID': module.id,
						'Discussion Topic Name': newDiscussionTopic.title,
						'Discussion Topic ID': newDiscussionTopic.id,
						'Module Name': module.name,
					});

					/* Now waterfall and pass the module to the next function to make a module item */
					makeDiscussionCallback(null, module, newDiscussionTopic);
				});

		} else {
			/* Keep the parameters being passed set to null to tell the next function not to run */
			makeDiscussionCallback(null, null, null);
		}
	}

	/********************************************
	 * makeModuleItem()
	 * Parameters: module, newDiscussionTopic,
	 *			   makeModuleItemCallback()
	 ********************************************/
	function makeModuleItem(module, newDiscussionTopic, makeModuleItemCallback) {
		/* Check to see if a discussion topic was made that needs to be linked to */
		/* newDiscussionTopic should be null if the module name didn't have 'Week x' or 'Lesson x' in the title */
		if (newDiscussionTopic == null) {
			/* The next function takes two parameters and a callback. Only passing one null will not define the callback */
			makeModuleItemCallback(null, null, null);
			return;
		}

		/* Create a module item and link it to the new discussion board */
		canvas.post(`/api/v1/courses/${course.info.canvasOU}/modules/${module.id}/items`, {
				'module_item': {
					'title': `W${weekNum} Notes from Instructor`,
					'type': 'Discussion',
					'content_id': newDiscussionTopic.id,
					'position': 1,
				}
			},
			(postItemErr, moduleItem) => {
				if (postItemErr) {
					makeModuleItemCallback(postItemErr);
					return;
				}
				course.log(`Created Module Item \'Notes from Instructor\'`, {
					'Module ID': moduleItem.id,
					'Module Item Name': moduleItem.title,
				});

				/* Call the next waterfall function, passing it these parameters */
				makeModuleItemCallback(null, moduleItem, module);
			});
	}

	/********************************************
	 * publishModuleItem()
	 * Parameters: moduleItem, module, 
	 *             publishModuleItemCallback()
	 ********************************************/
	function publishModuleItem(moduleItem, module, publishModuleItemCallback) {
		/* If the module or module item were not created, then skip this function */
		if (moduleItem == undefined || module == undefined) {
			publishModuleItemCallback(null);
			return;
		}

		/* Update module item to publish it */
		canvas.put(`/api/v1/courses/${course.info.canvasOU}/modules/${module.id}/items/${moduleItem.id}`, {
				'module_item': {
					'published': true,
				}
			},
			(putItemErr, updatedModuleItem) => {
				if (putItemErr) {
					publishModuleItemCallback(putItemErr);
					return;
				}
				course.log(`Published Module Item \'Notes from Instructor\'`, {
					'Module ID': updatedModuleItem.id,
					'Module Item Name': updatedModuleItem.title,
				});

				/* Finished with no errors */
				publishModuleItemCallback(null);
			});
	}

	/********************************************
	 * waterfallFunction()
	 * Parameters: module, makeModuleItemCallback()
	 ********************************************/
	function waterfallFunction(module, waterfallCallback) {
		var myFunctions = [
			/* This allows you to pass 'module' to the first function in waterfall */
            asyncLib.constant(module),
			checkForExistingDiscussion,
            makeDiscussion,
            makeModuleItem,
            publishModuleItem,
        ];

		asyncLib.waterfall(myFunctions, (waterfallErr) => {
			if (waterfallErr) {
				waterfallCallback(waterfallErr);
				return;
			}
			waterfallCallback(null);
		});
	}

	/**********************************************
	 * 				START HERE					  *
	 **********************************************/
	/* Only run child module if it is an online course. Notes from Instructor are only for online classes */
	if (course.settings.online == false) {
		course.warning(`Not an online course, this child module should not run.`)
		stepCallback(null, course);
		return;
	}

	/* Get the moduleList */
	canvas.getModules(course.info.canvasOU, (getErr, moduleList) => {
		if (getErr) {
			course.error(getErr);
			return;
		} else {
			course.message(`Successfully retrieved ${moduleList.length} modules.`);

			/* Loop through each module in moduleList */
			asyncLib.eachSeries(moduleList, waterfallFunction, (eachErr) => {
				if (eachErr) {
					course.error(eachErr);
					return;
				}

				/* Finished */
				course.message(`Successfully completed notes-from-instructor`);
				stepCallback(null, course);
			});
		}
	});
}
