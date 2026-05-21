const express = require('express');
const authMiddleware = require('../middleware/auth.middleware').authMiddleware;
const accountController = require('../controllers/account.controller');



const router = express.Router();

// Create Account
router.post('/create', authMiddleware.authMiddleware, accountController.createAccountController);

module.exports = router;