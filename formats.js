// Adding the self link to the response
function addSelfLink(id, item, req, baseType) {
    const selfLink = req.protocol + "://" + req.get("host") + "/" + baseType;
    const self = selfLink.concat(`/${id}`); 
    item.self = self;
    item = {"id": id, ...item, "self": self};
    return item; 
}

function formatAnimals(animals, req) {
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
        const animalWithId = addSelfLink(currAnimal.id, currAnimal, req, "animals"); 
        const newAnimal = {
            id: animalWithId.id,
            name: animalWithId.name,
            species: animalWithId.species,
            breed: animalWithId.breed,
            age: animalWithId.age,
            gender: animalWithId.gender,
            colors: animalWithId.colors,
            attributes: animalWithId.attributes,
            adopt_status: animalWithId.adopt_status,
            location: animalWithId.location
        }
        animals[i] = newAnimal;
    }
    return animals;
}

function formatShelters() {

}

function formatUsers() {

}

function formatAdopters() {

}

module.exports = {formatAnimals, formatShelters};