const express = require('express');
const bodyParser = require("body-parser");
const app = express();
const router = express.Router();
const port = 3000;

app.use(bodyParser.json());

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    res.header("Content-type", "application/json");
    next();
});

// url: http://localhost:3000/
app.get('/', function (request, response){ response.send('Hello World'); });

// all routes prefixed with /api
app.use('/api', router);

// set the server to listen on port 3000
app.listen(port,function() { console.log('Listening on port: ' + port) });



//Table
var people = [
    { "id": 1, "name": "Piotr", "surname": "Kowalski", "age": 30 },
    { "id": 2, "name": "Pawel", "surname": "Bak", "age": 12 },
    { "id": 3, "name": "Pawel", "surname": "Bak", "age": 26 }
];



// Wyświetlanie wszystkiego
router.get('/', function (request, response) {
    response.json(people);
});
// Wyświetlanie po id
router.get('/person/:id', function (request, response) {
    var odpowiedz = [];
    for(var i = 0; i < people.length; i++){
        if(people[i].id == request.params.id){
            odpowiedz.push(people[i]);
        }
    }
    response.json(odpowiedz);
    response.sendStatus(200);
});
// Wyświetlanie po imieniu
router.get('/person/name/:name', function (request, response) {
    var odpowiedz = [];
    for(var i = 0; i < people.length; i++){
        if(people[i].name.toLowerCase() == request.params.name.toLowerCase()){
            odpowiedz.push(people[i]);
        }
    }
    response.json(odpowiedz);
    response.sendStatus(200);
});
// Wyświetlanie po nazwisku
router.get('/person/surname/:name', function (request, response) {
    var odpowiedz = [];
    for(var i = 0; i < people.length; i++){
        if(people[i].surname.toLowerCase() == request.params.name.toLowerCase()){
            odpowiedz.push(people[i]);
        }
    }
    response.json(odpowiedz);
    response.sendStatus(200);
});
// Wyświetlanie po wieku
router.get('/person/age/:name', function (request, response) {
    var odpowiedz = [];
    for(var i = 0; i < people.length; i++){
        if(people[i].age == request.params.name){
            odpowiedz.push(people[i]);
        }
    }
    response.json(odpowiedz);
    response.sendStatus(200);
});
// DOdawanie osoby
router.post('/:name/:surname/:age', function (request, response) {
    request.body.id = people[people.length -1].id + 1;
    request.body.name = request.params.name;
    request.body.surname = request.params.surname;
    request.body.age = request.params.age;
    people.push(request.body);
    response.json(request.body);
});
//Usuwanie osoby
router.delete('/person/:id', function (request, response) {

    for(var i = 0; i < people.length; i++){
        if(people[i].id == request.params.id){
            people.splice(i, 1);
        }
    }

    response.sendStatus(200);

});

// router.get('/person/:id/:name', function (request, response) {

//     for(var i = 0; i < people.length; i++){
//         if(people[i].id == request.params.id){
//             for(var z = 0; z < people.length; z++){
//                 if(people[z].name == request.params.name){
//                     response.json(people[z]);
//                     break;
//                 }
//             }
//             break;
//         }
//     }

//     response.sendStatus(200);

// });

