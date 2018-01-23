/*eslint-env node, es6*/
/* eslint no-console:0 */

/* Module Description */

/* Put dependencies here */

/* Include this line only if you are going to use Canvas API */
const canvas = require('canvas-wrapper');
const asyncLib = require('async');

//var weekNum = ['W01', 'W02', 'W03', 'W04', 'W05', 'W06', 'W07', 'W08', 'W09', 'W10', 'W11', 'W12', 'W13', 'W14'];
var weekNum = 0;
var counter = 0;
var topic;

/* View available course object functions */
// https://github.com/byuitechops/d2l-to-canvas-conversion-tool/blob/master/documentation/classFunctions.md

module.exports = (course, stepCallback) => {

        /********************************************
         * makeDiscussion()
         * Parameters: module_list, functionCallback()
         ********************************************/
        function makeDiscussion(module, makeDiscussionCallback) {
            /* Only create discussion boards if the module name includes 'Lesson x' or 'Week x' */
            if (/(Week|Lesson)\s*\d+/gi.test(module.name)) {
                var moduleTitle = module.name;
                var titleArray = moduleTitle.split(" ");
                
                /* Get the week number */
                titleArray.forEach((item, index) => {
                   if (item == 'Week' || item == 'Lesson') {
                       weekNum = titleArray[index +1].replace(/\D+/g, '');
                       
                       if (weekNum.length == 1) {
                           /* Add 0 to the beginning of the number if single digit */
                           weekNum = weekNum.replace(/^/, '0');
                       }
                       return;
                   } 
                });
                
                    /* Make a discussion board */
                    canvas.post(`/api/v1/courses/${course.info.canvasOU}/discussion_topics`, {
                            'title': `W${weekNum}: Notes from Instructor`,
                            'discussion_type': 'threaded',
                            'allow_rating': true,
                            'sort_by_rating': true,
                        },
                        (postErr, discussion) => {
                            if (postErr) {
                                makeDiscussionCallback(postErr);
                                return;
                            }

                            /* Copy discussion to a global variable to pass to the next function */
                            topic = discussion;
                            course.success(`lessons-create-discussions`, `Successfully created the Discussion Topic in module ${module.id}`);

                            /* Now waterfall and pass the module to the next function to make a module item */
                            makeDiscussionCallback(null, module);
                        });
                }
                else {
                    makeDiscussionCallback(null, null);
                }
            }

            /********************************************
             * makeModuleItem()
             * Parameters: module, discussion, 
             *             makeModuleItemCallback()
             ********************************************/
            function makeModuleItem(module, makeModuleItemCallback) {
                /* Create a module item and link it to the new discussion board */
                if (module == null) {
                    makeModuleItemCallback(null);
                    return;
                }
                canvas.post(`/api/v1/courses/${course.info.canvasOU}/modules/${module.id}/items`, {
                        'module_item': {
                            'title': `W${weekNum}: Notes from Instructor`,
                            'type': 'Discussion',
                            'content_id': topic.id,
                            'position': 1,
                            'indent': 1,
                        }
                    },
                    (postItemErr) => {
                        if (postItemErr) {
                            makeModuleItemCallback(postItemErr);
                            return;
                        }
                        course.success(`lessons-create-discussions`, `Created module item \'Notes from Instructor\'`);
                        counter++;
                        makeModuleItemCallback(null);
                    });
            }

            /* Create the module report so that we can access it later as needed.
            This MUST be done at the beginning of each child module. */
            course.addModuleReport('lessons-create-discussions');

            /********************************************
             * waterfallFunction()
             * Parameters: module, discussion, 
             *             makeModuleItemCallback()
             ********************************************/
            function waterfallFunction(module, waterfallCallback) {
                var myFunctions = [
            asyncLib.constant(module),
            makeDiscussion,
            makeModuleItem
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
            /* Large setTimeout needed in order to retrieve all modules. Does not work otherwise. */
            if (course.settings.online == false) {
                course.success(`lessons-create-discussions`, `Not an online course, this child module should not run`)
                stepCallback(null, course);
                return;
            }
            setTimeout(() => {
                canvas.get(`/api/v1/courses/${course.info.canvasOU}/modules`, (getErr, module_list) => {
                    if (getErr) {
                        course.throwErr(`lessons-create-discussions`, getErr);
                        return;
                    } else {
                        course.success(`lessons-create-discussions`, `Successfully retrieved the modules`);

                        /* Loop through each module in module_list */
                        asyncLib.eachSeries(module_list, waterfallFunction, (eachErr) => {
                            if (eachErr) {
                                course.throwErr(`lessons-create-discussions`, eachErr);
                                return;
                            }

                            /* Finished */
                            course.success(`lessons-create-discussions`, `Successfully created \'Notes from Instructor\' Discussion boards and their module items`);
                            stepCallback(null, course);
                        });
                    }
                });
            }, 25000);
        }
