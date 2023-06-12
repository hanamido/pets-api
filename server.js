const express = require('express');
const app = express();
const dotenv = require('dotenv').config();

const { Datastore } = require('@google-cloud/datastore');

const bodyParser = require('body-parser'); 

const { expressjwt: jwt } = require('express-jwt'); 
const jwksRsa = require('jwks-rsa'); 
const { default: jwtDecode } = require('jwt-decode');

const { auth } = require('express-openid-connect');

const {
    addUser: addUser,
    getUserById: getUserById,
    getAllUsers: getAllUsers,
    checkIfUserInDatastore: checkIfUserInDatastore
} = require('./models/users');

const { formatUsers } = require('./formats');

const client_id = process.env.CLIENT_ID;
const client_secret = process.env.CLIENT_SECRET;
const domain = process.env.DOMAIN;

const config = {
    authRequired: false,
    auth0Logout: true,
    baseURL: 'https://pets-shelter-api.wm.r.appspot.com/',
    // baseURL: 'http://localhost:8080',
    clientID: client_id,
    issuerBaseURL: domain,
    secret: client_secret,
};

app.use(auth(config)); 

app.get('/', (req, res) => {
    if (req.oidc.isAuthenticated()) {
        const decodedJwt = jwtDecode(req.oidc.idToken); 
        const userEmail = decodedJwt['name'];
        console.log(userEmail);
        const userId = decodedJwt['sub'];
        console.log(userId); 
        // checks if the user is already in datastore
        // if so, do not add that user and just display their info and JWT
        checkIfUserInDatastore(userId).then(data => {
            console.log(data);
            if (data !== null) {
                const returnEntity = formatUsers(data, req); 
                res.send({ user_info: returnEntity, jwt: req.oidc.idToken });
            }
            else {
                addUser(userId, userEmail).then(user => {
                    getUserById(user.id).then(entity => {
                        console.log(entity[0]);
                        const returnEntity = formatUsers(entity, req)
                        res.send({user_info: returnEntity, jwt: req.oidc.idToken});
                    })
                })
            }
        }); 
    }
    else {
        res.send("Please go to /login to log in first.");
    }
})

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

// app.use(checkJwt = jwt({
//     secret: jwksRsa.expressJwtSecret({
//         cache: true,
//         rateLimit: true,
//         jwksRequestsPerMinute: 5,
//         jwksUri: `${domain}/.well-known/jwks.json`
//     }),

//     // Validate the audience and the issuer
//     issuer: `${domain}/`,
//     algorithms: ['RS256']
// }))

const ANIMAL = "Animal";
const SHELTER = "Shelter";
const ADOPTER = "Adopter";
const USER = "User"; 

const { animalsRouter } = require('./controllers/animals.controllers');
const { sheltersRouter } = require('./controllers/shelters.controllers');
const { adoptersRouter } = require('./controllers/adopters.controllers'); 
const { usersRouter } = require('./controllers/users.controllers'); 

const login = express.Router();
const router = express.Router();

app.use(bodyParser.json());

app.enable('trust proxy'); 

app.use('/animals', animalsRouter);
app.use('/shelters', sheltersRouter);
app.use('/adopters', adoptersRouter);
app.use('/users', usersRouter); 
// app.use('/login', login);
app.use('/', router);

app.use(checkJwt);

app.use(function(err, req, res, next) {
    if (err.name === 'UnauthorizedError') {
        res.status(401).send({ 'Error': "Missing or Invalid JWT" }); 
    } else {
        next();
    }
})

// Listen to the App-Engine specific port, or 8080 otherwise
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}...`);
})