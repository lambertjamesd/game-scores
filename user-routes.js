const userRepo = require('./user-repo');
const auth = require('./auth');
const requestWrapper = require('./request-wrapper');

exports.setup = (app, repo) => {
    app.post('/users', requestWrapper.simpleRequestWrapper({username: 'string', password: 'string'}, false, async (req, res) => {
        try {
            return await userRepo.createUser(repo, req.body.username, req.body.password);
        } catch (err) {
            if (err instanceof userRepo.DuplicateUsernameError) {
                requestWrapper.respondWithError(res, 409, err.message);
                return;
            }

            throw err;
        }
    }));

    app.post('/token', requestWrapper.simpleRequestWrapper({username: 'string', password: 'string'}, false, async (req, res) => {
        const authUser = await userRepo.authenticateUser(repo, req.body.username, req.body.password);

        if (!authUser) {
            requestWrapper.respondWithError(res, 400, 'Bad username or password');
            return;
        }

        return {
            token: auth.createToken(authUser.id),
        };
    }));
};