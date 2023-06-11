const { Datastore } = require('@google-cloud/datastore');
const datastore = new Datastore();
const { addSelfLink, fromDatastore, formatAnimals, formatShelters, formatUsers } = require('../formats');

// Constants
const USER = "User"; 

/* ------------- Begin Users Model Functions ------------- */
// User needs to get added to Datastore every time they generate a JWT
// Users need to have unique ID displayed

// Add a user to the datastore (POST)
async function addUser(user_id, email)
{
    const userKey = datastore.key(USER); 
    const newUser = {
        "user_id": user_id,
        "email": email
    };
    return datastore.save({
        "key": userKey,
        "data": newUser 
    })
    .then(() => {
        return userKey;
    })
}

// Get a specific user in the datastore (GET)
async function getUserById(userId)
{
    const userKey = datastore.key([
        USER,
        parseInt(userId, 10)
    ]);
    return datastore.get(userKey).then( (entity) => {
        if (entity[0] === undefined || entity[0] === null) {
            // No entity was found, so don't try to add id attribute
            return entity; 
        } else {
            return entity.map(fromDatastore); 
        }
    })
}

// Get all users in the datastore (GET)
// Potentially: Display user's unique ID, their email, and the shelter ID and name associated with them
async function getAllUsers(req)
{
    const query = datastore.createQuery(USER);
    return datastore.runQuery(query)
    .then( (entities) => {
        return entities[0].map(fromDatastore);
    });
}

// Function to check if user is already in the datastore
async function checkIfUserInDatastore(user_id)
{
    const query = datastore.createQuery(USER).filter('user_id', '=', user_id);
    return datastore.runQuery(query).then( data => {
        // if the user is found, then return that user's data
        if (data[0].length !== 0) {
            return data[0].map(fromDatastore);
        }
        return null;
    })
}

// Function to add an adopter to the user

/* ------------- End Users Model Functions ------------- */

module.exports = {
    addUser: addUser,
    getUserById: getUserById,
    getAllUsers: getAllUsers,
    checkIfUserInDatastore: checkIfUserInDatastore
}