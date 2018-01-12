/*eslint-env node, es6*/

/* Module Description */

/* Put dependencies here */

/* Include this line only if you are going to use Canvas API */
const canvas = require('canvas-wrapper');

/* View available course object functions */
// https://github.com/byuitechops/d2l-to-canvas-conversion-tool/blob/master/documentation/classFunctions.md

module.exports = (course, stepCallback) => {
    /* Create the module report so that we can access it later as needed.
    This MUST be done at the beginning of each child module. */
    course.addModuleReport('lessons-create-discussions');

    canvas.get(`/api/v1/courses/${course.info.canvasOU}/modules`, (getErr, module_list) => {
      if (getErr) {
        course.throwErr(`disperse-welcome-folder`, getErr);
        return;
      } else {
        var manifest = course.content.find(file => {
          return file.name == 'imsmanifest.xml';
        });

        modules_length = manifest.dom('organization>item').length;

        course.success(`disperse-welcome-folder`, `Successfully retrieved ${modules_length} modules.`);
        var regex1 = /^L0\d$/gi;
        var lessonList = ['Lesson', regex1];
        
        //loop through list of modules and get the IDs
        module_list.forEach(module => {
          if (module.name.includes(lessonList)) {
            welcome_module_id = module.id;
            course.success(`disperse-welcome-folder`, `Welcome module ID: ${welcome_module_id}`);
          } else if (module.name == `Student Resources`) {
            student_resources_id = module.id;
            course.success(`disperse-welcome-folder`, `Student Resources module ID: ${student_resources_id}`);
          }
        });

        //end program if welcome_module_id == -1
        if (welcome_module_id <= -1) {
          //move on to the next child module
          course.throwWarning('disperse-welcome-folder', 'Welcome folder doesn\'t exist. Moving on...');
          stepCallback(null, course);
        } else {
          //check to see if Student Resources module exists. if not, call a function to create one
          if (student_resources_id <= -1) {
            makeStudentResourcesModule(course, (postErr, course) => {
              if (postErr) {
                course.throwErr(`disperse-welcome-folder`, postErr);
                stepCallback(null, course);
                return;
              }
              //call function to move welcome folder contents to student resources modules
              welcomeFolder(course, (welcomeErr, course) => {
                if (welcomeErr) {
                  //err handling here
                  course.throwErr('disperse-welcome-folder', welcomeErr);
                  stepCallback(null, course);
                  return;
                }
                course.success('disperse-welcome-folder', 'disperse-welcome-folder successfully completed.');
                stepCallback(null, course);
              });
            });
          }
        }
      }
    });





    canvas.post(`/api/v1/courses/${course.info.canvasOU}/discussion_topics`, {
        'title': 'Notes from Instructor',
        'discussion_type': 'threaded',
        'allow_rating': true,
        'sort_by_rating': true,
      },
      (postErr, discussion) => {

      });


    /* Used to log successful actions */
    course.success('lessons-create-discussions', 'lessons-create-discussions successfully created and dispersed);

      /* How to report an error (Replace "lessons-create-discussions") */
      // course.throwErr('lessons-create-discussions', e);

      /* You should never call the stepCallback with an error. We want the
      whole program to run when testing so we can catch all existing errors */

      stepCallback(null, course);
    };
