const express = require('express'); 
const dotenv = require('dotenv').config();

const animalsRouter = express.Router();
// animalsRouter.use('/animals', require('./animals'));

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
} = require('../models/animals');

const {
    addShelter: addShelter,
    getAllShelters: getAllShelters,
    getShelterById: getShelterById,
    editShelter: editShelter,
    addAnimalToShelter: addAnimalToShelter,
    deleteShelter: deleteShelter,
    removeAnimalFromShelter: removeAnimalFromShelter
} = require('../models/shelters');

const {
    addAdopter: addAdopter,
    getAllAdopters: getAllAdopters,
    getAdopterById: getAdopterById,
    editAdopter: editAdopter,
    assignAnimalToAdopter: assignAnimalToAdopter,
    addAnimalToAdopter: addAnimalToAdopter, 
    deleteAdopter: deleteAdopter,
    removeAnimalFromAdopter: removeAnimalFromAdopter
} = require('../models/adopters');

const { formatAnimals } = require('../formats');

const domain = process.env.DOMAIN;

const { expressjwt: jwt } = require('express-jwt'); 
const jwksRsa = require('jwks-rsa'); 
const { default: jwtDecode } = require('jwt-decode');

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

/* ------------- Begin Animals Controller Functions ------------- */
// POST an animal
animalsRouter.post('/', checkJwtForUnprotected(), (req, res) => {
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
        addAnimal(req)
        .then(key => {
            console.log(key);
            getAnimalById(key.id)
            .then (entity => {
                console.log(entity);
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
    getAnimalById(req.params.animal_id)
    .then(animal => {
        if (animal[0] === undefined || animal[0] === null)
        {
            res.status(404).json({'Error': 'No animal with this animal_id exists.' }).end(); 
        }
        else {
            editAnimal(req.params.animal_id, req.body.name, req.body.species, req.body.breed,req.body.age, req.body.gender, req.body.colors, req.body.adoptable, req.body.microchipped, animal[0].location)
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
        // else we just remove the animal like usual
        else {
            deleteAnimal(animal[0].id).then(res.status(204).end()); 
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
                    if (checkIfAnimalInShelter(shelter[0].animals, animal[0].id === false)) 
                    {
                        res.status(404).json({ "Error": "No animal with this animal_id is in the shelter with the shelter_id" })
                    }
                    else {
                        removeAnimalFromShelter(req.params.shelter_id, req.params.animal_id, shelter[0].name, shelter[0].address, shelter[0].contact, shelter[0].animals, shelter[0].user)
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

// Forbidden paths
// PUT request on root animals URL - not allowed since we cannto edit the entire list of animals at once
animalsRouter.put('/', (req, res) => {
    res.set('Accept', 'GET', 'POST');
    res.status(405).json({
        'Error': 'Only GET and POST methods allowed for this path'
    });
})

// DELETE request on root animals URL - not allowed
animalsRouter.delete('/', (req, res) => {
    res.set('Accept', 'GET', 'POST');
    res.status(405).json({
        'Error': 'Only GET and POST methods allowed for this path'
    });
})

/* ------------- End Animals Controller Functions ------------- */

module.exports = {
    animalsRouter: animalsRouter
}