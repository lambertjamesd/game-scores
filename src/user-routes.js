const userRepo = require('./user-repo');
const scoreRepo = require('./score-repo');
const auth = require('./auth');
const requestWrapper = require('./request-wrapper');

exports.setup = (app, repo) => {
    app.post('/users', requestWrapper.simpleRequestWrapper({username: 'string', password: 'string'}, false, async (req, res) => {
        try {
            if (!req.body.username) {
                return requestWrapper.respondWithError(res, 400, 'username is required');
            }

            if (!req.body.password) {
                return requestWrapper.respondWithError(res, 400, 'password is required');
            }

            return await userRepo.createUser(repo, req.body.username, req.body.password);
        } catch (err) {
            if (err instanceof userRepo.DuplicateUsernameError) {
                return requestWrapper.respondWithError(res, 409, err.message);
            }

            throw err;
        }
    }));

    app.delete('/users/:username', requestWrapper.simpleRequestWrapper(undefined, true, async (req, res, auth) => {
        const user = await userRepo.lookupUserByUsername(repo, req.params.username);
        
        if (!user) {
            return requestWrapper.respondWithError(res, 404, 'Invalid username');
        }

        if (auth.u !== user.id && !await userRepo.isUserAdmin(repo, auth.u)) {
            return requestWrapper.respondWithError(res, 403, 'No permissions to delete user');
        }

        const userScores = scoreRepo.getScoresforUser(repo, user.id);

        await Promise.all(userScores.map(score => {
            return scoreRepo.deleteScore(repo, user.id, score.scoreboard_id);
        }));

        await userRepo.deleteUser(repo, req.body.username);
    }));

    app.patch('/users/:username', requestWrapper.simpleRequestWrapper(undefined, true, async (req, res, auth) => {
        const user = await userRepo.lookupUserByUsername(repo, req.params.username);
        
        if (!user) {
            return requestWrapper.respondWithError(res, 404, 'Invalid username');
        }

        if (auth.u !== user.id && !await userRepo.isUserAdmin(repo, auth.u)) {
            return requestWrapper.respondWithError(res, 403, 'No permissions to delete user');
        }

        await userRepo.updateUser(repo, req.body.username, req.body);
    }));

    app.post('/token', requestWrapper.simpleRequestWrapper({username: 'string', password: 'string'}, false, async (req, res) => {
        const authUser = await userRepo.authenticateUser(repo, req.body.username, req.body.password);

        if (!authUser) {
            return requestWrapper.respondWithError(res, 400, 'Bad username or password');
        }

        return {
            token: auth.createToken(authUser.id),
        };
    }));

    app.post('/admins', requestWrapper.simpleRequestWrapper({username: 'string', hash: 'string'}, false, async (req, res) => {
        const success = await userRepo.giveAdminPermissions(repo, req.body.username, req.body.hash);
        return {
            success: success,
        };
    }));
};