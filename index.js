const express = require('express');
const repository = require('./src/repository');
const userRoutes = require('./src/user-routes');
const scoreRoutes = require('./src/score-routes');

const app = express();
const port = process.env.PORT || 3030;

app.use(express.json());

repository.buildRepository('db/db.sqlite3').then((repo) => {
    app.get('/', (req, res) => {
        res.send('API is up');
    });

    userRoutes.setup(app, repo);
    scoreRoutes.setup(app, repo);
    
    app.listen(port, () => {
        console.log(`App listening on ${port}`);
    });
}).catch((err) => {
    console.error(err);
    process.exit(1);
});
