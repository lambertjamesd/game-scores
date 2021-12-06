const repoCommands = require('./repo-commands');

const auth = require('./auth');

async function setup(repo) {
    await repoCommands.run(repo, `CREATE TABLE IF NOT EXISTS users (
        id            INTEGER  PRIMARY KEY AUTOINCREMENT,
        username      TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        password_salt TEXT NOT NULL
    )`);

    await repoCommands.run(repo, `CREATE UNIQUE INDEX IF NOT EXISTS idx_username ON users(username)`);
};

async function getUser(repo, userId) {
    return await repoCommands.get(repo, `SELECT id, username FROM users WHERE id=?`, [userId]);
}

class DuplicateUsernameError extends Error {
    constructor(username) {
        super(`The username '${username}' is already taken`);
    }
}

async function createUser(repo, username, password) {
    const salt = await auth.createSalt();
    const passwordHash = auth.hashPassword(password, salt);
    try {
        const addResult = await repoCommands.run(repo, `INSERT INTO users (username, password_hash, password_salt) VALUES(?, ?, ?)`, [username, passwordHash, salt]);
        const newUserId = addResult.lastID;
        return await getUser(repo, newUserId);
    } catch (err) {
        if (err && typeof err.message === 'string' && err.message.indexOf('') !== -1) {
            throw new DuplicateUsernameError(username);
        }
        throw err;
    }
}

async function authenticateUser(repo, username, password) {
    const userInfo = await repoCommands.get(repo, `SELECT id, password_hash, password_salt FROM users WHERE username=?`, [username]);

    if (!userInfo) {
        return undefined;
    }

    const rehashed = auth.hashPassword(password, userInfo.password_salt);

    if (rehashed !== userInfo.password_hash) {
        return undefined;
    }

    return getUser(repo, userInfo.id);
}

exports.setup = setup;
exports.createUser = createUser;
exports.getUser = getUser;
exports.authenticateUser = authenticateUser;
exports.DuplicateUsernameError = DuplicateUsernameError;