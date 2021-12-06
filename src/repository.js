const sqlite3 = require('sqlite3');
const userRepo = require('./user-repo');
const scoreRepo = require('./score-repo');

function buildRepository(filename) {
    return new Promise((resolve, reject) => {
        var result = {};

        result.db = new sqlite3.Database(filename, (err) => {
            if (err) {
                reject(err);
            } else {
                Promise.all([
                    userRepo.setup(result),
                    scoreRepo.setup(result),
                ]).then(() => resolve(result), reject);
            }
        });
    })
}

exports.buildRepository = buildRepository;