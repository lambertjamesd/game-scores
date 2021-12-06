const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const APP_SECRET = process.env.APP_SECRET || 'not a secret';

function hashPassword(password, salt) {
    const sha256 = crypto.createHmac('sha256', APP_SECRET);
    sha256.update(password);
    sha256.update(salt);
    return sha256.digest('hex');
}

function createSalt() {
    return new Promise((resolve, reject) => {
        crypto.randomBytes(16, function(err, buff) {
            if (err) {
                reject(err);
            } else {
                resolve(buff.toString('hex'));
            }
        });
    });
}

function createToken(userId) {
    return jwt.sign({u: userId, t: Math.floor(Date.now() / 1000)}, APP_SECRET);
}

function validateToken(token) {
    return jwt.verify(token, APP_SECRET);
}

exports.hashPassword = hashPassword;
exports.createSalt = createSalt;
exports.createToken = createToken;
exports.validateToken = validateToken;