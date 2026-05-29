const express = require('express');
const authMiddleware = require('../middleware/auth.middleware').authMiddleware;
const accountController = require('../controllers/account.controller');

const router = express.Router();

/**
 * @openapi
 * /api/accounts/create:
 *   post:
 *     tags: [Accounts]
 *     summary: Create a new account
 *     description: |
 *       Creates a new bank account for the authenticated user. A user can have
 *       multiple accounts. The account starts with status `ACTIVE` and the default
 *       currency is `PKR`.
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       201:
 *         description: Account created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Account created successfully
 *                 account:
 *                   $ref: '#/components/schemas/Account'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post('/create', authMiddleware, accountController.createAccountController);

/**
 * @openapi
 * /api/accounts/get:
 *   get:
 *     tags: [Accounts]
 *     summary: Get all accounts for the current user
 *     description: Returns a list of every account belonging to the authenticated user.
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of user accounts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accounts:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Account'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/get', authMiddleware, accountController.getUserAccountsController);

/**
 * @openapi
 * /api/accounts/balance/{accountId}:
 *   get:
 *     tags: [Accounts]
 *     summary: Get balance for a specific account
 *     description: |
 *       Returns the current balance of the specified account. The balance is
 *       **derived from the ledger** in real time (CREDIT sum − DEBIT sum), never
 *       stored on the account document — guaranteeing accuracy.
 *
 *       The caller must own the account.
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: accountId
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ObjectId of the account
 *         example: 66f0a1b2c3d4e5f6a7b8c9d1
 *     responses:
 *       200:
 *         description: Balance for the account
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BalanceResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         description: Account not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               message: Account Not Found
 */
router.get('/balance/:accountId', authMiddleware, accountController.getBalanceAccountController);

module.exports = router;
