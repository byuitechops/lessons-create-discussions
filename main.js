/*eslint-env node, es6*/

/* Module Description */
/* All online courses are meant to have a 'Notes from Instructor' discussion topic in each week's module. This child module addresses this issue and creates one in each week's module if one does not already exist. */

const canvas = require('canvas-wrapper');
const asyncLib = require('async');

var weekNum = 0;

module.exports = (course, stepCallback) => {
    /*******************************************************************
	 * Name: getLessonModules()
	 * Parameters: none
     * Description: Get a list of the lesson modules and loop through 
     * each to create a discussion topic in each of the lesson modules
	 *******************************************************************/
    function getLessonModules() {
        /* Get the moduleList */
        canvas.getModules(course.info.canvasOU, (getErr, moduleList) => {
            if (getErr) {
                course.error(getErr);
                stepCallback(null, course);
                return;
            }
            course.message(`Successfully retrieved ${moduleList.length} modules.`);
    
            /* filter out modules that aren't Weeks / Lessons */
            moduleList = moduleList.filter((module) => {
                return /(Week|Lesson)\s*(1[0-4]|0?\d(\D|$))/gi.test(module.name);
            });
    
            /* Loop through each module in moduleList */
            asyncLib.eachSeries(moduleList, waterfallFunction, (eachErr) => {
                if (eachErr) {
                    course.error(eachErr);
                } else {
                    /* Finished */
                    course.message('Successfully completed notes-from-instructor');
                }
                stepCallback(null, course);
            });
        });
    }
    
    /***********************************************************************************
	 * Name: checkForExistingDiscussion()
	 * Parameters: module, checkForExistingDiscussionCallback()
     * Description: First check to see if a 'Notes from Instructor' discussion topic 
     * already exists in the module, and if not then call the next function to make one
	 ***********************************************************************************/
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

    /***********************************************************************
	 * Name: makeDiscussion()
	 * Parameters: module, makeDiscussionCallback()
     * Description: Create the discussion topic if it doesn't already exist
	 ***********************************************************************/
    function makeDiscussion(module, makeDiscussionCallback) {
        /* Module should have been set to null in checkForExistingDiscussion() if the discussion topic 
		already exists in the module, so as to not run the following functions which would create a duplicate */
        if (module == null || module == undefined) {
            /* Keep module set to null to tell the next function not to run */
            makeDiscussionCallback(null, null, null);
            return;
        }

        var moduleTitle = module.name;
        var titleArray = moduleTitle.split(' ');

        /* Get the week number */
        /* Add 0 to week number if not present */
        titleArray.forEach((item, index) => {
            if (item == 'Week' || item == 'Lesson') {
                /* Replace each non-digit with nothing */
                weekNum = titleArray[index + 1].replace(/\D+/g, '');

                if (weekNum.length == 1) {
                    /* Add 0 to the beginning of the number if single digit */
                    weekNum = weekNum.replace(/^/, '0');
                }
            }
        });

        /* Make a discussion board */
        canvas.post(`/api/v1/courses/${course.info.canvasOU}/discussion_topics`, {
            'title': `W${weekNum} Notes from Instructor`,
            'discussion_type': 'threaded',
            'allow_rating': true,
            'sort_by_rating': false,
            'published': true,
        },
        (postErr, newDiscussionTopic) => {
            if (postErr) {
                makeDiscussionCallback(postErr);
                return;
            }

            course.log('Discussion Topics Created in Canvas', {
                'Module ID': module.id,
                'Discussion Topic Name': newDiscussionTopic.title,
                'Discussion Topic ID': newDiscussionTopic.id,
                'Module Name': module.name,
            });

            /* Now waterfall and pass the module to the next function to make a module item */
            makeDiscussionCallback(null, module, newDiscussionTopic);
        });

        
    }

    /******************************************************************************
	 * Name: makeModuleItem()
	 * Parameters: module, newDiscussionTopic, makeModuleItemCallback()
     * Description: Make the discussion topic's module item in the modules section
	 ******************************************************************************/
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
            course.log('Created Module Item \'Notes from Instructor\'', {
                'Module ID': moduleItem.id,
                'Module Item Name': moduleItem.title,
            });

            /* Call the next waterfall function, passing it these parameters */
            makeModuleItemCallback(null, moduleItem, module);
        });
    }

    /*****************************************************************************
	 * Name: publishModuleItem()
	 * Parameters: moduleItem, module, publishModuleItemCallback()
     * Description: Set each of the discussion topic's module items to 'Published'
	 *****************************************************************************/
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
            course.log('Published Module Item \'Notes from Instructor\'', {
                'Module ID': updatedModuleItem.id,
                'Module Item Name': updatedModuleItem.title,
            });

            /* Finished with no errors */
            publishModuleItemCallback(null);
        });
    }

    /*************************************************************
	 * Name: waterfallFunction()
	 * Parameters: module, makeModuleItemCallback()
     * Description: Send each function through an async Waterfall
	 *************************************************************/
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
                course.error(waterfallErr);
            }
            waterfallCallback(null);
        });
    }

    /**********************************************
	 * 				START HERE					  *
	 **********************************************/
    /* Only run child module if it is an online course. Notes from Instructor are only for online classes */
    if (course.settings.online === false) {
        course.warning('Not an online course, this child module should not run.');
        stepCallback(null, course);
        return;
    } else {
        getLessonModules();
    }
};