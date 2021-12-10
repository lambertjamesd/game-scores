const sqlite3 = require('sqlite3');

function buildRepository(filename, setupFunctions) {
    return new Promise((resolve, reject) => {
        var result = {
            data: {},
        };

        result.db = new sqlite3.Database(filename, (err) => {
            if (err) {
                reject(err);
            } else {
                Promise.all(setupFunctions.map(function(setup) {
                    return setup(result);
                })).then(function() {
                    resolve(result);
                }, reject);
            }
        });
    })
}

exports.buildRepository = buildRepository;