const express = require('express'); 
const dotenv = require('dotenv').config();

const sheltersRouter = express.Router();

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

const { addShelterToUser } = require('../models/users');

const { formatShelters } = require('../formats');

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
    if (req.body.name === undefined || req.body.contact === undefined) 
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
                // add it to that user's shelters array
                addShelterToUser(key, decodedJwt['sub'], req).then(() => {
                    getShelterById(key.id)
                    .then(shelter => {
                        const newShelter = formatShelters(shelter, req);
                        res.status(201).send(newShelter);
                    }); 
                })
            }
        }); 
    };
})

// GET all shelters (protected route)
sheltersRouter.get('/', checkJwt, (req, res) => {
    const jwt = req.header('Authorization'); 
    const decodedJwt = jwtDecode(jwt);
    // Only support viewing of the animal as application/json
    const accepts = req.accepts(['application/json']);
    if (!accepts) {
        res.status(406).send({ 'Error': 'MIME Type not supported by endpoint' });
    }
    else {
        getAllShelters(req, decodedJwt['sub'])
        .then(shelters => {
            res.status(200).json(shelters);
        })
    }   
})

// GET a shelter based on the id (protected route)
sheltersRouter.get('/:shelter_id', checkJwt, (req, res) => {
    const jwt = req.header('Authorization'); 
    const decodedJwt = jwtDecode(jwt); 
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
        else if (shelter[0].user !== decodedJwt['sub']) {
            res.status(403).json({
                'Error': 'The JWT is valid but the shelter belongs to another user'
            })
        }
        else {
            const shelterToDisplay = formatShelters(shelter, req); 
            res.status(200).json(shelterToDisplay);
        }
    })
})

// PATCH - update any subset of properties of a shelter (protected route)
sheltersRouter.patch('/:shelter_id', checkJwt, function(req, res) {
    const jwt = req.header('Authorization'); 
    const decodedJwt = jwtDecode(jwt); 
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
        let newContact = req.body.contact; 
        let newWebsite = req.body.website;
        // Retrieve the shelter we want to edit
        getShelterById(req.params.shelter_id)
        .then(shelter => {
            if (shelter[0] === undefined || shelter[0] === null)
            {
                res.status(404).json({ 
                    'Error': 'No shelter with this shelter_id exists'
                }).end();
            }
            else if (shelter[0].user !== decodedJwt['sub'])
            {
                res.status(403).json({
                    'Error': 'The JWT is valid but the shelter belongs to another user'
                })
            }
            else {
                if (req.body.name === undefined || req.body.name === null)
                    newName = shelter[0].name;
                if (req.body.address === undefined || req.body.address === null)
                    newAddress = shelter[0].address;
                if (req.body.contact === undefined || req.body.contact === null)
                    newContact = shelter[0].contact;
                if (req.body.website === undefined || req.body.website === null)
                    newWebsite = shelter[0].phone_number;
                editShelter(req.params.shelter_id, newName, newAddress, newContact, newWebsite, shelter[0].animals, shelter[0].user)
                .then( key => {
                    // make sure the shelter name is already taken
                    if (key === null) {
                        res.status(403).json({
                            'Error': 'A shelter with that name already exists'
                        });
                    } 
                    else {
                        res.status(204).end();
                        // getShelterById(key.id)
                        // .then(shelter => {
                        //     const formattedShelter = formatShelters(shelter, req);
                        //     res.status(200).json(formattedShelter);
                        // })
                    }
                })
            }
        })
    }
})

// PUT - full update of all editable attributes of a shelter (aside from animals and user)
sheltersRouter.put('/:shelter_id', checkJwt, (req, res) => {
    const jwt = req.header('Authorization');
    const decodedJwt = jwtDecode(jwt);
    // retrieve the shelter to update
    getShelterById(req.params.shelter_id)
    .then(shelter => {
        if (shelter[0] === undefined || shelter[0] === null)
        {
            res.status(404).json({
                'Error': 'No shelter with this shelter_id exists'
            });
        }
        else if (shelter[0].user !== decodedJwt['sub']) {
            res.status(403).json({
                'Error': 'The JWT is valid but the shelter belongs to a different user'
            })
        }
        else {
            editShelter(req.params.shelter_id, req.body.name, req.body.address, req.body.contact, req.body.website, shelter[0].animals, shelter[0].user)
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
                        // const formattedShelter = formatShelters(shelter, req);
                        // res.status(200).json(formattedShelter);
                        res.status(204).end(); 
                    })
                }
            }) 
        }
    })
})

// PUT - associate an animal with the shelter (through shelters route)
sheltersRouter.put('/:shelter_id/animals/:animal_id', checkJwt, (req, res) => {
    const jwt = req.header('Authorization');
    const decodedJwt = jwtDecode(jwt);
    getShelterById(req.params.shelter_id)
    .then(shelter => {
        if (shelter[0] === undefined || shelter[0] === null)
        {
            res.status(404).json({
                'Error': "The specified shelter or animal doesn't exist."
            }); 
        }
        else if (shelter[0].user !== decodedJwt['sub']) {
            res.status(403).json({
                'Error': 'The JWT is valid but the shelter belongs to a different user'
            })
        }
        else {
            getAnimalById(req.params.animal_id)
            .then(animal => {
                if (animal[0] === undefined || animal[0] === null)
                {
                    res.status(404).json({
                        'Error': "The specified animal or shelter doesn't exist"
                    }); 
                }
                // if both shelter and animal are in db, check if the animal is already in another shelter
                else if (animal[0].location !== null) 
                {
                    res.status(403).json({
                        'Error': 'The animal is already in another shelter or has already been adopted'
                    }); 
                }
                else {
                    assignShelterToAnimal(shelter[0], animal[0], req).then(() => {
                        // getShelterById(req.params.shelter_id).then(entity => {
                        //     const formattedShelter = formatShelters(entity, req); 
                        //     res.status(200).json(formattedShelter);
                        // })
                        res.status(204).end();
                    })

                }
            })
        }
    })
})

// DELETE - Delete a shelter
sheltersRouter.delete('/:shelter_id', checkJwt, (req, res) => {
    const jwt = req.header('Authorization'); 
    const decodedJwt = jwtDecode(jwt);
    getShelterById(req.params.shelter_id)
    .then(shelter => {
        if (shelter[0] === undefined || shelter[0] === null)
        {
            res.status(404).json({
                'Error': 'No shelter with this shelter_id is found'
            }); 
        }
        else if (shelter[0].user !== decodedJwt['sub']) {
            res.status(403).json({
                'Error': 'The JWT is valid but the shelter belongs to a different user'
            })
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
        else {
            console.log(req.params.shelter_id);
            deleteShelter(req.params.shelter_id)
            .then(() => {
                res.status(204).end();
            })
        }
    })
})

// DELETE - Remove the animal from the shelter (wihtout deleting the entire shelter or animal entity) (protected route)
sheltersRouter.delete('/:shelter_id/animals/:animal_id', checkJwt, (req, res) => {
    const jwt = req.header('Authorization'); 
    const decodedJwt = jwtDecode(jwt);
    // make sure that the shelter exists
    getShelterById(req.params.shelter_id)
    .then(shelter => {
        if (shelter[0] === undefined || shelter[0] === null)
        {
            res.status(404).json({
                'Error': 'No shelter/animal with this shelter_id/animal_id exists'
            });
        }
        else if (shelter[0].user !== decodedJwt['sub']) {
            res.status(403).json({
                'Error': 'The JWT is valid but the shelter belongs to a different user'
            })
        }
        else {
            // make sure that the animal exists
            getAnimalById(req.params.animal_id)
            .then(animal => {
                if (animal[0] === undefined || animal[0] === null)
                {
                    res.status(404).json({
                        'Error': 'No shelter/animal with this shelter_id/animal_id exists'
                    })
                }
                // animal and shelter exists, now check to see if the animal is at this shelter
                else if (!checkIfAnimalInShelter(shelter[0].animals, req.params.animal_id))
                {
                    res.status(404).json({
                        'Error': 'No shelter with this shelter_id has the animal with this animal_id'
                    })
                } 
                else
                {
                    // if yes then proceed to removing the animal from the shelter
                    removeAnimalFromShelter(req.params.shelter_id, req.params.animal_id, shelter[0].name, shelter[0].address, shelter[0].contact, shelter[0].website, shelter[0].animals, shelter[0].user)
                    .then(
                        removeLocationFromAnimal(req.params.animal_id, animal[0].name, animal[0].species, animal[0].breed, animal[0].age, animal[0].gender, animal[0].colors, animal[0].adoptable, animal[0].microchipped).then(
                            res.status(204).end()
                        )
                    )
                }
            })
        }
    })
})

// Forbidden paths
// PUT request on root shelters URL - not allowed since we cannot edit the entire list of shelters at once
sheltersRouter.put('/', (req, res) => {
    res.set('Accept', 'GET', 'POST');
    res.status(405).json({
        'Error': 'Only GET and POST methods allowed for this path'
    });
})

// DELETE request on root shelters URL - not allowed
sheltersRouter.delete('/', (req, res) => {
    res.set('Accept', 'GET', 'POST');
    res.status(405).json({
        'Error': 'Only GET and POST methods allowed for this path'
    });
})

sheltersRouter.use(checkJwt);

/* ------------- End Shelters Controller Functions ------------- */

module.exports = {
    sheltersRouter: sheltersRouter
}