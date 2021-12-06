
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