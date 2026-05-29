const express = require('express');
const authController = require('../controllers/auth.controller');

const router = express.Router();

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 *     description: |
 *       Creates a new user account, issues a JWT token, sets it as a `token` cookie,
 *       and sends a welcome email asynchronously.
 *
 *       **Note:** The email is sent via Gmail OAuth2 — if the receiver address is not
 *       on the configured testers list, the email step will fail silently in the
 *       background (the user is still registered successfully).
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       422:
 *         description: User already exists with this email
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               message: User already exists with this email
 *               status: fail
 */
router.post('/register', authController.userRegisterController);

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login an existing user
 *     description: |
 *       Validates the user's credentials. On success, issues a JWT token and sets
 *       it as a `token` cookie. Copy the returned `token` and click **Authorize**
 *       at the top of this page to test protected endpoints.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Invalid email or password
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/login', authController.userLoginController);

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout the current user
 *     description: |
 *       Blacklists the current JWT token (auto-expires after 3 days via MongoDB TTL
 *       index) and clears the `token` cookie. Once blacklisted, the token can no
 *       longer be used to access protected endpoints.
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *             example:
 *               message: User Logged Out Successfully
 */
router.post('/logout', authController.userLogoutController);

module.exports = router;
