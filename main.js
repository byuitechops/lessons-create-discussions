/*eslint-env node, es6*/
/* eslint no-console:0 */

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
        canvas.getModules(course.info.canvasOU, (getErr, module_list) => {
            if (getErr) {
                course.throwErr(`lessons-create-discussions`, getErr);
                return;
            } else {
                course.success(`lessons-create-discussions`, `Successfully retrieved the modules.`);

                asyncLib.eachLimit(module_list, 2, (module, eachLimitCallback) => {
                    console.log(module.name);

                    /* Swap module.name with lessonList */
                    /* Only create discussion boards if the module name includes 'Lesson xx' or 'Lxx' */
                    if (regex1.test(module.name) || module.name.includes(lessonList)) {
                        console.log(`It workedddddd`);

                        /* Create a discussion board */
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
                                    console.log(`1`);
                                    return;
                                }
                                course.success(`lessons-create-discussions`, `Successfully created the Discussion Topic in module ${module.id}`);
                                console.log(`2`);
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
                                            course.throwErr(`lessons-create-discussions`, postItemErr);
                                            return;
                                        }
                                        course.success(`lessons-create-discussions`, `Created module item \'Notes from Instructuor\'`)
                                        course.success('lessons-create-discussions', 'lessons-create-discussions successfully created and dispersed');
                                        console.log(`2`);
                                        stepCallback(null, course);
                                    });

                                course.success('lessons-create-discussions', 'lessons-create-discussions successfully created and dispersed');
                                stepCallback(null, course);
                            });

                    } else {
                        console.log(`Errorrrr`);
                    }
                    console.log(`The end`);
                }, (err) => {
                    if (err) {
                        course.throwErr(`lessons-create-discussions`, err);
                        course.success('lessons-create-discussions', 'lessons-create-discussions successfully created and dispersed');
                        stepCallback(null, course);
                        return;
                    }
                    console.log(`7`);
                });
                /* Used to log successful actions */
                console.log(`4`);
            }
            console.log(`5`);

        });
        console.log(`6`);
    }, 20000);

}
