
exports.run = (repo, query, statements) => {
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

exports.get = (repo, query, statements) => {
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

exports.all = (repo, query, statements) => {
    return new Promise((resolve, reject) => {
        repo.db.all(query, statements, (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
}

exports.semaphore = (count) => {
    let lockCount = 0;
    const pendingRequests = [];
    return async (callback) => {
        if (lockCount < count) {
            ++lockCount;
        } else {
            await new Promise((resolve) => {
                pendingRequests.push(resolve);
            });
        }

        try {
            return await callback();
        } finally {
            if (pendingRequests.length) {
                const next = pendingRequests.shift();
                next();
            } else {
                --lockCount;
            }
        }
    };
}