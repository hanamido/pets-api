const express = require('express');
const app = express();

const { Datastore } = require('@google-cloud/datastore');

const bodyParser = require('body-parser'); 
const request = require('request'); 

const datastore = new Datastore();

const { expressjwt: jwt } = require('express-jwt'); 
const jwksRsa = require('jwks-rsa'); 
const { default: jwtDecode } = require('jwt-decode');

const { auth, requiresAuth } = require('express-openid-connect');

const config = {
    authRequired: false,
    auth0Logout: true,
    // baseURL: 'https://project7-api-auth.wm.r.appspot.com',
    baseURL: 'http://localhost:8080',
    clientID: '3XETdOIVMtxWOjRSOOD5XsKnFEy3MhOO',
    issuerBaseURL: 'https://cs493-spring-2023.us.auth0.com',
    secret: '9tQjSxuT4_-rRCps-uZvUSlLsYONgYRWCVcvE6qYFqYceOzckAIKhrKq3qpVMQ7M'
};

app.use(auth(config)); 

app.get('/', (req, res) => {
    console.log(req.oidc.idToken); 
    const userJwt = jwtDecode(req.oidc.idToken); 
    const userName = decodedJwt['name']; 
})

let checkJwt = jwt({
    secret: jwksRsa.expressJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `https://${DOMAIN}/.well-known/jwks.json`
    }),

    // Validate the audience and the issuer
    issuer: `https://${DOMAIN}/`,
    algorithms: ['RS256']
})

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

const CLIENT_ID = '3XETdOIVMtxWOjRSOOD5XsKnFEy3MhOO';
const CLIENT_SECRET = '9tQjSxuT4_-rRCps-uZvUSlLsYONgYRWCVcvE6qYFqYceOzckAIKhrKq3qpVMQ7M';
const DOMAIN = 'cs493-spring-2023.us.auth0.com';

app.use(bodyParser.json());

// Add the ID to item from datastore
function fromDatastore(item) {
    item.id = item[Datastore.KEY].id;
    item = {id: item.id, ...item};
    return item; 
}

// Adding the self link to the response
function addSelfLink(id, item, req, baseType) {
    const selfLink = req.protocol + "://" + req.get("host") + "/" + baseType;
    const self = selfLink.concat(`/${id}`); 
    item.self = self;
    item = {"id": id, ...item, "self": self};
    return item; 
}

/* ------------- BEGIN MODEL FUNCTIONS ------------- */

/* ------------- Begin Animals Model Functions ------------- */
// Create a new animal (POST) 
async function addAnimal(req)
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
        "adopt_status": req.body.status,
        "location": null
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
        for (let i = 0; i < animalsLen; i++)
        {
            let currAnimal = animals[i]; 
            // Add the selflink to the animal
            const newAnimal = addSelfLink(currAnimal.id, currAnimal, req, "animals"); 
            animals[i] = newAnimal; 
        }
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

// Partial update of one or more of an animal's properties (PATCH)

// Full update of all of an animal's properties (PUT)

// Associate a shelter/adopter with an animal (PUT)

// Delete an animal (DELETE)

// Delete the shelter from the animal (DELETE)

/* ------------- End Animals Model Functions ------------- */

/* ------------- Begin Shelters Model Functions ------------- */
// Add a shelter (POST) 
async function addShelter(req)
{
    const shelterKey = datastore.key(SHELTER); 
    const newShelter = {
        "name": req.body.name,
        "address": req.body.address,
        "contact": req.body.contact,
        "animals": req.body.animals,
        "user": req.body.user
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

// Partial update of one or more of a shelter's properties (PATCH)

// Full update of all of a shelter's properties (PUT)

// Add an animal to a shelter (PUT)

// Delete a shelter (DELETE)

// Delete the association between the shelter and the animal (DELETE)

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

// Partial update of one or more of an adopter's properties (PATCH)

// Full update of all of an adopter's properties (PUT)

// Put an animal in the adopter's care (PUT)

// Delete an adopter (DELETE)

// Delete the association between the adopter and the animal (DELETE)

/* ------------- End Adopters Model Functions ------------- */ 

/* ------------- Begin Users Model Functions ------------- */
// User needs to get added to Datastore every time they generate a JWT
// Users need to have unique ID displayed

// Add a user to the datastore (POST)
async function addUser(req)
{
    const userKey = datastore.key(USER); 
    const newUser = {
        "unique_id": req.body.id,
        "email": req.body.email,
        "shelter": req.body.contact,
        "animals": req.body.animals,
        "user": req.body.user
    };
    return datastore.save({
        "key": userKey,
        "data": newUser 
    })
    .then(() => {
        return userKey;
    })
}

// Get all users in the datastore (GET)
// Potentially: Display user's unique ID, their email, and the shelter ID associated with them
async function getAllAdopters(req)
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

// GET all animals

// GET an animal based on the id

// PATCH - partial update of >=1 attributes of an animal

// PUT - full update of all attributes of an animal

// PUT - associate a shelter or adopter with the animal

// DELETE - Delete an animal

// DELETE - Delete the shelter from the animal

/* ------------- End Animals Controller Functions ------------- */

/* ------------- Begin Shelters Controller Functions ------------- */
// POST an shelter

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

// GET all users

/* ------------- End Users Controller Functions ------------- */

app.enable('trust proxy'); 

app.use('/animals', animalsRouter);
app.use('/shelters', sheltersRouter);
app.use('/adopters', adoptersRouter);
app.use('/users', usersRouter); 
app.use('/login', login);
app.use('/', router);

// Listen to the App-Engine specific port, or 8080 otherwise
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}...`);
})