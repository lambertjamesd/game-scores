const auth = require('./auth');

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

function simpleRequestWrapper(schema, authRequired, callback) {
    return async (req, res) => {
        const validationResult = schema && validateSchema(schema, req.body);
        if (validationResult) {
            respondWithError(res, 400, validationResult);
            return;
        }

        let authData = undefined;

        if (authRequired) {
            const authHeader = req.headers.authorization;

            if (!authHeader) {
                respondWithError(res, 401, 'No Authorization specified');
                return;
            }

            const parts = authHeader.split(' ', 2);

            if (parts[0] !== 'Bearer' || parts.length !== 2) {
                respondWithError(res, 401, 'Only Bearer Authorization supported');
                return;
            }

            authData = auth.validateToken(parts[1]);

            if (!authData) {
                respondWithError(res, 401, 'Invalid Authorization token');
                return;
            }
        }

        try {
            const json = await callback(req, res, authData);

            if (json) {
                res.status(200);
                res.send(JSON.stringify(json));
            }
        } catch (err) {
            res.status(500).send(String(err.stack));
        }
    }
}

exports.respondWithError = respondWithError;
exports.simpleRequestWrapper = simpleRequestWrapper;