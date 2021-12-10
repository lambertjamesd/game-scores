const scoreRepo = require('../src/score-repo');
const repository = require('../src/repository');
const fs = require('fs');

function assertEqual(a, b, message) {
    if (a !== b) {
        throw new Error(`Expected '${a}' to be '${b}' ${message}`);
    }
}

function getScores(scoreList) {
    return scoreList.map(a => a.score).join(',');
}

function getUserIds(scoreList) {
    return scoreList.map(a => a.user_id).join(',');
}

function getRanks(scoreList) {
    return scoreList.map(a => a.rank).join(',');
}

async function setupTest(testDBFilename) {
    if (fs.existsSync(testDBFilename)) {
        fs.unlinkSync(testDBFilename);
    }
    
    return await repository.buildRepository(testDBFilename, [scoreRepo.setup]);
}

async function doTest() {    
    const repo = await setupTest('db/test.sqlite3');

    async function testScoreboard(scoreboard) {
        await scoreRepo.logScore(repo, 1, scoreboard.id, 100);
        await scoreRepo.logScore(repo, 2, scoreboard.id, 50);
        await scoreRepo.logScore(repo, 3, scoreboard.id, 200);
        await scoreRepo.logScore(repo, 4, scoreboard.id, 75);
        await scoreRepo.logScore(repo, 5, scoreboard.id, 300);
    
        let scores = await scoreRepo.getScores(repo, scoreboard.id, 0, 10);
    
        assertEqual(getScores(scores), '50,75,100,200,300', 'right order 1');
        assertEqual(getUserIds(scores), '2,4,1,3,5', 'right users');
        assertEqual(getRanks(scores), '1,2,3,4,5', 'right ranks');
    
        // getting a bad score doesn't effect rankings
        await scoreRepo.logScore(repo, 4, scoreboard.id, 300);
    
        scores = await scoreRepo.getScores(repo, scoreboard.id, 0, 10);
        assertEqual(getScores(scores), '50,75,100,200,300', 'only best scores');
    
        // update ranking correctly
        await scoreRepo.logScore(repo, 1, scoreboard.id, 25);
    
        scores = await scoreRepo.getScores(repo, scoreboard.id, 0, 10);
        assertEqual(getScores(scores), '25,50,75,200,300', 'update rank order');
        assertEqual(getRanks(scores), '1,2,3,4,5', 'right ranks');
    }

    const scoreboardA = await scoreRepo.getOrCreateScoreboard(repo, 'game-a');
    const scoreboardB = await scoreRepo.getOrCreateScoreboard(repo, 'game-b');

    await testScoreboard(scoreboardA);
    await testScoreboard(scoreboardB);

    const scores = await scoreRepo.getScores(repo, scoreboardA.id, 0, 10);
    assertEqual(getScores(scores), '25,50,75,200,300', 'update rank order');
    assertEqual(getRanks(scores), '1,2,3,4,5', 'right ranks');
}


async function doSmashTest() {
    const repo = await setupTest('db/smash.sqlite3');

    const scoreboardA = await scoreRepo.getOrCreateScoreboard(repo, 'game-a');

    const scorePromises = [];
    const scoreValues = [];
    const ranks = [];

    for (let i = 1; i <= 1000; ++i) {
        const score = Math.floor(1000 * Math.random());
        const promise = scoreRepo.logScore(repo, i, scoreboardA.id, score);
        await promise;
        scorePromises.push(promise);
        scoreValues.push(score);
        ranks.push(i);
    }

    await scorePromises;

    scoreValues.sort((a, b) => a - b);

    const scores = await scoreRepo.getScores(repo, scoreboardA.id, 0, 100);

    assertEqual(getRanks(scores), ranks.slice(0, 100).join(','), 'right ranks');
    assertEqual(getScores(scores), scoreValues.slice(0, 100).join(','), 'right scores');
}

doTest().then(() => console.log('Success'), (error) => console.log(`Fail: ${error.stack}`));
doSmashTest().then(() => console.log('Smash Success'), (error) => console.log(`Smash Fail: ${error.stack}`));