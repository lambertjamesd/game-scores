const sqlite3 = require('sqlite3');

const auth = require('./auth');

function run(repo, query, statements) {
    return new Promise((resolve, reject) => {
        repo.db.run(query, statements, function (err) {
            if (err) {
                reject(err);
            } else {
                resolve({lastID: this.lastID, changes: this.changes});
            }
        });
    });
}

function get(repo, query, statements) {
    return new Promise((resolve, reject) => {
        repo.db.get(query, statements, (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
}

async function setupRepository(repo) {
    await run(repo, `CREATE TABLE IF NOT EXISTS users (
        id            INTEGER  PRIMARY KEY AUTOINCREMENT NOT NULL UNIQUE,
        username      CHAR(32) NOT NULL,
        password_hash CHAR(64) NOT NULL,
        password_salt CHAR(32) NOT NULL
    )`);

    await run(repo, `CREATE UNIQUE INDEX IF NOT EXISTS idx_username ON users(username)`);
}

function buildRepository(filename) {
    return new Promise((resolve, reject) => {
        var result = {};

        result.db = new sqlite3.Database(filename, (err) => {
            if (err) {
                reject(err);
            } else {
                setupRepository(result).then(() => resolve(result), reject);
            }
        });
    })
}

async function getUser(repo, userId) {
    return await get(repo, `SELECT id, username FROM users WHERE id=?`, [userId]);
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
        const addResult = await run(repo, `INSERT INTO users (username, password_hash, password_salt) VALUES(?, ?, ?)`, [username, passwordHash, salt]);
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
    const userInfo = await get(repo, `SELECT id, password_hash, password_salt FROM users WHERE username=?`, [username]);

    if (!userInfo) {
        return undefined;
    }

    const rehashed = auth.hashPassword(password, userInfo.password_salt);

    if (rehashed !== userInfo.password_hash) {
        return undefined;
    }

    return getUser(repo, userInfo.id);
}

exports.buildRepository = buildRepository;
exports.createUser = createUser;
exports.getUser = getUser;
exports.authenticateUser = authenticateUser;
exports.DuplicateUsernameError = DuplicateUsernameError;