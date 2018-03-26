const express = require('express');
const app = express();
const router = express.Router();
const port = 3000;

// url: http://localhost:3000/
app.get('/', function (request, response){ response.send('Hello World'); });


// all routes prefixed with /api
app.use('/api', router);

var people = [

    { name: 'Eva0', surname: 'Strong0'},
    { name: 'Eva1', surname: 'Strong1'},
    { name: 'Eva2', surname: 'Strong2'},
    { name: 'Eva3', surname: 'Strong3'},
    { name: 'Eva4', surname: 'Strong4'}

];

router.get('/', function (request, response) {
    response.json({people: people});
});

router.get('/:index', function (request, response) {
    response.json(people[request.params.index]);
});

router.delete('/:index', function (request, response) {

    people = people.splice(0, index);
    response.ok();

});


// set the server to listen on port 3000
app.listen(port,function() { console.log('Listening on port ${port}') });