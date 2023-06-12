const { Datastore } = require('@google-cloud/datastore');
const datastore = new Datastore();
const { addSelfLink, fromDatastore, formatAnimals, formatShelters, formatUsers } = require('../formats');
const { checkIfAnimalInShelter } = require('./animals');
const { addShelterToUser } = require('./users');

// Constants
const SHELTER = "Shelter";

/* ------------- Begin Shelters Model Functions ------------- */
// Add a shelter (POST) 
async function addShelter(req, user)
{
    const shelterKey = datastore.key(SHELTER); 
    // check if the shelter name is already in the datastore
    const query = datastore.createQuery(SHELTER).filter('name', '=', req.body.name);
    const [shelters] = await datastore.runQuery(query); 
    // return null (indicate to not add the shelter) if the shelter name already exists
    if (shelters.length > 0) {
        return null;
    }
    let website = req.body.website; 
    if (req.body.website === undefined || req.body.website === null) 
        website = null;
    const newShelter = {
        "name": req.body.name,
        "address": req.body.address,
        "contact": req.body.contact,
        "website": website,
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
async function getAllShelters(req, user)
{
    // Limit to 5 results per page
    var query = datastore.createQuery(SHELTER).filter('user', '=', user).limit(5);
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
        results.shelters = formatShelters(shelters, req);
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
async function editShelter(shelterId, shelterName, shelterAddress, shelterContact, shelterWebsite, shelterAnimals, shelterUser)
{
    const shelterKey = datastore.key([
        SHELTER,
        parseInt(shelterId, 10)
    ]); 
    // check if the shelter name is already in the datastore
    const query = datastore.createQuery(SHELTER).filter('name', '=', shelterName);
    const [shelters] = await datastore.runQuery(query);
    // return null if the shelter name already exists and it is not the one we are trying to edit
    if (shelters.length > 0 && shelters[0] !== undefined)
    {
        let shelterWithId = fromDatastore(shelters[0]);
        if (shelterWithId.id !== shelterId) {
            return null;
        }
    }
    const newShelter = {
        "name": shelterName,
        "address": shelterAddress,
        "contact": shelterContact, 
        "website": shelterWebsite,
        "animals": shelterAnimals,
        "user": shelterUser
    };
    return datastore.save({
        "key": shelterKey,
        "data": newShelter
    })
    .then( () => {
        return shelterKey;
    });
}

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
        "contact": shelter.contact,
        "website": shelter.website,
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

// Remove the association between the shelter and the animal
// Used when an animal is deleted or the animal has been adopted
async function removeAnimalFromShelter(shelterId, animalId, shelterName, shelterAddress, shelterContact, shelterWebsite, shelterAnimals, shelterUser)
{
    const shelterKey = datastore.key([
        SHELTER,
        parseInt(shelterId, 10)
    ]); 
    let unloadedArray = [];
    const shelterAnimalsLen = shelterAnimals.length; 
    console.log(shelterAnimals);
    // Add all animals that are not the specified animalId to the new unloadedArray
    for (let i = 0; i < shelterAnimalsLen; i++)
    {
        if (shelterAnimals[i].id !== animalId) {
            unloadedArray.push(shelterAnimals[i]);
        }
    }; 
    // If there is only that animal in the shelter, then clear that array
    if (unloadedArray.length === 0) {
        unloadedArray = [];
    }; 
    const newShelter = {
        "name": shelterName,
        "address": shelterAddress,
        "contact": shelterContact,
        "website": shelterWebsite,
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

module.exports = {
    addShelter: addShelter,
    getAllShelters: getAllShelters,
    getShelterById: getShelterById,
    editShelter: editShelter,
    addAnimalToShelter: addAnimalToShelter,
    deleteShelter: deleteShelter,
    removeAnimalFromShelter: removeAnimalFromShelter
}