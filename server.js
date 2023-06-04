const express = require('express');
const app = express();

const { Datastore } = require('@google-cloud/datastore');

const bodyParser = require('body-parser'); 
const request = require('request'); 

const datastore = new Datastore();

const { expressjwt: jwt } = require('express-jwt'); 
const jwksRsa = require('jwks-rsa'); 
const { default: jwtDecode } = require('jwt-decode');

const { auth, requiresAuth } = require('express-openid-connect');

const config = {
    authRequired: false,
    auth0Logout: true,
    // baseURL: 'https://project7-api-auth.wm.r.appspot.com',
    baseURL: 'http://localhost:8080',
    clientID: '3XETdOIVMtxWOjRSOOD5XsKnFEy3MhOO',
    issuerBaseURL: 'https://cs493-spring-2023.us.auth0.com',
    secret: '9tQjSxuT4_-rRCps-uZvUSlLsYONgYRWCVcvE6qYFqYceOzckAIKhrKq3qpVMQ7M'
};

app.use(auth(config)); 

app.get('/', (req, res) => {
    console.log(req.oidc.idToken); 
    const userJwt = jwtDecode(req.oidc.idToken); 
    const userName = decodedJwt['name']; 
})

let checkJwt = jwt({
    secret: jwksRsa.expressJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `https://${DOMAIN}/.well-known/jwks.json`
    }),

    // Validate the audience and the issuer
    issuer: `https://${DOMAIN}/`,
    algorithms: ['RS256']
})

const ANIMAL = "Animal";

const animalsRouter = express.Router();
const login = express.Router();
const sheltersRouter = express.Router();
const adoptersRouter = express.Router();
const usersRouter = express.Router(); 

const CLIENT_ID = '3XETdOIVMtxWOjRSOOD5XsKnFEy3MhOO';
const CLIENT_SECRET = '9tQjSxuT4_-rRCps-uZvUSlLsYONgYRWCVcvE6qYFqYceOzckAIKhrKq3qpVMQ7M';
const DOMAIN = 'cs493-spring-2023.us.auth0.com';

/* ------------- BEGIN MODEL FUNCTIONS ------------- */

/* ------------- Begin Animals Model Functions ------------- */
// Add an animal (POST) 

// Get all animals (GET)

// Get an animal based on ID (GET)

// Partial update of one or more of an animal's properties (PATCH)

// Full update of all of an animal's properties (PUT)

// Associate a shelter/adopter with an animal (PUT)

// Delete an animal (DELETE)

// Delete the shelter from the animal (DELETE)

/* ------------- End Animals Model Functions ------------- */

/* ------------- Begin Shelters Model Functions ------------- */
// Add a shelter (POST) 

// Get all shelters (GET)

// Get a shelter based on ID (GET)

// Partial update of one or more of a shelter's properties (PATCH)

// Full update of all of a shelter's properties (PUT)

// Add an animal to a shelter (PUT)

// Delete a shelter (DELETE)

// Delete the association between the shelter and the animal (DELETE)

/* ------------- End Shelters Model Functions ------------- */

/* ------------- Begin Adopters Model Functions ------------- */
// Add an adopter (POST) 

// Get all adopters (GET)

// Get an adopter based on ID (GET)

// Partial update of one or more of an adopter's properties (PATCH)

// Full update of all of an adopter's properties (PUT)

// Put an animal in the adopter's care (PUT)

// Delete an adopter (DELETE)

// Delete the association between the adopter and the animal (DELETE)

/* ------------- End Adopters Model Functions ------------- */ 

/* ------------- Begin Users Model Functions ------------- */
// User needs to get added to Datastore every time they generate a JWT
// Users need to have unique ID displayed
// Add a user to the datastore (POST)

// Get all users in the datastore (GET)
// Potentially: Display user's unique ID, their email, and the shelter ID associated with them

/* ------------- End Users Model Functions ------------- */

/* ------------- END MODEL FUNCTIONS ------------- */


/* ------------- BEGIN CONTROLLER FUNCTIONS ------------- */

/* ------------- Begin Animals Controller Functions ------------- */
// POST an animal

// GET all animals

// GET an animal based on the id

// PATCH - partial update of >=1 attributes of an animal

// PUT - full update of all attributes of an animal

// PUT - associate a shelter or adopter with the animal

// DELETE - Delete an animal

// DELETE - Delete the shelter from the animal

/* ------------- End Animals Controller Functions ------------- */

/* ------------- Begin Shelters Controller Functions ------------- */
// POST an shelter

// GET all shelters

// GET a shelter based on the id

// PATCH - partial update of >=1 attributes of a shelter

// PUT - full update of all attributes of a shelter

// PUT - associate an animal with the shelter

// DELETE - Delete a shelter

// DELETE - Remove the animal from the shelter

/* ------------- End Shelters Controller Functions ------------- */

/* ------------- Begin Adopters Controller Functions ------------- */
// POST an adopter

// GET all adopters

// GET an adopter based on the id

// PATCH - partial update of >=1 attributes of an adopter

// PUT - full update of all attributes of an adopter

// PUT - associate an animal with the adopter

// DELETE - Delete an adopter

// DELETE - Remove the animal from the adopter

/* ------------- End Adopters Controller Functions ------------- */

/* ------------- Begin Users Controller Functions ------------- */
// POST a user to the datastore

// GET all users

/* ------------- End Users Controller Functions ------------- */


