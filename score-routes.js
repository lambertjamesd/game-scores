const repository = require('./repository');
const requestWrapper = require('./request-wrapper');

exports.setup = (app, repo) => {
    app.post('/scores/:game', requestWrapper.simpleRequestWrapper({score: 'number'}, true, (req, res, auth) => {

    }));
};