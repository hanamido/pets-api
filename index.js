const express = require('express');
const router = module.exports = express.Router(); 

router.use('/animals', require('./animals')); 
router.use('/shelters', require('./shelters')); 
router.use('/adopters', require('./adopters'));
router.use('/users', require('./users')); 