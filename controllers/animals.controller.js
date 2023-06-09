const express = require('express');

const {
    addAnimal: addAnimal,
    getAllAnimals: getAllAnimals,
    getAnimalById: getAnimalById
} = require('./models/animals');

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
animalsRouter.put(':/animal_id/shelters/:shelter_id', (req, res) => {
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
                assignShelterToAnimal(shelter, animal)
                .then()
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
        // if it is associated with a shelter or adopter
        else if (animal[0].location !== null) {
            // remove it from the shelter or adopter

        }
    })
})