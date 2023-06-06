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
        const animal = addSelfLink(animals[0].id, animals[0], req, "animals");
        const newAnimal = {
            id: animal.id,
            name: animal.name,
            species: animal.species,
            breed: animal.breed,
            age: animal.age,
            gender: animal.gender,
            colors: animal.colors,
            attributes: animal.attributes,
            adopt_status: animal.adopt_status,
            location: animal.location
        }
        return newAnimal;
    }
    const animalsLen = Object.keys(animals).length; 
    for (let i = 0; i < animalsLen; i++) {
        const currAnimal = animals[i];
        const animal = addSelfLink(currAnimal.id, currAnimal, req, "animals"); 
        const newAnimal = {
            id: animal.id,
            name: animal.name,
            species: animal.species,
            breed: animal.breed,
            age: animal.age,
            gender: animal.gender,
            colors: animal.colors,
            attributes: animal.attributes,
            adopt_status: animal.adopt_status,
            location: animal.location
        }
        animals[i] = newAnimal;
    }
    return animals;
}

function formatShelters(shelters, req) 
{
    // if there is only one shelter
    if (Object.keys(shelters).length === 1)
    {
        const shelter = addSelfLink(shelters[0].id, shelters[0], req, "shelters"); 
        const formattedShelter = {
            name: shelter.name,
            address: shelter.address, 
            contact: shelter.contact,
            animals: shelter.animals,
            user: shelter.user
        }
        return formattedShelter;
    }
    const sheltersLen = Object.keys(shelters).length;
    for (let i = 0; i < sheltersLen; i++)
    {
        const currShelter = shelters[i];
        const shelter = addSelfLink(currShelter.id, currShelter, req, "shelters");
        const formattedShelter = {
            name: shelter.name,
            address: shelter.address, 
            contact: shelter.contact,
            animals: shelter.animals,
            user: shelter.user
        };
        shelters[i] = formattedShelter;
    }
    return shelters;
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
            pet: adopter.pet
        }; 
        return formattedAdopter;
    }
    const adoptersLen = Object.keys(adopters).length;
    for (let i = 0; i < adoptersLen; i++)
    {
        const currAdopter = adopters[i];
        const adopter = addSelfLink(currAdopter.id, currAdopter, req, "adopters"); 
        const formattedAdopter = {
            name: adopter.name,
            contact: adopter.contact,
            pet: adopter.pet
        };
        adopters[i] = formattedAdopter;
    }
    return adopters; 
}

function formatUsers(users, req) {
    if (Object.keys(users).length === 1)
    {
        const currUser = users[0];
        const user = addSelfLink(currUser.unique_id, currUser, req, "users");
        const formattedUser = {
            unique_id: user.id,
            email: user.email,
            shelter: user.shelter
        }
        return formattedUser; 
    }
    const usersLen = Object.keys(users).length;
    for (let i = 0; i < usersLen; i++)
    {
        const currUser = users[i];
        const user = addSelfLink(currUser.unique_id, currUser, req, "users"); 
        const formattedUser = {
            unique_id: user.id,
            email: user.email
        }
        users[i] = formattedUser;
    }
    return users;
}

export default { fromDatastore, addSelfLink, formatAnimals, formatShelters, formatUsers };