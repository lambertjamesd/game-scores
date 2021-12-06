const express = require('express');
const repository = require('./repository');
const userRoutes = require('./user-routes');

const app = express();
const port = process.env.PORT || 3030;

app.use(express.json());

repository.buildRepository('db/db.sqlite3').then((repo) => {
    app.get('/', (req, res) => {
        res.send('API is up');
    });

    userRoutes.setup(app, repo);
    
    app.listen(port, () => {
        console.log(`App listening on ${port}`);
    });
}).catch((err) => {
    console.error(err);
    process.exit(1);
});
