const userRepo = require('./user-repo');
const auth = require('./auth');
const requestWrapper = require('./request-wrapper');

exports.setup = (app, repo) => {
    app.post('/users', requestWrapper.simpleRequestWrapper({username: 'string', password: 'string'}, false, async (req, res) => {
        try {
            return await userRepo.createUser(repo, req.body.username, req.body.password);
        } catch (err) {
            if (err instanceof userRepo.DuplicateUsernameError) {
                return requestWrapper.respondWithError(res, 409, err.message);
            }

            throw err;
        }
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