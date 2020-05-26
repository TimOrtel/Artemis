import { USERS } from './endpoints.js';
import { addUserToInstructorsInCourse, addUserToStudentsInCourse } from './course.js';
import { login } from './requests.js';

export function getUser(artemis, i, baseUsername) {
    const username = baseUsername.replace('USERID', i);
    const res = artemis.get(USERS + '/' + username);
    if (res[0].status !== 200) {
        console.info('Unable to get user ' + username + ' (status: ' + res[0].status + ')!');
    }
    return res[0].body;
}

export function updateUser(artemis, user) {
    const res = artemis.put(USERS, user);
    if (res[0].status !== 200) {
        console.info('Unable to update user ' + user.login + ' (status: ' + res[0].status + ')!');
    }
}

export function newUser(artemis, i, baseUsername, basePassword, studentGroupName, instructorGroupName) {
    const username = baseUsername.replace('USERID', i);
    const password = basePassword.replace('USERID', i);
    let authorities = ['ROLE_USER'];
    if (i === 1) {
        authorities = ['ROLE_USER', 'ROLE_INSTRUCTOR'];
    }

    let groups = [studentGroupName];
    if (i === 1) {
        groups = [studentGroupName, instructorGroupName];
    }

    const user = {
        login: username,
        password: password,
        firstName: 'Artemis Test ' + i,
        lastName: 'Artemis Test ' + i,
        email: 'testuser_' + i + '@tum.invalid',
        activated: true,
        langKey: 'en',
        authorities: authorities,
        groups: groups,
        createdBy: 'test-case',
    };

    console.log('Try to create new user ' + username);
    const res = artemis.post(USERS, user);
    if (res[0].status !== 201) {
        console.info('Unable to generate new user ' + username + ' (status: ' + res[0].status + ')!');
        return -1;
    } else {
        console.log('SUCCESS: Created new user ' + username + ' with groups ' + res[0].body.groups);
    }

    return JSON.parse(res[0].body).id;
}

export function updateUserWithGroup(artemis, i, baseUsername, course) {
    const username = baseUsername.replace('USERID', i);
    addUserToStudentsInCourse(artemis, username, course.id);

    if (i === 1) {
        addUserToInstructorsInCourse(artemis, username, course.id);
    }
}

export function createUsersIfNeeded(artemis, baseUsername, basePassword, adminUsername, adminPassword, course, userOffset) {
    const shouldCreateUsers = __ENV.CREATE_USERS === true || __ENV.CREATE_USERS === 'true';
    const iterations = parseInt(__ENV.ITERATIONS);

    if (shouldCreateUsers) {
        console.log('Try to create ' + iterations + ' users');
        for (let i = 1; i <= iterations; i++) {
            let userId = newUser(artemis, i + userOffset, baseUsername, basePassword, course.studentGroupName, course.instructorGroupName);
            if (userId === -1) {
                // the creation was not successful, most probably because the user already exists, we need to update the group of the user
                updateUserWithGroup(artemis, i, baseUsername, course);
            }
        }
    } else {
        console.log('Do not create users, assume the user exists in the external system, will update their groups');
        for (let i = 1; i <= iterations; i++) {
            // we need to login once with the user, so that the user is synced and available for the update with the groups
            login(baseUsername.replace('USERID', i + userOffset), basePassword.replace('USERID', i));
        }
        artemis = login(adminUsername, adminPassword);
        for (let i = 1; i <= iterations; i++) {
            updateUserWithGroup(artemis, i + userOffset, baseUsername, course);
        }
    }
}
