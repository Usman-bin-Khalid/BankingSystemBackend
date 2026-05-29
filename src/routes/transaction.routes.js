const { Router } = require('express');
const authMiddleware = require('../middleware/auth.middleware');
const transactionController = require('../controllers/transaction.controller');

const transactionRoutes = Router();

/**
 * @openapi
 * /api/transactions:
 *   post:
 *     tags: [Transactions]
 *     summary: Transfer funds between two accounts
 *     description: |
 *       Atomically transfers `amount` from `fromAccount` to `toAccount` using
 *       double-entry bookkeeping inside a MongoDB ACID transaction.
 *
 *       ### Guarantees
 *       -  **Atomic** — either both ledger entries (DEBIT + CREDIT) commit, or neither does.
 *       -  **Idempotent** — repeat the same `idemPotencyKey` and the transfer will NOT run twice.
 *       -  **Balance check** — derived from the ledger; rejects if sender has insufficient funds.
 *       -  **Status validation** — both accounts must be `ACTIVE`.
 *
 *       ### Flow
 *       1. Validate request body
 *       2. Validate idempotency key (return existing result if seen before)
 *       3. Check both accounts are ACTIVE
 *       4. Derive sender balance from ledger
 *       5. Create PENDING transaction
 *       6. Create DEBIT ledger entry on sender
 *       7. Create CREDIT ledger entry on receiver
 *       8. Mark transaction COMPLETED
 *       9. Commit MongoDB session
 *       10. Send email notification (best-effort, won't fail the transfer)
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TransferRequest'
 *     responses:
 *       201:
 *         description: Transaction completed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TransactionResponse'
 *       200:
 *         description: Idempotent replay — this idemPotencyKey was already completed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TransactionResponse'
 *       400:
 *         description: Validation error (missing fields, bad amount, inactive account, insufficient balance)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       409:
 *         description: Conflict — duplicate idemPotencyKey on a PENDING / FAILED / REVERSED transaction
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         $ref: '#/components/responses/ServerError'
 */
transactionRoutes.post('/', authMiddleware.authMiddleware, transactionController.createTransaction);

/**
 * @openapi
 * /api/transactions/system/initial-funds:
 *   post:
 *     tags: [Transactions]
 *     summary: Seed initial funds (system user only)
 *     description: |
 *       Special endpoint that lets a **system user** seed money into a regular
 *       user's account. The sender is automatically resolved as the system user's
 *       own account.
 *
 *       Only a user whose `systemUser` flag is `true` can call this endpoint;
 *       everyone else gets a 403.
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/InitialFundsRequest'
 *     responses:
 *       201:
 *         description: Initial funds transaction completed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TransactionResponse'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         description: Forbidden — caller is not a system user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *             example:
 *               message: Forbidden, user is not a system user
 */
transactionRoutes.post('/system/initial-funds', authMiddleware.authSystemUserMiddleware, transactionController.createInitialFundsTransaction);

module.exports = transactionRoutes;
