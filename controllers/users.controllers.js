const express = require('express'); 
const dotenv = require('dotenv').config();

const usersRouter = express.Router();

const {
    addUser: addUser,
    getUserById: getUserById,
    getAllUsers: getAllUsers,
    checkIfUserInDatastore: checkIfUserInDatastore
} = require('../models/users');

const { formatUsers: formatUsers } = require('../formats'); 

/* ------------- Begin Users Controller Functions ------------- */

// GET all users
usersRouter.get('/', function(req, res) {
    const allUsers = getAllUsers(req)
    .then(users => {
        const formattedUsers = formatUsers(users, req);
        res.status(200).json(formattedUsers);
    })
})

// GET a specified user based on the given id
usersRouter.get('/:user_id', function(req, res) {
    getUserById(req.params.user_id)
    .then(user => {
        const formattedUser = formatUsers(user, req);
        res.status(200).json(formattedUser);
    })
})

/* ------------- End Users Controller Functions ------------- */

module.exports = {
    usersRouter: usersRouter
}