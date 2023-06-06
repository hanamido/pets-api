const express = require('express');
const app = express();
const dotenv = require('dotenv').config();
const { addSelfLink, fromDatastore, formatAnimals, formatShelters, formatUsers } = require('./formats').default;

const { Datastore } = require('@google-cloud/datastore');

const bodyParser = require('body-parser'); 
const request = require('request'); 

const datastore = new Datastore();

const { expressjwt: jwt } = require('express-jwt'); 
const jwksRsa = require('jwks-rsa'); 
const { default: jwtDecode } = require('jwt-decode');

const { auth, requiresAuth } = require('express-openid-connect');

const client_id = process.env.CLIENT_ID;
const client_secret = process.env.CLIENT_SECRET;
const domain = process.env.DOMAIN;

const config = {
    authRequired: false,
    auth0Logout: true,
    // baseURL: 'https://project7-api-auth.wm.r.appspot.com',
    baseURL: 'http://localhost:8080',
    clientID: client_id,
    issuerBaseURL: domain,
    secret: client_secret,
};

app.use(auth(config)); 

app.get('/', (req, res) => {
    // unique_id, email, and shelter initialized to null
    if (req.oidc.isAuthenticated()) {
        console.log(req.oidc.idToken); 
        const decodedJwt = jwtDecode(req.oidc.idToken); 
        const userEmail = decodedJwt['name'];
        console.log(userEmail);
        const userId = decodedJwt['sub'];
        console.log(userId); 
        addUser(userId, userEmail).then(user => {
            getUserById(user.id).then(entity => {
                const returnEntity = {
                    unique_id: entity[0].unique_id,
                    email: entity[0].email,
                    shelter: entity[0].shelter
                }
                res.send({user_info: returnEntity, jwt: req.oidc.idToken});
            })
        })
    }
    else {
        res.send("Please go to /login to log in first.");
    }
})

app.use(checkJwt = jwt({
    secret: jwksRsa.expressJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `${domain}/.well-known/jwks.json`
    }),

    // Validate the audience and the issuer
    issuer: `${domain}/`,
    algorithms: ['RS256']
}))

const ANIMAL = "Animal";
const SHELTER = "Shelter";
const ADOPTER = "Adopter";
const USER = "User"; 

const animalsRouter = express.Router();
const login = express.Router();
const sheltersRouter = express.Router();
const adoptersRouter = express.Router();
const usersRouter = express.Router(); 
const router = express.Router();

app.use(bodyParser.json());

/* ------------- BEGIN MODEL FUNCTIONS ------------- */

/* ------------- Begin Animals Model Functions ------------- */
// Create a new animal (POST) 
async function addAnimal(req, user)
{
    const animalKey = datastore.key(ANIMAL); 
    const newAnimal = {
        "name": req.body.name,
        "species": req.body.species,
        "breed": req.body.breed,
        "age": req.body.age,
        "gender": req.body.gender,
        "colors": req.body.colors,
        "attributes": req.body.attributes,
        "adopt_status": req.body.adopt_status,
        "location": null,
        "user": user
    };
    return datastore.save({
        "key": animalKey,
        "data": newAnimal 
    })
    .then(() => {
        return animalKey;
    })
}

// Get all animals (GET)
async function getAllAnimals(req)
{
    // Limit to 5 results per page
    var query = datastore.createQuery(ANIMAL).limit(5);
    const results = {}; 
    var prev; 
    if (Object.keys(req.query).includes("cursor")) {
        prev = req.protocol + "://" + req.get("host") + "/animals" + "?cursor=" + req.query.cursor; 
        query = query.start(req.query.cursor); 
    }
    return datastore.runQuery(query).then( (entities) => {
        // map the animal to its ID
        results.animals = entities[0].map(fromDatastore); 
        const animals = results.animals;
        const animalsLen = animals.length; 
        results.total_items = animalsLen; 
        results.animals = formatAnimals(animals, req);
        if (typeof prev !== 'undefined') {
            results.previous = prev;
        }
        if (entities[1].moreResults !== datastore.NO_MORE_RESULTS) {
            results.next = req.protocol + "://" + req.get("host") + "/animals" + "?cursor=" + entities[1].endCursor; 
        }
        return results;
    });
}

// Get an animal based on ID (GET)
async function getAnimalById(animalId)
{
    const animalKey = datastore.key([
        ANIMAL,
        parseInt(animalId, 10)
    ]);
    return datastore.get(animalKey).then( (entity) => {
        if (entity[0] === undefined || entity[0] === null) {
            // No entity was found, so don't try to add id attribute
            return entity; 
        } else {
            return entity.map(fromDatastore); 
        }
    })
}

// Edit an animal's properties (PATCH/PUT)
async function editAnimal(id, name, species, breed, age, gender, colors, attributes, adopt_status, location, user)
{
    const animalKey = datastore.key([
        ANIMAL,
        parseInt(id, 10)
    ]);
    const updatedAnimal = {
        name: name,
        species: species, 
        breed: breed,
        age: age,
        gender: gender,
        colors: colors,
        attributes: attributes,
        adopt_status: adopt_status,
        location: location,
        user: user
    };
    return datastore.save({
        "key": animalKey,
        "data": updatedAnimal
    })
    .then(() => {
        return animalKey;
    });
}

// Associate a shelter/adopter with an animal (PUT)
async function assignShelterToAnimal(shelter, animal)
{
    // get the animal key from the datastore
    const animalKey = datastore.key([
        ANIMAL,
        parseInt(animal.id, 10)
    ]); 
    // shelter to be added to the animal entity
    let shelterToAdd = {
        "id": shelter.id,
        "name": shelter.name,
        "address": shelter.address, 
        "contact": shelter.contact
    };
    // animal to be added to the shelter entity
    let animalToAdd = {
        "id": animal.id,
        "name": animal.name,
        "species": animal.species,
        "adopt_status": animal.adopt_status
    }
    // updated animal with the shelter added
    const updatedAnimal = {
        "name": animal.name,
        "species": animal.species,
        "breed": animal.breed,
        "age": animal.age,
        "gender": animal.gender,
        "colors": animal.colors,
        "attributes": animal.attributes,
        "adopt_status": animal.adopt_status,
        "location": shelterToAdd,  // contains id, name, address, and contact of the shelter
        "user": animal.user
    };
    // add the updated animal (with the specified shelter) to datastore
    return datastore.save({
        "key": animalKey,
        "data": updatedAnimal
    })
    // Add the animal to the shelter entity
    .then(() => {  
        addAnimalToShelter(animalToAdd, shelter);
        return animalKey;
    })
}

// Delete an animal (DELETE)
function deleteAnimal(animalId) 
{
    const animalKey = datastore.key([
        ANIMAL,
        parseInt(animalId, 10)
    ]);
    return datastore.delete(animalKey);
}

// Remove the location from the animal (shelter or adopter) - DELETE
async function removeLocationFromAnimal(animalId, animalName, animalSpecies, animalBreed, animalAge, animalGender, animalColors, animalAttributes, animalAdopt, animalUser)
{
    const animalKey = datastore.key([
        ANIMAL,
        parseInt(animalId, 10)
    ]); 
    const newAnimal = {
        "name": animalName,
        "species": animalSpecies,
        "breed": animalBreed,
        "age": animalAge,
        "gender": animalGender,
        "colors": animalColors,
        "attributes": animalAttributes,
        "adopt_status": animalAdopt,
        "location": null,
        "user": animalUser
    };
    return datastore.save({
        "key": animalKey,
        "data": newAnimal
    })
    .then(() => {
        return animalKey;
    })
}

/* ------------- End Animals Model Functions ------------- */

/* ------------- Begin Shelters Model Functions ------------- */
// Add a shelter (POST) 
async function addShelter(req, user)
{
    const shelterKey = datastore.key(SHELTER); 
    const newShelter = {
        "name": req.body.name,
        "address": req.body.address,
        "contact": req.body.contact,
        "animals": [],
        "user": user
    };
    return datastore.save({
        "key": shelterKey,
        "data": newShelter 
    })
    .then(() => {
        return shelterKey;
    })
}

// Get all shelters (GET)
async function getAllShelters(req)
{
    // Limit to 5 results per page
    var query = datastore.createQuery(SHELTER).limit(5);
    const results = {}; 
    var prev; 
    if (Object.keys(req.query).includes("cursor")) {
        prev = req.protocol + "://" + req.get("host") + "/shelters" + "?cursor=" + req.query.cursor; 
        query = query.start(req.query.cursor); 
    }
    return datastore.runQuery(query).then( (entities) => {
        // map the shelter to its ID
        results.shelters = entities[0].map(fromDatastore); 
        const shelters = results.shelters;
        const sheltersLen = shelters.length; 
        results.total_items = sheltersLen; 
        for (let i = 0; i < sheltersLen; i++)
        {
            let currShelter = shelters[i]; 
            // Add the selflink to the entity
            const newShelter = addSelfLink(currShelter.id, currShelter, req, "shelters"); 
            shelters[i] = newShelter; 
        }
        if (typeof prev !== 'undefined') {
            results.previous = prev;
        }
        if (entities[1].moreResults !== datastore.NO_MORE_RESULTS) {
            results.next = req.protocol + "://" + req.get("host") + "/shelters" + "?cursor=" + entities[1].endCursor; 
        }
        return results;
    });
}

// Get a shelter based on ID (GET)
async function getShelterById(shelterId)
{
    const shelterKey = datastore.key([
        SHELTER,
        parseInt(shelterId, 10)
    ]);
    return datastore.get(shelterKey).then( (entity) => {
        if (entity[0] === undefined || entity[0] === null) {
            // No entity was found, so don't try to add id attribute
            return entity; 
        } else {
            return entity.map(fromDatastore); 
        }
    })
}

// Edit a shelter's properties (PATCH/PUT)

// Add an animal to a shelter (PUT)
async function addAnimalToShelter(animalToAdd, shelter) 
{
    const shelterKey = datastore.key([
        SHELTER,
        parseInt(shelter.id, 10)
    ]); 
    // add the animal to the animals array property of shelter
    shelter.animals.push(animalToAdd);
    const newShelter = {
        "name": shelter.name,
        "address": shelter.address,
        "contact": shelter.address,
        "animals": shelter.animals,
        "user": shelter.user
    };
    return datastore.save({
        "key": shelterKey,
        "data": newShelter
    })
    .then( () => {
        return shelterKey;
    });
}

// Delete a shelter (DELETE)
async function deleteShelter(shelterId)
{
    const shelterKey = datastore.key([
        SHELTER,
        parseInt(shelterId, 10)
    ]);
    return datastore.delete(shelterKey); 
}

// Remove the association between the shelter and the animal (DELETE)
async function removeAnimalFromShelter(shelterId, animalId, shelterName, shelterAddress, shelterContact, shelterAnimals, shelterUser)
{
    const shelterKey = datastore.key([
        SHELTER,
        parseInt(shelterId, 10)
    ]); 
    let unloadedArray = [];
    const shelterAnimalsLen = shelterAnimals.length; 
    // Add all animals that are not the specified animalId to the new unloadedArray
    for (let i = 0; i < shelterAnimalsLen; i++)
    {
        if (shelterAnimals[i].id !== animalId) {
            unloadedArray.push(shelterAnimals[i]);
        }
    }; 
    // If there is only one animal in the shelter, then clear that array
    if (unloadedArray.length === 0) {
        unloadedArray = [];
    }; 
    const newShelter = {
        "name": shelterName,
        "address": shelterAddress,
        "contact": shelterContact,
        "animals": unloadedArray,
        "user": shelterUser
    };
    return datastore.save({
        "key": shelterKey,
        "data": newShelter
    })
    .then(() => {
        return shelterKey; 
    });
}

/* ------------- End Shelters Model Functions ------------- */

/* ------------- Begin Adopters Model Functions ------------- */
// Add an adopter (POST) 
async function addAdopter(req)
{
    const adopterKey = datastore.key(ADOPTER); 
    const newAdopter = {
        "name": req.body.name,
        "address": req.body.address,
        "contact": req.body.contact,
        "pet": req.body.pet
    };
    return datastore.save({
        "key": adopterKey,
        "data": newAdopter 
    })
    .then(() => {
        return adopterKey;
    })
}

// Get all adopters (GET)
async function getAllAdopters(req)
{
    // Limit to 5 results per page
    var query = datastore.createQuery(ADOPTER).limit(5);
    const results = {}; 
    var prev; 
    if (Object.keys(req.query).includes("cursor")) {
        prev = req.protocol + "://" + req.get("host") + "/adopters" + "?cursor=" + req.query.cursor; 
        query = query.start(req.query.cursor); 
    }
    return datastore.runQuery(query).then( (entities) => {
        // map the adopter to its ID
        results.adopters = entities[0].map(fromDatastore); 
        const adopters = results.adopters;
        const adoptersLen = adopters.length; 
        results.total_items = adoptersLen; 
        for (let i = 0; i < adoptersLen; i++)
        {
            let currAdopter = adopters[i]; 
            // Add the selflink to the entity
            const newAdopter = addSelfLink(currAdopter.id, currAdopter, req, "adopters"); 
            adopters[i] = newAdopter; 
        }
        if (typeof prev !== 'undefined') {
            results.previous = prev;
        }
        if (entities[1].moreResults !== datastore.NO_MORE_RESULTS) {
            results.next = req.protocol + "://" + req.get("host") + "/adopters" + "?cursor=" + entities[1].endCursor; 
        }
        return results;
    });
}

// Get an adopter based on ID (GET)
async function getAdopterById(adopterId)
{
    const adopterKey = datastore.key([
        ADOPTER,
        parseInt(adopterId, 10)
    ]);
    return datastore.get(adopterKey).then( (entity) => {
        if (entity[0] === undefined || entity[0] === null) {
            // No entity was found, so don't try to add id attribute
            return entity; 
        } else {
            return entity.map(fromDatastore); 
        }
    })
}

// Update an adopter's properties (PATCH)

// Put an animal in the adopter's care (PUT)

// Delete an adopter (DELETE)
async function deleteAdopter(adopterId)
{
    const adopterKey = datastore.key([
        ADOPTER,
        parseInt(adopterId, 10)
    ]);
    return datastore.delete(adopterKey);
}

// Delete the association between the adopter and the animal (DELETE)

/* ------------- End Adopters Model Functions ------------- */ 

/* ------------- Begin Users Model Functions ------------- */
// User needs to get added to Datastore every time they generate a JWT
// Users need to have unique ID displayed

// Add a user to the datastore (POST)
async function addUser(user_id, email)
{
    const userKey = datastore.key(USER); 
    const newUser = {
        "unique_id": user_id,
        "email": email,
        "shelter": null,
        // "animal": req.body.animals,
    };
    return datastore.save({
        "key": userKey,
        "data": newUser 
    })
    .then(() => {
        return userKey;
    })
}

// Get a specific user in the datastore (GET)
async function getUserById(userId)
{
    const userKey = datastore.key([
        USER,
        parseInt(userId, 10)
    ]);
    return datastore.get(userKey).then( (entity) => {
        if (entity[0] === undefined || entity[0] === null) {
            // No entity was found, so don't try to add id attribute
            return entity; 
        } else {
            return entity.map(fromDatastore); 
        }
    })
}

// Get all users in the datastore (GET)
// Potentially: Display user's unique ID, their email, and the shelter ID and name associated with them
async function getAllUsers(req)
{
    const query = datastore.createQuery(USER);
    return datastore.runQuery(query)
    .then( (entities) => {
        return entities[0].map(fromDatastore);
    });
}

/* ------------- End Users Model Functions ------------- */

/* ------------- END MODEL FUNCTIONS ------------- */


/* ------------- BEGIN CONTROLLER FUNCTIONS ------------- */

/* ------------- Begin Animals Controller Functions ------------- */
// POST an animal
animalsRouter.post('/', checkJwt, (req, res) => {
    // gets the JWT
    const jwToken = req.header('authorization');
    console.log(jwToken);
    // request must be JSON
    if (req.get('content-type') !== 'application/json') {
        res.status(415).send({ 'Error': 'The server only accepts application/json data.' });
    }
    // if the request is missing the required parameters, the animal is not created and status 400 is returned
    else if (req.body.name === undefined || req.body.species === undefined || 
        req.body.breed === undefined || req.body.age === undefined ||
        req.body.gender === undefined || req.body.colors === undefined ||
        req.body.attributes === undefined || req.body.adopt_status === undefined)
    {
        res.status(400).json({ 'Error': 'The request object is missing at least one required attribute.' }); 
    }
    // If JWT is invalid or missing, status code 401 is returned
    else if (jwToken === null || jwToken === undefined) {
        res.status(401).json({ 'Error': 'Invalid jwt.' });
    }
    // If JWT is valid the animal is created
    else 
        console.log(jwToken);
        const decodedJwt = jwtDecode(jwToken);
        const user = decodedJwt['sub']; 
        addAnimal(req)
        .then(key => {
            getAnimalById(key.id)
            .then (entity => {
                const newAnimal = addSelfLink(key.id, entity[0], req, "animals");
                const formattedAnimal = {
                    id: newAnimal.id,
                    name: newAnimal.name,
                    species: newAnimal.species,
                    breed: newAnimal.breed,
                    age: newAnimal.age,
                    gender: newAnimal.gender,
                    colors: newAnimal.colors,
                    attributes: newAnimal.attributes,
                    adopt_status: newAnimal.adopt_status,
                    location: newAnimal.location
                }
                res.status(201).send(formattedAnimal);
            })
        })
    
})

// GET all animals
animalsRouter.get('/', function(req, res) {
    const animals = getAllAnimals(req)
    .then( animals => {
        res.status(200).json(animals);
    })
})

// GET an animal based on the id

// PATCH - partial update of >=1 attributes of an animal

// PUT - full update of all attributes of an animal

// PUT - associate a shelter or adopter with the animal

// DELETE - Delete an animal

// DELETE - Delete the shelter from the animal

/* ------------- End Animals Controller Functions ------------- */

/* ------------- Begin Shelters Controller Functions ------------- */
// POST an shelter
sheltersRouter.post('/', checkJwt, (req, res) => {
    // gets the JWT 
    const jwToken = req.header('authorization');
    // request must be JSON
    if (req.get('content-type') !== 'application/json') {
        res.status(415).send({ 'Error': 'The server only accepts application/json data.' }); 
    }
    // if request is missing any required parameters, the shelter is not created and status is 400
    if (req.body.name === undefined || req.body.address === undefined || 
        req.body.email === undefined || req.body.phone === undefined) 
    {
        res.status(400).json({ 'Error': 'The request object is missing at least one required attribute.' });
    }
    // if JWT is invalid or missing, status code 401 is returned
    else if (jwToken === null || jwToken === undefined) {
        res.status(401).json({ 'Error': 'Invalid jwt.' });
    }
    // if JWT is valid, the shelter is created and the user is set to the 'sub' property in the JWT
    else {
        const decodedJwt = jwtDecode(jwToken);
        addShelter(req, decodedJwt['sub'])
        .then(key => {
            getShelterById(key.id)
            .then(shelter => {
                const newShelter = addSelfLink(key.id, shelter, req, "shelters"); 
                res.status(201).send(newShelter);
            }); 
        }); 
    };
})

// GET all shelters

// GET a shelter based on the id

// PATCH - partial update of >=1 attributes of a shelter

// PUT - full update of all attributes of a shelter

// PUT - associate an animal with the shelter

// DELETE - Delete a shelter

// DELETE - Remove the animal from the shelter

/* ------------- End Shelters Controller Functions ------------- */

/* ------------- Begin Adopters Controller Functions ------------- */
// POST an adopter

// GET all adopters

// GET an adopter based on the id

// PATCH - partial update of >=1 attributes of an adopter

// PUT - full update of all attributes of an adopter

// PUT - associate an animal with the adopter

// DELETE - Delete an adopter

// DELETE - Remove the animal from the adopter

/* ------------- End Adopters Controller Functions ------------- */

/* ------------- Begin Users Controller Functions ------------- */
// POST a user to the datastore
login.post('/', function(req, res) {
    const username = req.body.username; 

})

// GET all users

/* ------------- End Users Controller Functions ------------- */

app.enable('trust proxy'); 

app.use('/animals', animalsRouter);
app.use('/shelters', sheltersRouter);
app.use('/adopters', adoptersRouter);
app.use('/users', usersRouter); 
// app.use('/login', login);
app.use('/', router);

app.use(function(err, req, res, next) {
    if (err.name === 'UnauthorizedError') {
        res.status(401).send({ 'Error': "Missing or Invalid JWT" }); 
    } else {
        next();
    }
})

// Listen to the App-Engine specific port, or 8080 otherwise
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}...`);
})