/*eslint-env node, es6*/
/* eslint no-console:0 */

/* Module Description */

/* Put dependencies here */

/* Include this line only if you are going to use Canvas API */
const canvas = require('canvas-wrapper');
const asyncLib = require('async');

/* Check against the module name, whether it's 'Lesson xx', 'Lxx:', 'Week xx', or 'Wxx:' */
var regex1 = /(W|L)((0\d)|(1[0-4])):/gi;
var regex2 = /(Week |Lesson )((0\d)|(1[0-4]))/gi

/* View available course object functions */
// https://github.com/byuitechops/d2l-to-canvas-conversion-tool/blob/master/documentation/classFunctions.md

module.exports = (course, stepCallback) => {

    /********************************************
     * makeDiscussion()
     * Parameters: module_list, functionCallback()
     ********************************************/
    function makeDiscussion(module, functionCallback) {
        /* Only create discussion boards if the module name includes 'Lesson xx', 'Lxx', 'Week xx', or 'Wxx:' */
        if (regex1.test(module.name) || regex2.test(module.name)) {
            /* Make a discussion board */
            canvas.post(`/api/v1/courses/${course.info.canvasOU}/discussion_topics`, {
                    'title': 'Notes from Instructor',
                    'discussion_type': 'threaded',
                    'allow_rating': true,
                    'sort_by_rating': true,
                },
                (postErr, discussion) => {
                    if (postErr) {
                        functionCallback(postErr);
                        return;
                    }
                    course.success(`lessons-create-discussions`, `Successfully created the Discussion Topic in module ${module.id}`);

                    /* Create a module item and link it to the new discussion board */
                    makeModuleItem(module, discussion, functionCallback);
                });
        } else {
            functionCallback(null);
        }
    }

    /********************************************
     * makeModuleItem()
     * Parameters: module, discussion, 
     *             makeModuleItemCallback()
     ********************************************/
    function makeModuleItem(module, discussion, makeModuleItemCallback) {
        /* Create a module item and link it to the new discussion board */
        canvas.post(`/api/v1/courses/${course.info.canvasOU}/modules/${module.id}/items`, {
                'module_item': {
                    'title': 'Notes from Instructor',
                    'type': 'Discussion',
                    'content_id': discussion.id,
                    'position': 1,
                    'indent': 1,
                }
            },
            (postItemErr) => {
                if (postItemErr) {
                    makeModuleItemCallback(postItemErr);
                    return;
                }
                course.success(`lessons-create-discussions`, `Created module item \'Notes from Instructor\'`)
                makeModuleItemCallback(null);
            });
    }

    /* Create the module report so that we can access it later as needed.
    This MUST be done at the beginning of each child module. */
    course.addModuleReport('lessons-create-discussions');

    /**********************************************
     * 				START HERE					  *
     **********************************************/
    /* Large setTimeout needed in order to retrieve all modules. Does not work otherwise. */
    setTimeout(() => {
        canvas.get(`/api/v1/courses/${course.info.canvasOU}/modules`, (getErr, module_list) => {
            if (getErr) {
                course.throwErr(`lessons-create-discussions`, getErr);
                return;
            } else {
                course.success(`lessons-create-discussions`, `Successfully retrieved the modules.`);

                /* Loop through each module in module_list */
                asyncLib.each(module_list, makeDiscussion, (eachErr) => {
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
    }, 20000);
}
