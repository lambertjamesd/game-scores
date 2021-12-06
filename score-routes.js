const scoreRepo = require('./score-repo');
const userRepo = require('./user-repo');
const requestWrapper = require('./request-wrapper');

exports.setup = (app, repo) => {
    app.post('/scores/:scoreboard', requestWrapper.simpleRequestWrapper({score: 'number'}, true, async (req, res, auth) => {
        if (!req.params.scoreboard) {
            requestWrapper.respondWithError(res, 400, 'Invalid scoreboard');
            return;
        }

        const scoreboard = await scoreRepo.getOrCreateScoreboard(repo, req.params.scoreboard);

        if (!scoreboard) {
            requestWrapper.respondWithError(res, 500, 'Could not create scoreboard');
            return;
        }

        return await scoreRepo.logScore(repo, auth.u, scoreboard.id, req.body.score);
    }));

    async function convertScoreWithUser(userId, score) {
        const user = await userRepo.getUser(repo, userId);
        const username = user ? user.username : `<error> user_id ${userId}`;
        return {
            username: username,
            user_id: userId,
            score: score.score,
            rank: score.rank,
        }
    }

    app.get('/scores/:scoreboard', requestWrapper.simpleRequestWrapper(undefined, false, async (req, res) => {
        if (!req.params.scoreboard) {
            requestWrapper.respondWithError(res, 400, 'Invalid scoreboard');
            return;
        }

        const scoreboard = await scoreRepo.getScoreboard(repo, req.params.scoreboard);

        if (!scoreboard) {
            requestWrapper.respondWithError(res, 404, 'Invalid scoreboard');
            return;
        }

        const scores = await scoreRepo.getScores(repo, scoreboard.id, +(req.query.rank || 0), +(req.query.limit || 10));

        const result = await Promise.all(scores.map(score => convertScoreWithUser(score.user_id, score)));
        result.sort((a, b) => a.rank - b.rank);
        return result;
    }));

    app.get('/scores/:scoreboard/:userId', requestWrapper.simpleRequestWrapper(undefined, false, async (req, res) => {
        if (!req.params.scoreboard) {
            requestWrapper.respondWithError(res, 400, 'Invalid scoreboard');
            return;
        }

        const scoreboard = await scoreRepo.getScoreboard(repo, req.params.scoreboard);

        if (!scoreboard) {
            requestWrapper.respondWithError(res, 404, 'Invalid scoreboard');
            return;
        }

        const result = await scoreRepo.getRank(repo, +req.params.userId, scoreboard.id);

        if (!result) {
            requestWrapper.respondWithError(res, 404, 'No score submitted');
            return;
        }

        return await convertScoreWithUser(+req.params.userId, result);
    }));
};