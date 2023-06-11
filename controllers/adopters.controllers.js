const express = require('express'); 
const dotenv = require('dotenv').config();

const adoptersRouter = express.Router();

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
    addAdopter: addAdopter,
    getAllAdopters: getAllAdopters,
    getAdopterById: getAdopterById,
    editAdopter: editAdopter,
    assignAnimalToAdopter: assignAnimalToAdopter,
    addAnimalToAdopter: addAnimalToAdopter, 
    deleteAdopter: deleteAdopter,
    removeAnimalFromAdopter: removeAnimalFromAdopter
} = require('../models/adopters');

const { formatAdopters } = require('../formats');

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

/* ------------- Begin Adopters Controller Functions ------------- */
// POST an adopter (protected)
adoptersRouter.post('/', checkJwt, (req, res) => {
    const jwt = req.header('Authorization');
    const decodedJwt = jwtDecode(jwt);
    if (req.get('content-type') !== 'application/json') {
        res.status(415).send({
            'Error': 'The server only accepts application/json data.'
        });
    }
    // if the request is missing any required parameters, the shelter is not created and status is 400
    if (req.body.name === undefined || req.body.email === undefined || req.body.phone_number === undefined)
    {
        res.status(400).json({
            'Error': 'The request object is missing at least one required attribute.'
        }); 
    }
    else {
        addAdopter(req, decodedJwt['sub'])
        .then(entity => {
            getAdopterById(entity.id)
            .then(adopter => {
                const newAdopter = formatAdopters(adopter, req);
                res.status(201).send(newAdopter);
            });
        });
    }
}) 

// GET all adopters (protected)
adoptersRouter.get('/', checkJwt, (req, res) => {
    getAllAdopters(req)
    .then(adopters => {
        res.status(200).json(adopters);
    })
})

// GET an adopter based on the id (protected)
adoptersRouter.get('/:adopter_id', checkJwt, (req, res) => {
    const jwt = req.header('Authorization');
    const decodedJwt = jwtDecode(jwt);
    getAdopterById(req.params.adopter_id)
    .then(adopter => {
        const accepts = req.accepts(['application/json']);
        if (!accepts) {
            res.status(406).send({ 'Error': 'MIME Type not supported by endpoint' });
        }
        // unless adopter_id doesn't exist
        else if (adopter[0] === undefined || adopter[0] === null) {
            res.status(404).json({ 'Error': 'No adopter with this adopter_id exists' }); 
        }
        else if (adopter[0].user !== decodedJwt['sub']) {
            res.status(403).json({
                'Error': 'The JWT is valid but the adopter_id belongs to a different user'
            })
        }
        else {
            const adopterToDisplay = formatAdopters(adopter, req);
            res.status(200).json(adopterToDisplay);
        }
    })
})

// PATCH - update of a subset of attributes of an adopter
adoptersRouter.patch('/:adopter_id', checkJwt, (req, res) => {
    const jwt = req.header('Authorization');
    const decodedJwt = jwtDecode(jwt);
    // request must be JSON
    if (req.get('content-type' !== 'application/json')) {
        res.status(415).json({
            'Error': 'The server only accepts application/json data.'
        })
    }
    else {
        // Set the properties
        let newName = req.body.name;
        let newEmail = req.body.email;
        let newPhoneNubmer = req.body.phone_number;
        // Retrieve the adopter we want to edit
        getAdopterById(req.params.adopter_id)
        .then(adopter => {
            if (adopter[0] === undefined || adopter[0] === null) {
                res.status(404).json({
                    'Error': 'No adopter with this adopter_id exists'
                }).end();
            }
            else if (adopter[0].user !== decodedJwt['sub']) {
                res.status(403).json({
                    'Error': 'The JWT is valid but the adopter_id belongs to a different user'
                })
            }
            else {
                if (req.body.name === undefined || req.body.name === null) 
                    newName = adopter[0].name; 
                if (req.body.email === undefined || req.body.email === null) 
                    newEmail = adopter[0].email; 
                if (req.body.phone_number === undefined || req.body.phone_number === null)
                    newPhoneNubmer = adopter[0].phone_number;
                editAdopter(req.params.adopter_id, newName, newEmail, newPhoneNumber, adopter[0].pets, adopter[0].user)
                .then(entity => {
                    getAdopterById(entity.id) 
                    .then(returnedAdopter => {
                        const formattedAdopter = formatAdopters(returnedAdopter, req);
                        res.status(200).json(formattedAdopter);
                    })
                })
            }
        })
    }
})

// PUT - full update of all editable attributes of an adopter (except for pets and user) (protected)
adoptersRouter.put('/:adopter_id', checkJwt, (req, res) => {
    const jwt = req.header('Authorization');
    const decodedJwt = jwtDecode(jwt);
    // retrieve the adopter to update
    getAdopterById(req.params.adopter_id)
    .then(adopter => {
        if (adopter[0] === undefined || adopter[0] === null)
        {
            res.status(404).json({
                'Error': 'No adopter with this adopter_id exists'
            });
        }
        else if (adopter[0].user !== decodedJwt['sub']) {
            res.status(403).json({
                'Error': 'The JWT is valid but the adopter_id belongs to a different user'
            })
        }
        else {
            editAdopter(req.params.adopter_id, req.body.name, req.body.email, req.body.phone_number, adopter[0].pets, adopter[0].user)
            .then(entity => {
                getAdopterById(entity.id)
                .then(returnedAdopter => {
                    const formattedAdopter = formatAdopters(returnedAdopter, req); 
                    res.status(200).json(formattedAdopter);
                })
            })
        }
    })
})

// PUT - associate an animal with the adopter (protected)
adoptersRouter.put('/:adopter_id/animals/:animal_id', checkJwt, (req, res) => {
    const jwtToken = req.header('authorization'); 
    const decodedJwt = jwtDecode(jwtToken); 
    getAdopterById(req.params.adopter_id)
    .then(adopter => {
        if (adopter[0] === undefined || adopter[0] === null)
        {
            res.status(404).json({
                'Error': 'No adopter with this adopter_id exists'
            }); 
        }
        // if JWT is valid but the adopter is listed by another user
        else if (adopter[0].user !== decodedJwt['sub']) {
            res.status(403).json({
                'Error': 'JWT is valid but adopter_id is owned by a different user'
            });
        }
        else {
            getAnimalById(req.params.animal_id)
            .then(animal => {
                if (animal[0] === undefined || animal[0] === null) {
                    res.status(404).json({
                        'Error': 'No animal with this animal_id exists'
                    });
                }
                // if both adopter and animal exist, check if the animal is with another adopter
                else if (animal[0].location !== null) {
                    if (animal[0].location.type !== "shelter") {
                        res.status(403).json({
                            'Error': "The animal is already in another adopter's care"
                        })
                    }   
                }
                else (
                    assignAdopterToAnimal(adopter[0], animal[0]).then(() => {
                        getAdopterById(req.params.adopter_id).then(entity => {
                            const formattedAdopter = formatAdopters(entity, req);
                            res.status(200).json(formattedAdopter);
                        });
                    })
                )
            })
        }
    })
})

// DELETE - Delete an adopter (protected)
adoptersRouter.delete('/:adopter_id', checkJwt, (req, res) => {
    const jwt = req.header('Authorization');
    const decodedJwt = jwtDecode(jwt);
    getAdopterById(req.params.adopter_id)
    .then(adopter => {
        if (adopter[0] === undefined || adopter[0] === null)
        {
            res.status(404).json({ 'Error': 'No adopter with this adopter_id is found' });
        }
        // if JWT is valid but the adopter is listed by another user
        else if (adopter[0].user !== decodedJwt['sub']) {
            res.status(403).json({
                'Error': 'JWT is valid but adopter_id is owned by a different user'
            })
        }
        // if there are pets associated with this shelter, remove the shelter from the pets
        else if (adopter[0].pets.length > 0) {
            const adopterPetsLen = adopter[0].pets.length;
            const pets = adopter[0].pets; 
            for (let i = 0; i < adopterPetsLen; i++)
            {
                const animal = pets[i];
                const animalId = animal.id;
                getAnimalById(animalId).then(animal => {
                    deleteAdopter(req.params.adopter_id)
                    .then(() => {
                        removeLocationFromAnimal(animalId, animal[0].name, animal[0].species, animal[0].breed, animal[0].age, animal[0].gender, animal[0].colors, animal[0].adoptable, animal[0].microchipped)
                        .then(res.status(204).end());
                    })
                })
            }
        }
        else {
            // else just delete the adopter like normal
            deleteAdopter(req.params.adopter_id)
            .then( () => {
                res.status(204).end();
            })
        }
    })
})

// DELETE - Remove the animal from the adopter (without deleting the entire adopter or animal) (protected route)
adoptersRouter.delete('/:adopter_id/animals/:animal_id', checkJwt, (req, res) => {
    // get and decode the jwt
    const jwToken = req.header('Authorization');
    const decodedJwt = jwtDecode(jwToken);
    // make sure the adopter exists
    getAdopterById(req.params.adopter_id)
    .then(adopter => {
        if (adopter[0] === undefined || adopter[0] === null)
        {
            res.status(404).json({
                'Error': 'No adopter with this adopter_id exists'
            })
        }
        // if JWT is valid but the adopter is listed by another user
        else if (adopter[0].user !== decodedJwt['sub']) {
            res.status(403).json({
                'Error': 'JWT is valid but adopter_id is owned by a different user'
            })
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
                // adopter and animal exists, now check to see if the animal is with this adopter
                else if (!checkIfAnimalWithAdopter(adopter[0].pets, req.params.adopter_id))
                {
                    res.status(404).json({
                        'Error': 'No adopter with this adopter_id has the animal with this animal_id'
                    });
                }
                else {
                    // if yes then proceed with removing the animal from the adopter
                    removeAnimalFromAdopter(req.params.adopter_id, req.params.animal_id, adopter[0].name, adopter[0].email, adopter[0].phone_number, adopter[0].pets, adopter[0].user)
                    .then(
                        removeLocationFromAnimal(animal[0].id, animal[0].name, animal[0].species, animal[0].breed, animal[0].age, animal[0].gender, animal[0].colors, animal[0].adoptable, animal[0].microchipped)
                        .then(
                            res.status(204).end()
                        )
                    )
                }
            })
        }
    })
})

// Forbidden paths
// PUT request on root adopters URL - not allowed since we cannot edit the entire list of adopters at once
adoptersRouter.put('/', (req, res) => {
    res.set('Accept', 'GET', 'POST');
    res.status(405).json({
        'Error': 'Only GET and POST methods allowed for this path'
    });
})

// DELETE request on root adopters URL - not allowed
adoptersRouter.delete('/', (req, res) => {
    res.set('Accept', 'GET', 'POST');
    res.status(405).json({
        'Error': 'Only GET and POST methods allowed for this path'
    });
})

/* ------------- End Adopters Controller Functions ------------- */

module.exports = {
    adoptersRouter: adoptersRouter
}