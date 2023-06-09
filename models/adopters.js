const { Datastore } = require('@google-cloud/datastore');
const datastore = new Datastore();
const { addSelfLink, fromDatastore, formatAnimals, formatShelters, formatUsers } = require('../formats');
const { checkIfAnimalWithAdopter } = require('./animals');

// Constants
const ANIMAL = "Animal";
const SHELTER = "Shelter";
const ADOPTER = "Adopter";
const USER = "User"; 

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

module.exports = {
    addAdopter: addAdopter,
    getAllAdopters: getAllAdopters,
    getAdopterById: getAdopterById,
    editAdopter: editAdopter,
    assignAnimalToAdopter: assignAnimalToAdopter,
    addAnimalToAdopter: addAnimalToAdopter, 
    deleteAdopter: deleteAdopter,
    removeAnimalFromAdopter: removeAnimalFromAdopter
}