const express = require('express');
const bodyParser = require("body-parser");
const app = express();
const router = express.Router();
const port = 3000;


/**bodyParser.json(options)
 * Parses the text as JSON and exposes the resulting object on req.body.
 */
app.use(bodyParser.json());

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header("Content-type", "application/json");
    next();
});

// url: http://localhost:3000/
app.get('/', function (request, response){ response.send('Hello World'); });

// all routes prefixed with /api
app.use('/api', router);

var people = [
    { id: 1, name: 'Piotr', surname: 'Kowalski', age: 30 }
];

router.get('/', function (request, response) {
    response.json(people);
});

router.put('/', function (request, response) {
    request.body.id = people.length+1;
    people.push(request.body);
    response.json(request.body);
});

router.delete('/:id', function (request, response) {

    for(var i = 0; i < people.length; i++){
        if(people[i].id == request.params.id){
            people.splice(i, 1);
        }
    }

    response.sendStatus(200);

});

// set the server to listen on port 3000
app.listen(port,function() { console.log('Listening on port ${port}') });