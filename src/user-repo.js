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
    
    await repoCommands.run(repo, `CREATE TABLE IF NOT EXISTS admins (
        user_id            INTEGER  PRIMARY KEY
    )`);
};

async function getUser(repo, userId) {
    return await repoCommands.get(repo, `SELECT id, username FROM users WHERE id=?`, [userId]);
}

async function lookupUserByUsername(repo, username) {
    return await repoCommands.get(repo, `SELECT id, username FROM users WHERE username=?`, [username]);
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

async function deleteUser(repo, username) {
    await repoCommands.run(repo, `DELETE FROM users WHERE username=?`, [username]);
}


async function updateUser(repo, existingUsername, newData) {
    const fields = [];
    const values = [];

    if (newData.password) {
        const salt = await auth.createSalt();
        const passwordHash = auth.hashPassword(newData.password, salt);

        fields.push('password_hash', 'password_salt');
        values.push(passwordHash, salt);
    }

    if (newData.username) {
        fields.push('username');
        values.push(newData.username);
    }
    
    if (fields.length == 0) {
        return;
    }

    values.push(existingUsername);

    await repoCommands.run(repo, `UPDATE users SET ${fields.map(field => `${field}=?`).join(', ')} WHERE username=?`, values);
    return await lookupUserByUsername(repo, newData.username || existingUsername);
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

async function isUserAdmin(repo, userId) {
    return !!await repoCommands.get(repo, `SELECT user_id FROM admins WHERE user_id=?`, [userId]);
}

async function giveAdminPermissions(repo, username, usernameHash) {
    const isValidHash = auth.hashPassword(username, '') === usernameHash;

    if (!isValidHash) {
        return false;
    }

    const user = await repoCommands.get(repo, `SELECT id, username FROM users WHERE username=?`, [username]);

    if (!user) {
        return false;
    }

    const isAlreadyAdmin = await isUserAdmin(repo, user.id);

    if (isAlreadyAdmin) {
        return true;
    }

    await repoCommands.run(repo, `INSERT INTO admins (user_id) VALUES (?)`, [user.id]);

    return true;
}

exports.setup = setup;
exports.createUser = createUser;
exports.deleteUser = deleteUser;
exports.updateUser = updateUser;
exports.getUser = getUser;
exports.authenticateUser = authenticateUser;
exports.giveAdminPermissions= giveAdminPermissions;
exports.isUserAdmin = isUserAdmin;
exports.lookupUserByUsername = lookupUserByUsername;
exports.DuplicateUsernameError = DuplicateUsernameError;