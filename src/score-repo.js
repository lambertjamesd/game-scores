const repoCommands = require('./repo-commands');

async function setup(repo) {
    await repoCommands.run(repo, `CREATE TABLE IF NOT EXISTS scoreboards (
        id   INTEGER PRIMARY KEY AUTOINCREMENT,
        tag  TEXT,
        name TEXT
    )`);
    
    await repoCommands.run(repo, `CREATE UNIQUE INDEX IF NOT EXISTS idx_tag ON scoreboards(tag)`);

    await repoCommands.run(repo, `CREATE TABLE IF NOT EXISTS scores (
        user_id INTEGER,
        scoreboard_id INTEGER,
        score INTEGER,
        rank INTEGER,
        time INTEGER,
        PRIMARY KEY(user_id, scoreboard_id)
    )`);

    await repoCommands.run(repo, `CREATE INDEX IF NOT EXISTS idx_score ON scores(scoreboard_id, score)`);

    repo.data.rankSemaphore = repoCommands.semaphore(1);
};


async function getScoreboard(repo, tag) {
    return repoCommands.get(repo, `SELECT id,tag FROM scoreboards WHERE tag=?`, [tag]);
}

async function getOrCreateScoreboard(repo, tag) {
    const result = await repoCommands.get(repo, `SELECT id,tag FROM scoreboards WHERE tag=?`, [tag]);

    if (result) {
        return result;
    }

    const createResult = await repoCommands.run(repo, `INSERT INTO scoreboards (tag, name) VALUES(?,?)`, [tag, tag]);
    return {id: createResult.lastID, tag: tag};
}

async function deleteScore(repo, userId, scoreboardId) {
    await repoCommands.run(repo, `DELETE FROM scores WHERE scoreboard_id=? AND user_id=?`, [scoreboardId, userId]);
}

async function logScore(repo, userId, scoreboardId, score) {
    const prevScore = await getRank(repo, userId, scoreboardId);

    if (prevScore && prevScore.score < score) {
        return {rank: prevScore.rank, score: prevScore.score, user_id: userId, high_score: false};
    }

    if (prevScore) {
        await repoCommands.run(repo, `UPDATE scores SET score=?, time=? WHERE user_id=? AND scoreboard_id=?`, [score, Date.now(), userId, scoreboardId]);
    } else {
        await repoCommands.run(repo, `INSERT INTO scores (user_id, scoreboard_id, score, time) VALUES (?, ?, ?, ?)`, [
            userId,
            scoreboardId,
            score,
            Date.now(),
        ]);
    }
    
    return await getRank(repo, userId, scoreboardId);
}

async function getRank(repo, userId, scoreboardId) {
    if (!userId) {
        return undefined;
    }

    const score = await repoCommands.get(repo, `SELECT score FROM scores WHERE user_id=? AND scoreboard_id=?`, [userId, scoreboardId]);

    if (!score) {
        return undefined;
    }

    const rank = await repoCommands.get(repo, `SELECT COUNT(*) from scores WHERE score < ? AND scoreboard_id=?`, [score.score, scoreboardId]);

    return {
        score: score.score,
        rank: rank['COUNT(*)'] + 1,
        user_id: userId,
        scoreboard_id: scoreboardId,
    }
}

async function getScores(repo, scoreboardId, afterRank, count) {
    return await repoCommands.all(repo, `SELECT user_id, score, RANK() OVER ( 
		ORDER BY score ASC
	) rank  FROM scores WHERE scoreboard_id=? AND rank > ? ORDER BY score ASC LIMIT ?`, [scoreboardId, afterRank, count]);
}

async function getScoresforUser(repo, userId) {
    return await repoCommands.all(repo, `SELECT user_id, scoreboard_id, score FROM scores WHERE user_id=?`, [userId]);
}

exports.setup = setup;
exports.getScoreboard = getScoreboard;
exports.getOrCreateScoreboard = getOrCreateScoreboard;
exports.deleteScore = deleteScore;
exports.logScore = logScore;
exports.getRank = getRank;
exports.getScores = getScores;
exports.getScoresforUser = getScoresforUser;