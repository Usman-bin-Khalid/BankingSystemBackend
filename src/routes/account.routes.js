const express = require('express');
const authMiddleware = require('../middleware/auth.middleware').authMiddleware;
const accountController = require('../controllers/account.controller');



const router = express.Router();

// Create Account API
router.post('/create', authMiddleware, accountController.createAccountController);


// Get All Accounts API Route
router.get('/get', authMiddleware, accountController.getUserAccountsController);


// Get Balance of Specific Account API
router.get('/balance/:accountId' , authMiddleware, accountController.getBalanceAccountController);

module.exports = router;