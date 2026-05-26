const express = require('express');
const authMiddleware = require('../middleware/auth.middleware').authMiddleware;
const accountController = require('../controllers/account.controller');



const router = express.Router();

// Create Account
router.post('/create', authMiddleware, accountController.createAccountController);

router.get('/get', authMiddleware, accountController.getUserAccountsController);

router.get('/balance/:accountId' , authMiddleware, accountController.getBalanceAccountController);

module.exports = router;