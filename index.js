const express = require('express');

const app = express();
const port = process.env.PORT || 3030;

app.get('/', (req, res) => {
    res.send('API is up');
});

app.listen(port, () => {
    console.log(`App listening on ${port}`);
});