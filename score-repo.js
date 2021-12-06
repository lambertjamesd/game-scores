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

    await repoCommands.run(repo, `CREATE INDEX IF NOT EXISTS score ON scores(score)`);
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
    const rank = await repoCommands.get(repo, `SELECT rank FROM scores WHERE user_id=? AND scoreboard_id=?`, [userId, scoreboardId]);

    if (!rank) {
        // no entry to delete
        return;
    }

    await repoCommands.run(repo, `DELETE FROM scores WHERE user_id=? AND scoreboard_id=?`, [userId, scoreboardId]);
    await repoCommands.run(repo, `UPDATE scores SET rank=rank-1 WHERE rank > ?`, [rank.rank]);
}

async function logScore(repo, userId, scoreboardId, score) {
    await deleteScore(repo, userId, scoreboardId);
    const newRank = await repoCommands.get(repo, `SELECT score,rank FROM scores WHERE score > ? ORDER BY score ASC LIMIT 1`, [score]) || {rank: 1};
    
    await repoCommands.run(repo, `UPDATE scores SET rank=rank+1 WHERE rank >= ?`, [newRank.rank]);
    await repoCommands.run(repo, `INSERT INTO scores (user_id, scoreboard_id, score, rank, time) VALUES (?, ?, ?, ?, ?)`, [
        userId,
        scoreboardId,
        score,
        newRank.rank,
        Date.now(),
    ]);
    return {rank: newRank.rank};
}

async function getRank(repo, userId, scoreboardId) {
    if (!userId) {
        return undefined;
    }

    return await repoCommands.get(repo, `SELECT score, rank FROM scores WHERE user_id=? AND scoreboard_id=?`, [userId, scoreboardId]);
}

async function getScores(repo, scoreboardId, afterRank, count) {
    return await repoCommands.all(repo, `SELECT user_id, score, rank FROM scores WHERE scoreboard_id=? AND rank > ? ORDER BY RANK ASC LIMIT ?`, [scoreboardId, afterRank, count]);
}

exports.setup = setup;
exports.getScoreboard = getScoreboard;
exports.getOrCreateScoreboard = getOrCreateScoreboard;
exports.logScore = logScore;
exports.getRank = getRank;
exports.getScores = getScores;