const { Datastore } = require('@google-cloud/datastore');
const datastore = new Datastore();

// Add the ID to item from datastore
function fromDatastore(item) 
{
    item.id = item[Datastore.KEY].id;
    item = {id: item.id, ...item};
    return item; 
}

// Adding the self link to the response
function addSelfLink(id, item, req, baseType) 
{
    const selfLink = req.protocol + "://" + req.get("host") + "/" + baseType;
    const self = selfLink.concat(`/${id}`); 
    item.self = self;
    item = {"id": id, ...item, "self": self};
    return item; 
}

function formatAnimals(animals, req) 
{
    if (Object.keys(animals).length === 1) {
        let newLocation = null;
        if (animals[0].location !== null) {
            newLocation = formatLocationsInAnimals(animals[0], animals[0].location.type);
        }
        const animal = addSelfLink(animals[0].id, animals[0], req, "animals");
        const newAnimal = {
            id: animal.id,
            name: animal.name,
            species: animal.species,
            breed: animal.breed,
            age: animal.age,
            gender: animal.gender,
            colors: animal.colors,
            adoptable: animal.adoptable,
            microchipped: animal.microchipped,
            location: newLocation,
            self: animal.self
        }
        return newAnimal;
    }
    const animalsLen = Object.keys(animals).length; 
    for (let i = 0; i < animalsLen; i++) {
        const currAnimal = animals[i];
        let newLocation = null;
        if (currAnimal.location !== null)
        {
            newLocation = formatLocationsInAnimals(animals[i], animals[i].location.type);
        }
        const animal = addSelfLink(currAnimal.id, currAnimal, req, "animals"); 
        animals[i] = {
            id: animal.id,
            name: animal.name,
            species: animal.species,
            breed: animal.breed,
            age: animal.age,
            gender: animal.gender,
            colors: animal.colors,
            adoptable: animal.adoptable,
            microchipped: animal.microchipped,
            location: newLocation,
            self: animal.self
        }
    }
    return animals;
}

function formatLocationsInAnimals(animal, locationType)
{
    let newLocation = null;
    if (animal.location !== null && locationType === "shelter")
    {
        newLocation = {
            "id": animal.location.id,
            "name": animal.location.name,
            "type": locationType
        }
    }
    else if (animal.location !== null && locationType === 'adopter')
    {
        newLocation = {
            "id": animal.location.id,
            "name": animal.location.name,
            "type": locationType
        }
    }
    return newLocation;
}

function formatShelters(shelters, req) 
{
    // if there is only one shelter
    if (Object.keys(shelters).length === 1)
    {
        const animals = shelters[0].animals;
        const animalsLen = animals.length;
        const newAnimal = formatAnimalsInShelters(animals, animalsLen);
        // const animalsLen = animals.length; 
        // for (let i = 0; i < animalsLen; i++) {
        //     animals[i] = {
        //         id: animals[i].id,
        //         name: animals[i].name,
        //         species: animals[i].species,
        //         adoptable: animals[i].adoptable
        //     }
        // }
        const shelter = addSelfLink(shelters[0].id, shelters[0], req, "shelters"); 
        const formattedShelter = {
            id: shelter.id,
            name: shelter.name,
            address: shelter.address, 
            email: shelter.email,
            phone_number: shelter.phone_number,
            animals: newAnimal,
            user: shelter.user,
            self: shelter.self
        }
        return formattedShelter;
    }
    const sheltersLen = Object.keys(shelters).length;
    for (let i = 0; i < sheltersLen; i++)
    {
        const currShelter = shelters[i];
        const animals = currShelter.animals;
        const animalsLen = animals.length; 
        const newAnimals = formatAnimalsInShelters(animals, animalsLen);
        const shelter = addSelfLink(currShelter.id, currShelter, req, "shelters");
        shelters[i] = {
            id: shelter.id,
            name: shelter.name,
            address: shelter.address, 
            email: shelter.email,
            phone_number: shelter.phone_number,
            animals: newAnimals,
            user: shelter.user,
            self: shelter.self
        };
    }
    return shelters;
}

function formatAnimalsInShelters(animals, animalsArrLen)
{
    for (let i = 0; i < animalsArrLen; i++) {
        animals[i] = {
            id: animals[i].id,
            name: animals[i].name,
            species: animals[i].species,
            adoptable: animals[i].adoptable
        }
    }
    return animals;   
}

function formatAdopters(adopters, req) 
{
    if (Object.keys(adopters).length === 1)
    {
        const currAdopter = adopters[0];
        const adopter = addSelfLink(currAdopter.id, currAdopter, req, "adopters");
        const formattedAdopter = {
            name: adopter.name,
            contact: adopter.contact,
            pet: adopter.pet,
            self: adopter.self
        }; 
        return formattedAdopter;
    }
    const adoptersLen = Object.keys(adopters).length;
    for (let i = 0; i < adoptersLen; i++)
    {
        const currAdopter = adopters[i];
        const adopter = addSelfLink(currAdopter.id, currAdopter, req, "adopters"); 
        adopters[i] = {
            name: adopter.name,
            contact: adopter.contact,
            pet: adopter.pet,
            self: adopter.self
        };
    }
    return adopters; 
}

function formatUsers(users, req) {
    if (Object.keys(users).length === 1)
    {
        const currUser = users[0];
        const user = addSelfLink(currUser.id, currUser, req, "users");
        const formattedUser = {
            ds_id: user.id,
            user_id: user.user_id,
            email: user.email,
            shelter: user.shelter,
            self: user.self
        }
        return formattedUser; 
    }
    const usersLen = Object.keys(users).length;
    for (let i = 0; i < usersLen; i++)
    {
        const currUser = users[i];
        const user = addSelfLink(currUser.id, currUser, req, "users"); 
        users[i] = {
            ds_id: user.id,
            user_id: user.user_id,
            email: user.email,
            shelter: user.shelter,
            self: user.self
        }
    }
    return users;
}

// export default { fromDatastore, addSelfLink, formatAnimals, formatShelters, formatUsers };
exports.fromDatastore = fromDatastore;
exports.addSelfLink = addSelfLink;
exports.formatAnimals = formatAnimals;
exports.formatShelters = formatShelters;
exports.formatUsers = formatUsers;