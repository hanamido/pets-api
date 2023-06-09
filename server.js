const express = require('express');
const app = express();
const dotenv = require('dotenv').config();
// const addSelfLink = require('./formats');

// module exports
const { addSelfLink, fromDatastore, formatAnimals, formatShelters, formatUsers } = require('./formats');
const {
    addAnimal: addAnimal,
    getAllAnimals: getAllAnimals,
    getAnimalById: getAnimalById,
    editAnimal: editAnimal,
    assignShelterToAnimal: assignShelterToAnimal,
    assignAdopterToAnimal: assignAdopterToAnimal,
    deleteAnimal: deleteAnimal,
    removeLocationFromAnimal: removeLocationFromAnimal,
    checkIfAnimalInShelter: checkIfAnimalInShelter,
    checkIfAnimalWithAdopter: checkIfAnimalWithAdopter
} = require('./models/animals');
const {
    addShelter: addShelter,
    getAllShelters: getAllShelters,
    getShelterById: getShelterById,
    editShelter: editShelter,
    addAnimalToShelter: addAnimalToShelter,
    deleteShelter: deleteShelter,
    removeAnimalFromShelter: removeAnimalFromShelter
} = require('./models/shelters');

const {
    addAdopter: addAdopter,
    getAllAdopters: getAllAdopters,
    getAdopterById: getAdopterById,
    editAdopter: editAdopter,
    assignAnimalToAdopter: assignAnimalToAdopter,
    addAnimalToAdopter: addAnimalToAdopter, 
    deleteAdopter: deleteAdopter,
    removeAnimalFromAdopter: removeAnimalFromAdopter
} = require('./models/adopters');

const { Datastore } = require('@google-cloud/datastore');

const bodyParser = require('body-parser'); 
const request = require('request'); 

const datastore = new Datastore();

const { expressjwt: jwt } = require('express-jwt'); 
const jwksRsa = require('jwks-rsa'); 
const { default: jwtDecode } = require('jwt-decode');

const { auth, requiresAuth } = require('express-openid-connect');
const { parse } = require('dotenv');

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
    if (req.oidc.isAuthenticated()) {
        const decodedJwt = jwtDecode(req.oidc.idToken); 
        const userEmail = decodedJwt['name'];
        console.log(userEmail);
        const userId = decodedJwt['sub'];
        console.log(userId); 
        // checks if the user is already in datastore
        // if so, do not add that user and just display their JWT
        // const query = datastore.createQuery(USER).filter('user_id', '=', userId);
        // return datastore.runQuery(query).then( data => {
        //     // if the user is found (not an empty array), then return that user's data
        //     console.log(data, data[0]);
        //     if (data[0].length !== 0) {
        //         console.log('User is already in datastore.');
        //         const user = data[0][0];
        //         const returnEntity = {
        //             user_id: user.user_id,
        //             email: user.email,
        //             shelter: user.shelter,
        //             animals: user.animals
        //         }
        //         res.send({ user_info: returnEntity, jwt: req.oidc.idToken });
        //     }
        //     // else we add the user and return the entity to be displayed
        //     else {
        //         console.log('User is NOT in datastore yet.');
        //         addUser(userId, userEmail).then(user => {
        //             getUserById(user.id).then(entity => {
        //                 const returnEntity = {
        //                     user_id: entity[0].user_id,
        //                     email: entity[0].email,
        //                     shelter: entity[0].shelter,
        //                     animals: entity[0].animals
        //                 }
        //                 res.send({user_info: returnEntity, jwt: req.oidc.idToken});
        //             })
        //         })
        //     }
        // })
        checkIfUserInDatastore(userId).then(data => {
            if (data != null) {
                console.log(data);
                const returnEntity = formatUsers(data, req); 
                res.send({ user_info: returnEntity, jwt: req.oidc.idToken });
            }
            else {
                addUser(userId, userEmail).then(user => {
                    getUserById(user.id).then(entity => {
                        console.log(entity[0]);
                        const returnEntity = formatUsers(entity, req)
                        res.send({user_info: returnEntity, jwt: req.oidc.idToken});
                    })
                })
            }
        }); 
    }
    else {
        res.send("Please go to /login to log in first.");
    }
})

let checkJwt = jwt({
    secret: jwksRsa.expressJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `${domain}/.well-known/jwks.json`
    }),

    // Validate the audience and the issuer
    issuer: `${domain}/`,
    algorithms: ['RS256']
})

// app.use(checkJwt = jwt({
//     secret: jwksRsa.expressJwtSecret({
//         cache: true,
//         rateLimit: true,
//         jwksRequestsPerMinute: 5,
//         jwksUri: `${domain}/.well-known/jwks.json`
//     }),

//     // Validate the audience and the issuer
//     issuer: `${domain}/`,
//     algorithms: ['RS256']
// }))

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
function checkJwtForUnprotected() {
    return [
        checkJwt,
        function(err, req, res, next) {
            if (err) {
                next();
            } 
        }
    ]
}

/* ------------- Begin Adopters Model Functions ------------- */
// Add an adopter (POST) 
async function addAdopter(req)
{
    const adopterKey = datastore.key(ADOPTER); 
    const newAdopter = {
        "name": req.body.name,
        "address": req.body.address,
        "contact": req.body.contact,
        "pets": req.body.pets
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

// Edit an adopter's properties (PUT/PATCH)
async function editAdopter(adopterId, adopterName, adopterContact, adopterPets)
{
    // Generates a key complete with id
    const adopterKey = datastore.key([
        ADOPTER,
        parseInt(adopterId, 10)
    ]); 
    const contactInfo = {
        "email": adopterContact[0].email,
        "phone_number": adopterContact[0].phone_number
    };
    const newAdopter = {
        "name": adopterName,
        "contact": contactInfo,
        "pets": adopterPets
    };
    return datastore.save({
        "key": adopterKey,
        "data": newAdopter
    })
    .then(() => {
        return adopterKey;
    });
}

// Assign an animal to an adopter
async function assignAnimalToAdopter(animal, adopter)
{
    const animalKey = datastore.key([
        ANIMAL,
        parseInt(animal.id, 10)
    ]);
    // adopter info to add to animal's location property
    let adopterToAdd = {
        "id": adopter.id,
        "name": adopter.name
    };
    // animal info to add to the adopter's pets property
    let animalToAdd = {
        "id": animal.id,
        "name": animal.name,
        "species": animal.species
    }; 
    // update animal's location property with adopterToAdd
    const newAnimal = {
        name: animal.name,
        species: animal.species,
        breed: animal.breed, 
        age: animal.age,
        gender: animal.gender,
        colors: animal.colors,
        attributes: animal.attributes,
        adopt_status: animal.adopt_status,
        location: adopterToAdd,
        user: animal.user
    }; 
    // Save animal details with the adopter in location property
    return datastore.save({
        "key": animalKey,
        "data": newAnimal
    })
    .then(() => {
        addAnimalToAdopter(animalToAdd, adopter);
        return animalKey; 
    })
}

// Add an animal to the adopter's pet's array
async function addAnimalToAdopter(animalToAdd, adopter)
{
    const adopterKey = datastore.key([
        ADOPTER,
        parseInt(adopter.id, 10)
    ]); 
    adopter.pets.push(animalToAdd);
    const newAdopter = {
        name: adopter.name,
        contact: adopter.contact,
        pets: adopter.pets
    };
    return datastore.save({
        "key": adopterKey,
        "data": newAdopter
    }).then(() => {
        return adopterKey;
    })
}

// Delete an adopter (DELETE)
async function deleteAdopter(adopterId)
{
    const adopterKey = datastore.key([
        ADOPTER,
        parseInt(adopterId, 10)
    ]);
    return datastore.delete(adopterKey);
}

// Remove the association between a pet and an adopter
// Used when the animal is deleted or the animal is moved back to the shelter
async function removeAnimalFromAdopter(adopterId, animalId, adopterName, adopterContact, adopterPets)
{
    const adopterKey = datastore.key([
        ADOPTER,
        parseInt(adopterId, 10)
    ]); 
    let unloadedPets = []; 
    // add all the pets whose id doesn't match the pet we are trying to remove
    const allPetsLen = adopterPets.length;
    for (let i = 0; i < allPetsLen; i++)
    {
        if (adopterPets[i].id !== animalId) 
        {
            unloadedPets.push(adopterPets[i]); 
        }
    }; 
    // if it is the only animal in the adopter's care, then clear the pets array
    if (unloadedPets.length === 0) {
        unloadedPets = [];
    };
    const updatedAdopter = {
        name: adopterName,
        contact: adopterContact,
        pets: unloadedPets
    };
    return datastore.save({
        key: adopterKey,
        data: updatedAdopter
    })
    .then(() => {
        return adopterKey;
    });
}

/* ------------- End Adopters Model Functions ------------- */ 

/* ------------- Begin Users Model Functions ------------- */
// User needs to get added to Datastore every time they generate a JWT
// Users need to have unique ID displayed

// Add a user to the datastore (POST)
async function addUser(user_id, email)
{
    const userKey = datastore.key(USER); 
    const newUser = {
        "user_id": user_id,
        "email": email,
        "animals": []
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

// Function to check if user is already in the datastore
async function checkIfUserInDatastore(user_id)
{
    const query = datastore.createQuery(USER).filter('user_id', '=', user_id);
    return datastore.runQuery(query).then( data => {
        // if the user is found, then return that user's data
        if (data[0].length !== 0) {
            return data[0];
        }
        return null;
    })
}

/* ------------- End Users Model Functions ------------- */

/* ------------- END MODEL FUNCTIONS ------------- */


/* ------------- BEGIN CONTROLLER FUNCTIONS ------------- */

/* ------------- Begin Animals Controller Functions ------------- */
// POST an animal
animalsRouter.post('/', (req, res) => {
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
        req.body.adoptable === undefined || req.body.microchipped === undefined)
    {
        res.status(400).json({ 'Error': 'The request object is missing at least one required attribute.' }); 
    }
    else 
    {
        const decodedJwt = jwtDecode(jwToken);
        const user = decodedJwt['sub']; 
        addAnimal(req, user)
        .then(key => {
            getAnimalById(key.id)
            .then (entity => {
                const formattedAnimal = formatAnimals(entity, req);
                res.status(201).send(formattedAnimal);
            })
        })
    }
})

// GET all animals in the datastore
animalsRouter.get('/', checkJwtForUnprotected(), function(req, res) {
    const animals = getAllAnimals(req)
    .then( animals => {
        res.status(200).json(animals);
    })
})

// GET an animal based on the id
animalsRouter.get('/:animal_id', checkJwtForUnprotected(), (req, res) => {
    getAnimalById(req.params.animal_id)
    .then(animal => {
        // Only support viewing of the animal as application/json
        const accepts = req.accepts(['application/json']);
        if (!accepts) {
            res.status(406).send({ 'Error': 'MIME Type not supported by endpoint' });
        }
        else if (animal[0] === undefined || animal[0] === null) {
            res.status(404).json({ 'Error': 'No animal with this animal_id is found.' }); 
        } else {
            const formattedAnimal = formatAnimals(animal, req);
            res.status(200).json(formattedAnimal); 
        }
    })
})

// PATCH - Update any subset of attributes of an animal
animalsRouter.patch('/:animal_id', (req, res) => {
    // first get the animal
    getAnimalById(req.params.animal_id)
    // promise returns value of animal as an array
    .then(animal => {  
        // if the animal is not found
        if (animal[0] === undefined || animal[0] === null)
        {
            res.status(404).json({ 'Error': 'The specified animal does not exist' }).end(); 
        }
        else {
            const currAnimal = animal[0];
            // Get the value(s) we would like to update
            let animalName = currAnimal.name; 
            let animalSpecies = currAnimal.species;
            let animalBreed = currAnimal.breed;
            let animalAge = currAnimal.age;
            let animalGender = currAnimal.gender;
            let animalColors = currAnimal.colors;
            let animalAdoptable = currAnimal.adoptable;
            let animalMicrochipped = currAnimal.microchipped;
            let animalLocation = currAnimal.location;
            if (req.body.name !== undefined) {
                animalName = req.body.name; 
            } 
            if (req.body.species !== undefined) {
                animalSpecies = req.body.species; 
            }
            if (req.body.breed !== undefined) {
                animalBreed = req.body.breed;
            } 
            if (req.body.age !== undefined) {
                animalAge = req.body.age;
            } 
            if (req.body.gender !== undefined) {
                animalGender = req.body.gender;
            } 
            if (req.body.colors !== undefined) {
                animalColors = req.body.colors;
            }
            if (req.body.adoptable !== undefined) {
                animalAdoptable = req.body.adoptable;
            }
            if (req.body.microchipped !== undefined) {
                animalMicrochipped = req.body.microchipped;
            }
            if (req.body.location !== undefined) {
                animalLocation = req.body.location;
            }
            editAnimal(currAnimal.id, animalName, animalSpecies, animalBreed, animalAge, animalGender, animalColors, animalAdoptable, animalMicrochipped, animalLocation)
            .then(key => {
                getAnimalById(key.id)
                .then(animal => {
                    const editedAnimal = formatAnimals(animal, req);
                    res.status(200).json(editedAnimal);
                })
            })
        }
    })
})

// PUT - update all attributes of an animal
animalsRouter.put('/:animal_id', (req, res) => {
    // if the request is missing any parameters (except location and user), the animal is not edited
    if (req.body.name === undefined || req.body.species === undefined ||
        req.body.breed === undefined || req.body.age === undefined ||
        req.body.gender === undefined || req.body.colors === undefined ||
        req.body.adoptable === undefined || req.body.microchipped === undefined ||
        req.body.location === undefined)  
    {
        res.status(400).json({ 'Error': 'The request object is missing at least one of the required attributes.' }).end();
    }
    else 
    {
        getAnimalById(req.params.animal_id)
        .then(animal => {
            if (animal[0] === undefined || animal[0] === null)
            {
                res.status(404).json({'Error': 'No animal with this animal_id exists.' }).end(); 
            }
            else {
                editAnimal(req.params.animal_id, req.body.name, req.body.species, req.body.breed,req.body.age, req.body.gender, req.body.colors, req.body.adopt_status, req.body.location)
                .then(key => {
                    getAnimalById(key.id)
                    .then(animal => {
                        const editedAnimal = formatAnimals(animal, req);
                        res.status(200).json(editedAnimal);
                    })
                })
            }
        })
    }
})

// PUT - assign a shelter to the animal
animalsRouter.put('/:animal_id/shelters/:shelter_id', (req, res) => {
    console.log('Entering put MODE');
    getShelterById(req.params.shelter_id)
    .then(shelter => {
        if (shelter[0] === undefined || shelter[0] === null)
        {
            res.status(404).json({ 'Error': 'The specified shelter does not exist.' }); 
        }
        else 
        {
            getAnimalById(req.params.animal_id)
            .then(animal => {
                assignShelterToAnimal(shelter[0], animal[0])
                .then(key => {
                    getAnimalById(key.id).then(newAnimal => {
                        console.log(newAnimal);
                    const formattedAnimal = formatAnimals(newAnimal, req);
                    res.status(200).json(formattedAnimal);
                    })
                });
            })
        }
    })
})


// DELETE - Delete an animal
animalsRouter.delete('/:animal_id', (req, res) => {
    // if the animal is associated with a shelter or adopter, remove the animal from the shelter's 'animals' or the adopter's 'pets' property
    getAnimalById(req.params.animal_id)
    .then(animal => {
        if (animal[0] === undefined || animal[0] === null) {
            res.status(404).json({ 'Error': 'No animal with this animal_id exists.' })
        }
        // if the animal is associated with a shelter, remove it from the shelter's animals array
        else if (animal[0].location !== null && animal[0].location.type === "shelter") {
            const shelterId = animal[0].location.id; 
            getShelterById(shelterId)
            .then(shelter => {
                removeAnimalFromShelter(shelter[0].id, animal[0].id, shelter[0].name, shelter[0].address, shelter[0].email, shelter[0].phone_number, shelter[0].animals, shelter[0].user).then(() => {
                    deleteAnimal(animal[0].id).then(res.status(204).end()); 
                })
            })
        }
    })
})

// DELETE - Delete the shelter from the animal (without removing the entire animal)
animalsRouter.delete('/:animal_id/shelters/:shelter_id', (req, res) => {
    getAnimalById(req.params.animal_id)
    .then(animal => {
        if (animal[0] === undefined || animal[0] === null)
        {
            res.status(404).json({ "Error": "No animal with this animal_id exists" });
        }
        else {
            getShelterById(req.params.shelter_id)
            .then(shelter => {
                if (shelter[0] === undefined || shelter[0] === null)
                {
                    res.status(404).json({
                        "Error": "No animal with this animal_id is in the shelter with the shelter_id"
                    }); 
                }
                else {
                    console.log(checkIfAnimalInShelter(shelter[0].animals, animal[0].id));
                    if (!checkIfAnimalInShelter(shelter[0].animals, animal[0].id)) 
                    {
                        res.status(404).json({ "Error": "No animal with this animal_id is in the shelter with the shelter_id" })
                    }
                    else {
                        removeAnimalFromShelter(req.params.shelter_id, req.params.animal_id, shelter[0].name, shelter[0].address, shelter[0].email, shelter[0].phone_number, shelter[0].animals, shelter[0].user)
                        .then(
                            removeLocationFromAnimal(req.params.animal_id, animal[0].name, animal[0].species, animal[0].breed, animal[0].age, animal[0].gender, animal[0].colors, animal[0].adoptable, animal[0].microchipped)
                            .then(res.status(204).end()) 
                        )
                    }
                }
            })
        }
    })
})

/* ------------- End Animals Controller Functions ------------- */

/* ------------- Begin Shelters Controller Functions ------------- */
// POST an shelter (protected route)
sheltersRouter.post('/', checkJwt, (req, res) => {
    // gets the JWT 
    const jwToken = req.header('authorization');
    // request must be JSON
    if (req.get('content-type') !== 'application/json') {
        res.status(415).send({ 'Error': 'The server only accepts application/json data.' }); 
    }
    // if request is missing any required parameters, the shelter is not created and status is 400
    if (req.body.name === undefined || req.body.address === undefined || 
        req.body.phone_number === undefined) 
    {
        res.status(400).json({ 'Error': 'The request object is missing at least one required attribute.' });
    }
    // if JWT is valid, the shelter is created and the user is set to the 'sub' property in the JWT
    else {
        const decodedJwt = jwtDecode(jwToken);
        addShelter(req, decodedJwt['sub'])
        .then(key => {
            if (key === null) {
                res.status(403).json({
                    'Error': 'A shelter with that name already exists'
                }).end();
            }
            else {
                getShelterById(key.id)
                .then(shelter => {
                    const newShelter = addSelfLink(key.id, shelter, req, "shelters"); 
                    res.status(201).send(newShelter);
                }); 
            }
        }); 
    };
})

// GET all shelters (protected route)
sheltersRouter.get('/', checkJwt, (req, res) => {
    getAllShelters(req)
    .then(shelters => {
        res.status(200).json(shelters);
    })
})

// GET a shelter based on the id (protected route)
sheltersRouter.get('/:shelter_id', checkJwt, (req, res) => {
    getShelterById(req.params.shelter_id)
    .then(shelter => {
        // Only support viewing of the animal as application/json
        const accepts = req.accepts(['application/json']);
        if (!accepts) {
            res.status(406).send({ 'Error': 'MIME Type not supported by endpoint' });
        }
        else if (shelter[0] === undefined || shelter[0] === null)
        {
            res.status(404).json({ 'Error': 'No shelter with this shelter_id exists' }); 
        } 
        else {
            const shelterToDisplay = formatShelters(shelter, req); 
            res.status(200).json(shelterToDisplay);
        }
    })
})

// PATCH - update any subset of properties of a shelter (protected route)
sheltersRouter.patch('/:shelter_id', checkJwt, function(req, res) {
    // request must be JSON
    if (req.get('content-type') !== 'application/json') {
        res.status(415).json({
            'Error': 'The server only accepts application/json data.'
        })
    }
    else {
        // Set the properties
        let newName = req.body.name;
        let newAddress = req.body.address;
        let newEmail = req.body.email;
        let newPhoneNumber = req.body.phone_number;
        let newAnimals = req.body.animals; 
        // Retrieve the shelter we want to edit
        getShelterById(req.params.shelter_id)
        .then(shelter => {
            if (shelter[0] === undefined || shelter[0] === null)
            {
                res.status(404).json({ 
                    'Error': 'No shelter with this shelter_id exists'
                }).end();
            }
            else {
                if (req.body.name === undefined || req.body.name === null)
                    newName = shelter[0].name;
                if (req.body.address === undefined || req.body.address === null)
                    newAddress = shelter[0].address;
                if (req.body.email === undefined || req.body.email === null)
                    newEmail = shelter[0].email;
                if (req.body.phone_number === undefined || req.body.phone_number === null)
                    newPhoneNumber = shelter[0].phone_number;
                if (req.body.animals === undefined)
                    newAnimals = shelter[0].animals;
                editShelter(req.params.shelter_id, newName, newAddress, newEmail, newPhoneNumber, newAnimals, shelter[0].user)
                .then( key => {
                    // make sure the shelter name is already taken
                    if (key === null) {
                        res.status(403).json({
                            'Error': 'A shelter with that name already exists'
                        });
                    } 
                    else {
                        getShelterById(key.id)
                        .then(shelter => {
                            const formattedShelter = formatShelters(shelter, req);
                            res.status(200).json(formattedShelter);
                        })
                    }
                })
            }
        })
    }
})

// PUT - full update of all editable attributes of a shelter (aside from pets and user)
sheltersRouter.put('/:shelter_id', checkJwt, (req, res) => {
    // retrieve the shelter to update
    getShelterById(req.params.shelter_id)
    .then(shelter => {
        if (shelter[0] === undefined || shelter[0] === null)
        {
            res.status(404).json({
                'Error': 'No shelter with this shelter_id exists'
            });
        }
        else {
            editShelter(req.params.shelter_id, req.body.name, req.body.address, req.body.email, req.body.phone_number, shelter[0].animals, shelter[0].user)
            .then(key => {
                // Make sure the shelter name is not already in datastore
                if (key === null) {
                    res.status(403).json({
                        'Error': 'A shelter with that name already exists'
                    }); 
                }
                else {
                    getShelterById(key.id)
                    .then(shelter => {
                        const formattedShelter = editShelter(addSelfLink(shelter[0].id, shelter[0], req));
                        res.status(200).json(formattedShelter);
                        // res.status(204).end(); 
                    })
                }
            }) 
        }
    })
})

// PUT - associate an animal with the shelter (through shelters route)
sheltersRouter.put('/:shelter_id/animals/:animal_id', (req, res) => {
    getShelterById(req.params.shelter_id)
    .then(shelter => {
        if (shelter[0] === undefined || shelter[0] === null)
        {
            res.status(404).json({
                'Error': 'No shelter with this shelter_id exists'
            }); 
        }
        else {
            getAnimalById(req.params.animal_id)
            .then(animal => {
                if (animal[0] === undefined || animal[0] === null)
                {
                    res.status(404).json({
                        'Error': 'No animal with this animal_id exists'
                    }); 
                }
                // if both shelter and animal are in db, check if the animal is in the shelter
                else if (animal[0].location != null) 
                {
                    res.status(403).json({
                        'Error': 'The animal is already in another shelter'
                    }); 
                }
                else {
                    assignShelterToAnimal(shelter[0], animal[0]).then(() => {
                        getShelterById(req.params.shelter_id).then(entity => {
                            const formattedShelter = formatShelters(entity, req); 
                            res.status(200).json(formattedShelter);
                        })
                    })

                }
            })
        }
    })
})

// DELETE - Delete a shelter
sheltersRouter.delete('/:shelter_id', (req, res) => {
    getShelterById(req.params.shelter_id)
    .then(shelter => {
        if (shelter[0] === undefined || shelter[0] === null)
        {
            res.status(404).json({
                'Error': 'No shelter with this shelter_id is found'
            }); 
        }
        // if there are animals associated with the shelter, remove the shelter from the animals
        else if (shelter[0].animals.length !== 0){
            const shelterAnimalsLen = shelter[0].animals.length; 
            for (let i = 0; i < shelterAnimalsLen; i++) {
                const animal = shelter[0].animals[i]
                const animalId = animal.id;
                getAnimalById(animalId).then(animal => {
                    deleteShelter(req.params.shelter_id)
                    .then( () => {
                        removeLocationFromAnimal(animalId, animal[0].name, animal[0].species, animal[0].breed, animal[0].age, animal[0].gender, animal[0].colors, animal[0].adoptable, animal[0].microchipped)
                        .then(res.status(204).end());
                    })
                })
            }
        }
    })
})

// DELETE - Remove the animal from the shelter (wihtout deleting the entire shelter or animal entity) (protected route)
sheltersRouter.delete('/:shelter_id/animals/animal_id', checkJwt, (req, res) => {
    // make sure that the shelter exists
    getShelterById(req.params.shelter_id)
    .then(shelter => {
        if (shelter[0] === undefined || shelter[0] === null)
        {
            res.status(404).json({
                'Error': 'No shelter with this shelter_id exists'
            });
        }
        else {
            // make sure that the animal exists
            getAnimalById(req.params.animal_id)
            .then(animal => {
                if (animal[0] === undefined || animal[0] === null)
                {
                    res.status(404).json({
                        'Error': 'No animal with this animal_id exists'
                    })
                }
                // animal and shelter exists, now check to see if the animal is at this shelter
                else if (checkIfAnimalInShelter(shelter[0].animals, req.params.animal_id)) {
                    // if yes then proceed to removing the animal from the shelter
                    removeAnimalFromShelter(req.params.shelter_id, req.params.animal_id, shelter[0].name, shelter[0].address, shelter[0].email, shelter[0].phone_number, shelter[0].animals, shelter[0].user)
                    .then(res.status(204).end());
                }
            })
        }
    })
})

/* ------------- End Shelters Controller Functions ------------- */

/* ------------- Begin Adopters Controller Functions ------------- */
// POST an adopter
adoptersRouter.post('/', (req, res) => {

}) 

// GET all adopters
adoptersRouter.get('/', (req, res) => {

})

// GET an adopter based on the id
adoptersRouter.get('/:adopter_id', (req, res) => {

})

// PATCH - update of a subset of attributes of an adopter
adoptersRouter.patch('/:adopter_id', (req, res) => {

})

// PUT - full update of all attributes of an adopter
adoptersRouter.put('/:adopter_id', (req, res) => {

})

// PUT - associate an animal with the adopter
adoptersRouter.put('/:adopter_id/animals/:animal_id', (req, res) => {

})

// DELETE - Delete an adopter
adoptersRouter.delete('/:adopter_id', (req, res) => {

})

// DELETE - Remove the animal from the adopter
adoptersRouter.delete('/:adopter_id/animals/:animal_id', (req, res) => {
    
})

/* ------------- End Adopters Controller Functions ------------- */

/* ------------- Begin Users Controller Functions ------------- */
// POST a user to the datastore
login.post('/', function(req, res) {
    const username = req.body.username; 

})

// GET all users
usersRouter.get('/', function(req, res) {
    const allUsers = getAllUsers(req)
    .then(users => {
        const formattedUsers = formatUsers(users, req);
        res.status(200).json(formattedUsers);
    })
})

// GET a specified user based on the given id
usersRouter.get('/:user_id', function(req, res) {
    getUserById(req.params.user_id)
    .then(user => {
        const formattedUser = formatUsers(user, req);
        res.status(200).json(formattedUser);
    })
})

/* ------------- End Users Controller Functions ------------- */

app.enable('trust proxy'); 

app.use('/animals', animalsRouter);
app.use('/shelters', sheltersRouter);
app.use('/adopters', adoptersRouter);
app.use('/users', usersRouter); 
// app.use('/login', login);
app.use('/', router);

app.use(checkJwt);

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