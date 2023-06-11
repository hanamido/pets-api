const { Datastore } = require('@google-cloud/datastore');
const datastore = new Datastore();
const { fromDatastore, formatAdopters } = require('../formats');
const { checkIfAnimalWithAdopter } = require('./animals');

// Constants
const ADOPTER = "Adopter";

/* ------------- Begin Adopters Model Functions ------------- */
// Add an adopter (POST) 
async function addAdopter(req, user)
{
    const adopterKey = datastore.key(ADOPTER); 
    const newAdopter = {
        "name": req.body.name,
        "address": req.body.address,
        "email": req.body.email,
        "phone_number": req.body.phone_number,
        "pets": [],
        "user": user
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
        results.adopters = formatAdopters(adopters, req);
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
async function editAdopter(adopterId, adopterName, adopterEmail, adopterPhoneNumber, adopterPets, adopterUser)
{
    // Generates a key complete with id
    const adopterKey = datastore.key([
        ADOPTER,
        parseInt(adopterId, 10)
    ]); 
    const newAdopter = {
        "name": adopterName,
        "email": adopterEmail,
        "phone_number": adopterPhoneNumber,
        "pets": adopterPets,
        "user": adopterUser
    };
    return datastore.save({
        "key": adopterKey,
        "data": newAdopter
    })
    .then(() => {
        return adopterKey;
    });
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
        email: adopter.email,
        phone_number: adopter.phone_number,
        pets: adopter.pets,
        user: adopter.user
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
async function removeAnimalFromAdopter(adopterId, animalId, adopterName, adopterEmail, adopterPhoneNumber, adopterPets, adopterUser)
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
        email: adopterEmail,
        phone_number: adopterPhoneNumber,
        pets: unloadedPets,
        user: adopterUser
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

/* ------------- End Adopters Model Functions ------------- */ 

module.exports = {
    addAdopter: addAdopter,
    getAllAdopters: getAllAdopters,
    getAdopterById: getAdopterById,
    editAdopter: editAdopter,
    addAnimalToAdopter: addAnimalToAdopter, 
    deleteAdopter: deleteAdopter,
    removeAnimalFromAdopter: removeAnimalFromAdopter
}