/*eslint-env node, es6*/
/* eslint no-console:0 */

/* Module Description */

/* Put dependencies here */

/* Include this line only if you are going to use Canvas API */
const canvas = require('canvas-wrapper');
const asyncLib = require('async');


/* Check against the module name, whether it's 'Lesson xx' or 'Lxx' */
var regex1 = /^(L0\d$)|(L1[0-4])$/gi;
var lessonList = 'Lesson';

/* View available course object functions */
// https://github.com/byuitechops/d2l-to-canvas-conversion-tool/blob/master/documentation/classFunctions.md

module.exports = (course, stepCallback) => {

    /********************************************
     * makeDiscussion()
     * Parameters: module_list, functionCallback()
     ********************************************/
    function makeDiscussion(module, functionCallback) {
        /* Swap module.name with lessonList */
        /* Only create discussion boards if the module name includes 'Lesson xx' or 'Lxx' */
        if (regex1.test(module.name) || module.name.includes(lessonList)) {
            /* Make a discussion board */
            canvas.post(`/api/v1/courses/${course.info.canvasOU}/discussion_topics`, {
                    'title': 'Notes from Instructor',
                    'discussion_type': 'threaded',
                    'allow_rating': true,
                    'sort_by_rating': true,
                },
                (postErr, discussion) => {
                    if (postErr) {
//                      console.log(`1`);
//                      handle errs in the functionCallback
                        functionCallback(postErr);
                        return;
                    }
//                  console.log(`2`);
                    course.success(`lessons-create-discussions`, `Successfully created the Discussion Topic in module ${module.id}`);

                    makeModuleItem(module, discussion, functionCallback);
                });
        }
    }

    /********************************************
     * makeModuleItem()
     * Parameters: functionCallback()
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
              console.log(`3`);
                makeModuleItemCallback();
            });
    }

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

                asyncLib.each(module_list, makeDiscussion, (eachErr) => {
                    console.log('test');
                    if (eachErr) {
                        course.throwErr(`lessons-create-discussions`, eachErr);
                        return;
                    }
                    course.success(`lessons-create-discussions`, `Successfully created \'Notes from Instructor\' Discussion boards and their module items`);
                    stepCallback(null, course);
                });
            }
        });
    }, 20000);
}
