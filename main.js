/*eslint-env node, es6*/
/* eslint no-console:0 */

/* Module Description */

/* Put dependencies here */

/* Include this line only if you are going to use Canvas API */
const canvas = require('canvas-wrapper');
const asyncLib = require('async');

var weekNum = 0;
var topic;
var currentModule;

/* View available course object functions */
// https://github.com/byuitechops/d2l-to-canvas-conversion-tool/blob/master/documentation/classFunctions.md

module.exports = (course, stepCallback) => {

    /********************************************
     * makeDiscussion()
     * Parameters: module, makeDiscussionCallback()
     ********************************************/
    function makeDiscussion(module, makeDiscussionCallback) {
        /* Only create discussion boards if the module name includes 'Lesson x' or 'Week x' */
        if (/(Week|Lesson)\s*\d+/gi.test(module.name)) {
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
                (postErr, discussion) => {
                    if (postErr) {
                        makeDiscussionCallback(postErr);
                        return;
                    }

                    /* Copy discussion to a global variable to pass to the next function */
                    topic = discussion;
                    course.log(`Discussion Topics Created in Canvas`, {
                        'Module ID': module.id,
                        'Discussion Topic Name': discussion.title,
                        'Discussion Topic ID': discussion.id,
                        'Module Name': module.name,
                    });

                    /* Now waterfall and pass the module to the next function to make a module item */
                    makeDiscussionCallback(null, module);
                });
        } else {
            makeDiscussionCallback(null, null);
        }
    }

    /********************************************
     * makeModuleItem()
     * Parameters: module, makeModuleItemCallback()
     ********************************************/
    function makeModuleItem(discussionTopic, makeModuleItemCallback) {
        /* Check to see if a discussion topic was made that needs to be linked to */
        /* discussionTopic should be null if the module name didn't have 'Week x' or 'Lesson x' in the title */
        if (discussionTopic == null) {
            /* The next function takes two parameters and a callback. Only passing one null will not define the callback */
            makeModuleItemCallback(null, null, null);
            return;
        }

        /* Create a module item and link it to the new discussion board */
        canvas.post(`/api/v1/courses/${course.info.canvasOU}/modules/${discussionTopic.id}/items`, {
                'module_item': {
                    'title': `W${weekNum} Notes from Instructor`,
                    'type': 'Discussion',
                    'content_id': topic.id,
                    'position': 1,
                }
            },
            (postItemErr, moduleItem) => {
                if (postItemErr) {
                    makeModuleItemCallback(postItemErr);
                    return;
                }
                course.log(`Created module item \'Notes from Instructor\'`, {
                    'Module ID': moduleItem.id,
                    'Module Item Name': moduleItem.title,
                });

                makeModuleItemCallback(null, moduleItem, discussionTopic);
            });
    }

    /********************************************
     * publishModuleItem()
     * Parameters: moduleItem, discussionTopic, 
     *             publishModuleItemCallback()
     ********************************************/
    function publishModuleItem(moduleItem, discussionTopic, publishModuleItemCallback) {
        /* If the discussion topic or module item were not created, then skip this function */
        if (moduleItem == undefined || discussionTopic == undefined) {
            publishModuleItemCallback(null);
            return;
        }

        /* Update module item to publish it */
        canvas.put(`/api/v1/courses/${course.info.canvasOU}/modules/${discussionTopic.id}/items/${moduleItem.id}`, {
                'module_item': {
                    'published': true,
                }
            },
            (putItemErr, updatedModuleItem) => {
                if (putItemErr) {
                    publishModuleItemCallback(putItemErr);
                    return;
                }
                course.log(`Published module item \'Notes from Instructor\'`, {
                    'Module ID': updatedModuleItem.id,
                    'Module Item Name': updatedModuleItem.title,
                });
            
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
            makeDiscussion,
            makeModuleItem,
            publishModuleItem,
        ];

        asyncLib.waterfall(myFunctions, (waterfallErr, result) => {
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
                course.message(`Successfully completed lessons-create-discussions`);
                stepCallback(null, course);
            });
        }
    });
}
