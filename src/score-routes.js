const scoreRepo = require('./score-repo');
const userRepo = require('./user-repo');
const requestWrapper = require('./request-wrapper');

exports.setup = (app, repo) => {
    async function convertScoreWithUser(userId, score) {
        const user = await userRepo.getUser(repo, userId);
        const username = user ? user.username : `<error> user_id ${userId}`;
        return {
            username: username,
            user_id: userId,
            score: score.score,
            rank: score.rank,
            high_score: score.high_score,
        }
    }

    app.post('/scores/:scoreboard', requestWrapper.simpleRequestWrapper({score: 'number'}, true, async (req, res, auth) => {
        if (!req.params.scoreboard) {
            return requestWrapper.respondWithError(res, 400, 'Invalid scoreboard');
        }

        const scoreboard = await scoreRepo.getOrCreateScoreboard(repo, req.params.scoreboard);

        if (!scoreboard) {
            return requestWrapper.respondWithError(res, 500, 'Could not create scoreboard');
        }

        return await convertScoreWithUser(auth.u, await scoreRepo.logScore(repo, auth.u, scoreboard.id, req.body.score));
    }));

    app.get('/scores/:scoreboard', requestWrapper.simpleRequestWrapper(undefined, false, async (req, res) => {
        if (!req.params.scoreboard) {
            return requestWrapper.respondWithError(res, 400, 'Invalid scoreboard');
        }

        const scoreboard = await scoreRepo.getScoreboard(repo, req.params.scoreboard);

        if (!scoreboard) {
            return requestWrapper.respondWithError(res, 404, 'Invalid scoreboard');
        }

        const scores = await scoreRepo.getScores(repo, scoreboard.id, +(req.query.rank || 0), +(req.query.limit || 10));

        const result = await Promise.all(scores.map(score => convertScoreWithUser(score.user_id, score)));
        result.sort((a, b) => a.rank - b.rank);
        return result;
    }));

    app.get('/scores/:scoreboard/:username', requestWrapper.simpleRequestWrapper(undefined, false, async (req, res) => {
        if (!req.params.scoreboard) {
            return requestWrapper.respondWithError(res, 400, 'Invalid scoreboard');
        }

        const scoreboard = await scoreRepo.getScoreboard(repo, req.params.scoreboard);

        if (!scoreboard) {
            return requestWrapper.respondWithError(res, 404, 'Invalid scoreboard');
        }

        const user = await userRepo.lookupUserByUsername(repo, req.params.username);
        
        if (!user) {
            return requestWrapper.respondWithError(res, 404, 'Invalid username');
        }

        const result = await scoreRepo.getRank(repo, user.id, scoreboard.id);

        if (!result) {
            return requestWrapper.respondWithError(res, 404, 'No score submitted');
        }

        return await convertScoreWithUser(user.id, result);
    }));

    app.delete('/scores/:scoreboard/:username', requestWrapper.simpleRequestWrapper(undefined, true, async (req, res, auth) => {
        const user = await userRepo.lookupUserByUsername(repo, req.params.username);
        
        if (!user) {
            return requestWrapper.respondWithError(res, 404, 'Invalid username');
        }

        if (auth.u !== user.id && !await userRepo.isUserAdmin(repo, auth.u)) {
            return requestWrapper.respondWithError(res, 403, 'No permissions to delete score');
        }
        const scoreboard = await scoreRepo.getScoreboard(repo, req.params.scoreboard);

        if (!scoreboard) {
            return requestWrapper.respondWithError(res, 404, 'Invalid scoreboard');
        }

        await scoreRepo.deleteScore(repo, user.id, scoreboard.id);
    }));
};