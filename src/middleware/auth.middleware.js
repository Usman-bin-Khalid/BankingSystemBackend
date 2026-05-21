const userModel = require('../models/user.model');
const jwt = require('jsonwebtoken');


async function authMiddleware(req, res, next) {
     const token = req.cookie.token || req.headers.authorization?.split(' ')[1];
     if (!token) {
        return res.status(401).json({message : 'Unauthorized, token is missing'});
     }
     try {

     } catch (error) {
        return res.status(401).json({message : 'Unauthorized, token is invalid'});
     }

}