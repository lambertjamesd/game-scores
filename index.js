const express = require('express');
const auth = require('./src/auth');
const repository = require('./src/repository');
const userRoutes = require('./src/user-routes');
const scoreRoutes = require('./src/score-routes');
const http = require('http');
const https = require('https');
const fs = require('fs');

if (process.argv[2] === '--generate-admin-hash') {
    try {
        console.log(auth.hashPassword(process.argv[3], ''));
    } catch (error) {
        console.error(`Failed to create has for '${process.argv[3]}'`);
        process.exit(1);
    }
    process.exit(0);
}

const app = express();
const port = +(process.env.PORT || 3030);

app.use(express.json());

repository.buildRepository('db/db.sqlite3').then((repo) => {
    app.get('/', (req, res) => {
        res.send('API is up');
    });

    userRoutes.setup(app, repo);
    scoreRoutes.setup(app, repo);

    var httpServer = http.createServer(app);
    var httpsServer = https.createServer({key: fs.readFileSync('cert/game-scores.key'), cert: fs.readFileSync('cert/game-scores.crt')}, app);
    
    httpServer.listen(port, () => {
        console.log(`App listening on ${port}`);
    });
    httpsServer.listen(port + 1, () => {
        console.log(`App (https) listening on ${port + 1}`);
    });
}).catch((err) => {
    console.error(err);
    process.exit(1);
});
