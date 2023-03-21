import { Interception } from 'cypress/types/net-stubbing';
import { TextExercise } from 'app/entities/text-exercise.model';
import { Course } from 'app/entities/course.model';
import { convertCourseAfterMultiPart } from '../../../support/requests/CourseManagementRequests';
import { courseManagementRequest, courseOverview, textExerciseEditor } from '../../../support/artemis';
import { admin, studentOne } from '../../../support/users';

describe('Text exercise participation', () => {
    let course: Course;
    let exercise: TextExercise;

    before(() => {
        cy.login(admin);
        courseManagementRequest.createCourse().then((response) => {
            course = convertCourseAfterMultiPart(response);
            courseManagementRequest.addStudentToCourse(course, studentOne);
            courseManagementRequest.createTextExercise({ course }).then((exerciseResponse: Cypress.Response<TextExercise>) => {
                exercise = exerciseResponse.body;
            });
        });
    });

    it('Creates a text exercise in the UI', () => {
        cy.login(studentOne, `/courses/${course.id}/exercises`);
        courseOverview.startExercise(exercise.id!);
        courseOverview.openRunningExercise(exercise.id!);

        // Verify the initial state of the text editor
        textExerciseEditor.shouldShowExerciseTitleInHeader(exercise.title!);
        textExerciseEditor.shouldShowProblemStatement();

        // Make a submission
        cy.fixture('loremIpsum.txt').then((submission) => {
            textExerciseEditor.shouldShowNumberOfWords(0);
            textExerciseEditor.shouldShowNumberOfCharacters(0);
            textExerciseEditor.typeSubmission(exercise.id!, submission);
            textExerciseEditor.shouldShowNumberOfWords(100);
            textExerciseEditor.shouldShowNumberOfCharacters(591);
            textExerciseEditor.submit().then((request: Interception) => {
                expect(request.response!.body.text).to.eq(submission);
                expect(request.response!.body.submitted).to.be.true;
                expect(request.response!.statusCode).to.eq(200);
            });
        });
    });

    after(() => {
        if (course) {
            cy.login(admin);
            courseManagementRequest.deleteCourse(course.id!);
        }
    });
});