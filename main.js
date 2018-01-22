/*eslint-env node, es6*/
/* eslint no-console:0 */

/* Module Description */

/* Put dependencies here */

/* Include this line only if you are going to use Canvas API */
const canvas = require('canvas-wrapper');
const asyncLib = require('async');

/* Check against the module name, whether it's 'Lesson xx', 'Lxx:', 'Week xx', or 'Wxx:' */
//var regex1 = /(W|L)((0?\d\D)|(1[0-4]))\s*|:/gi;
//var regex2 = /(Week|Lesson)\s*((1[0-4])|(0?\d\D))/gi;
var weekNum = ['W01', 'W02', 'W03', 'W04', 'W05', 'W06', 'W07', 'W08', 'W09', 'W10', 'W11', 'W12', 'W13', 'W14'];
var counter = 0;
/* View available course object functions */
// https://github.com/byuitechops/d2l-to-canvas-conversion-tool/blob/master/documentation/classFunctions.md

module.exports = (course, stepCallback) => {

    /********************************************
     * makeDiscussion()
     * Parameters: module_list, functionCallback()
     ********************************************/
    function makeDiscussion(module, functionCallback) {
        /* Only create discussion boards if the module name includes 'Lesson xx', 'Lxx', 'Week xx', or 'Wxx:' */
        console.log(`${module.name}`);
        if (/(Week|Lesson)\s*\d+/gi.test(module.name)) {
            console.log(`test passed`);
            console.log(`counter: ${counter}`);
            counter++;
            console.log(`counter++: ${counter}`);
            /* Make a discussion board */
            canvas.post(`/api/v1/courses/${course.info.canvasOU}/discussion_topics`, {
                    'title': `${weekNum[counter]}: Notes from Instructor`,
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
            console.log('test failed');
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
                    'title': `${weekNum[counter]}: Notes from Instructor`,
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
                course.success(`lessons-create-discussions`, `Created module item \'Notes from Instructor\'`);

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
                console.log(`modules gotten ${module_list.length}`);
                course.success(`lessons-create-discussions`, `Successfully retrieved the modules`);

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
    }, 25000);
}
