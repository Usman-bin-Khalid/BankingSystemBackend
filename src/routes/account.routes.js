const express = require('express');
const authMiddleware = require('../middleware/auth.middleware').authMiddleware;



const router = express.Router();

// Create Account
router.post('/create', authMiddleware.authMiddleware);

module.exports = router;