const { Datastore } = require('@google-cloud/datastore');
const datastore = new Datastore();
const { addSelfLink, fromDatastore, formatAnimals, formatShelters, formatUsers } = require('../formats');
const { addAnimalToShelter } = require('./shelters');

// Constants
const ANIMAL = "Animal";
const SHELTER = "Shelter";
const ADOPTER = "Adopter";
const USER = "User"; 

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
        "adoptable": req.body.adoptable,
        "microchipped": req.body.microchipped,
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
async function editAnimal(id, name, species, breed, age, gender, colors, adoptable, microchipped, location)
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
        adoptable: adoptable,
        microchipped: microchipped,
        location: location
    };
    return datastore.save({
        "key": animalKey,
        "data": updatedAnimal
    })
    .then(() => {
        return animalKey;
    });
}

// Associate a shelter with an animal (PUT)
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
        "type": "shelter"  // property to determine where the animal is located
    };
    // animal to be added to the shelter entity
    let animalToAdd = {
        "id": animal.id,
        "name": animal.name,
        "species": animal.species,
        "adoptable": animal.adoptable
    }
    // updated animal with the shelter added
    const updatedAnimal = {
        "name": animal.name,
        "species": animal.species,
        "breed": animal.breed,
        "age": animal.age,
        "gender": animal.gender,
        "colors": animal.colors,
        "adoptable": animal.adoptable,
        "microchipped": animal.microchipped,
        "location": shelterToAdd,  // contains id and name of the shelter
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

// Associate an adopter with an animal (PUT)
async function assignAdopterToAnimal(adopter, animal)
{
    // get the animal key from the datastore
    const animalKey = datastore.key([
        ANIMAL,
        parseInt(animal.id, 10)
    ]); 
    // adopter to be added to the animal entity
    let adopterToAdd = {
        "id": adopter.id,
        "name": adopter.name,
        "type": "adopter"
    };
    // animal to be added to the shelter entity
    let animalToAdd = {
        "id": animal.id,
        "name": animal.name,
        "species": animal.species,
        "adoptable": animal.adopt_status
    }
    // updated animal with the shelter added
    const updatedAnimal = {
        "name": animal.name,
        "species": animal.species,
        "breed": animal.breed,
        "age": animal.age,
        "gender": animal.gender,
        "colors": animal.colors,
        "adoptable": animal.adoptable,
        "microchipped": animal.microchipped,
        "location": adopterToAdd,  // contains id, name, address, and contact of the shelter
    };
    // add the updated animal (with the specified shelter) to datastore
    return datastore.save({
        "key": animalKey,
        "data": updatedAnimal
    })
    // Add the animal to the shelter entity
    .then(() => {  
        addAnimalToAdopter(animalToAdd, adopter);
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

// Completely remove the location from the animal (shelter or adopter)
// Used when we need to remove the animal from the shelter and/or from the adopter's care
async function removeLocationFromAnimal(animalId, animalName, animalSpecies, animalBreed, animalAge, animalGender, animalColors, animalAdoptable, animalMicrochipped)
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
        "adoptable": animalAdoptable,
        "microchipped": animalMicrochipped,
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

// Function to check if the animal is in a shelter's array of animals
function checkIfAnimalInShelter(shelterAnimalsArray, animalId)
{
    const shelterAnimalsLen = shelterAnimalsArray.length;
    // returns an array of the element with the animal_id, if it is there
    const result = shelterAnimalsArray.filter(element => element.id === animalId);
    // if the animal is found
    if (result.length === 1) {
        return true;
    }
    // for (let i = 0; i < shelterAnimalsLen; i++)
    // {
    //     if (shelterAnimalsArray[i].id === animalId)
    //     {
    //         return true;
    //     }
    // }
    return false;
}

// Function to check if an animal is in an adopter's care
function checkIfAnimalWithAdopter(adoptersAnimalsArray, animalId)
{
    const result = adoptersAnimalsArray.filter(element => element.id === animalId);
    if (result.length === 1) {
        return true;
    }
    return false;
}

/* ------------- End Animals Model Functions ------------- */

module.exports = {
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
}