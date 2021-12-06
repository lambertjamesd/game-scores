const express = require('express');
const repository = require('./repository');
const auth = require('./auth');

const app = express();
const port = process.env.PORT || 3030;

app.use(express.json());

function respondWithError(res, errCode, err) {
    res.status(errCode).send(JSON.stringify({error: err}));
}

function validateSchema(schema, obj, keyPath) {
    const type = typeof obj;

    if (type === 'object' && obj !== null) {
        keyPath = keyPath || '';
    
        for (let key in schema) {
            const subResult = validateSchema(schema[key], obj[key], keyPath ? `${keyPath}.${key}` : key);

            if (subResult) {
                return subResult;
            }
        }

        return undefined;
    } 

    if (obj === null && schema === null) {
        return undefined;
    }
    
    if (type !== schema) {
        return `Expected '${schema}' got '${type}' at '${keyPath}'`;
    }

    return undefined;
}

function simpleRequestWrapper(schema, callback) {
    return async (req, res) => {
        const validationResult = validateSchema(schema, req.body);
        if (validationResult) {
            respondWithError(res, 400, validationResult);
            return;
        }

        try {
            const json = await callback(req, res);
            res.status(200);
            res.send(JSON.stringify(json));
        } catch (err) {
            res.status(500).send(String(err));
        }
    }
}

repository.buildRepository('db/db.sqlite3').then((repo) => {
    app.get('/', (req, res) => {
        res.send('API is up');
    });

    app.post('/users', simpleRequestWrapper({username: 'string', password: 'string'}, async (req, res) => {
        try {
            return await repository.createUser(repo, req.body.username, req.body.password);
        } catch (err) {
            if (err instanceof repository.DuplicateUsernameError) {
                respondWithError(res, 409, err.message);
                return;
            }

            throw err;
        }
    }));

    app.post('/token', simpleRequestWrapper({username: 'string', password: 'string'}, async (req, res) => {
        const authUser = await repository.authenticateUser(repo, req.body.username, req.body.password);

        if (!authUser) {
            respondWithError(res, 403, 'Bad username or password');
            return;
        }

        return {
            token: auth.createToken(authUser.id),
        };
    }));
    
    app.listen(port, () => {
        console.log(`App listening on ${port}`);
    });
}).catch((err) => {
    console.error(err);
    process.exit(1);
});
