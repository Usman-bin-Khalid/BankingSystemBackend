const swaggerJSDoc = require('swagger-jsdoc');
const path = require('path');

// Build the `servers` list dynamically so Swagger UI always targets the right host.
// On Render, RENDER_EXTERNAL_URL is auto-injected (e.g. https://bankingsystembackend-eq68.onrender.com).
// Locally, fall back to localhost so "Try it out" hits your dev server.
function buildServers() {
    const servers = [];
    const renderUrl = process.env.RENDER_EXTERNAL_URL;
    const publicUrl = process.env.PUBLIC_URL;
    if (renderUrl) {
        servers.push({ url: renderUrl, description: 'Live production server (Render)' });
    }
    if (publicUrl && publicUrl !== renderUrl) {
        servers.push({ url: publicUrl, description: 'Public server' });
    }
    servers.push({
        url: `http://localhost:${process.env.PORT || 5001}`,
        description: 'Local development server'
    });
    return servers;
}

const options = {
    definition: {
        openapi: '3.0.3',
        info: {
            title: 'Bank Ledger System API',
            version: '1.0.0',
            description: `
# Bank Ledger System Backend

A production-style **double-entry bookkeeping** banking backend.

## Features
-  **JWT Authentication** with cookie + bearer token support
-  **Token Blacklist** on logout (auto-expires after 3 days)
-  **Multi-account** support per user with currency
-  **Ledger-based balance** — balance is *derived* from DEBIT/CREDIT entries, never stored
-  **Idempotent transactions** using \`idemPotencyKey\` — safe to retry
-  **MongoDB ACID transactions** for atomic transfers (all-or-nothing)
-  **Email notifications** via Nodemailer (Gmail OAuth2)
-  **System user** flow for seeding initial funds

## How to authenticate in Swagger UI
1.  Call \`POST /api/auth/register\` or \`POST /api/auth/login\` and copy the \`token\` from the response.
2.  Click the green **Authorize** button at the top of this page.
3.  Paste the token in the \`bearerAuth\` field and click **Authorize**.
4.  All protected endpoints will now include your token automatically.

## Transfer Flow (10 steps)
\`\`\`
1. Validate Request          6. Create DEBIT ledger entry
2. Validate IdemPotency Key  7. Create CREDIT ledger entry
3. Check Account Status      8. Mark Transaction COMPLETED
4. Derive sender balance     9. Commit MongoDB session
5. Create Transaction        10. Send Email Notification
\`\`\`
            `,
            contact: {
                name: 'API Support',
                email: 'usmanbinkhalidpk@gmail.com'
            },
            license: {
                name: 'ISC',
            },
        },
        servers: buildServers(),
        tags: [
            { name: 'Auth', description: 'User registration, login and logout' },
            { name: 'Accounts', description: 'Create accounts and check balances' },
            { name: 'Transactions', description: 'Money transfers between accounts (idempotent + ACID)' },
            { name: 'Health', description: 'Service health check' }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'Paste the JWT token returned by /api/auth/login or /api/auth/register'
                },
                cookieAuth: {
                    type: 'apiKey',
                    in: 'cookie',
                    name: 'token',
                    description: 'Auth cookie is set automatically by /api/auth/login and /api/auth/register'
                }
            },
            schemas: {
                User: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string', example: '66f0a1b2c3d4e5f6a7b8c9d0' },
                        email: { type: 'string', format: 'email', example: 'john@example.com' },
                        name: { type: 'string', example: 'John Doe' }
                    }
                },
                RegisterRequest: {
                    type: 'object',
                    required: ['email', 'password', 'name'],
                    properties: {
                        email: { type: 'string', format: 'email', example: 'john@example.com' },
                        password: { type: 'string', format: 'password', minLength: 6, example: 'StrongPass123' },
                        name: { type: 'string', example: 'John Doe' }
                    }
                },
                LoginRequest: {
                    type: 'object',
                    required: ['email', 'password'],
                    properties: {
                        email: { type: 'string', format: 'email', example: 'john@example.com' },
                        password: { type: 'string', format: 'password', example: 'StrongPass123' }
                    }
                },
                AuthResponse: {
                    type: 'object',
                    properties: {
                        user: { $ref: '#/components/schemas/User' },
                        token: {
                            type: 'string',
                            example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
                        }
                    }
                },
                Account: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string', example: '66f0a1b2c3d4e5f6a7b8c9d1' },
                        user: { type: 'string', example: '66f0a1b2c3d4e5f6a7b8c9d0' },
                        status: { type: 'string', enum: ['ACTIVE', 'FROZEN', 'CLOSED'], example: 'ACTIVE' },
                        currency: { type: 'string', example: 'PKR' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' }
                    }
                },
                BalanceResponse: {
                    type: 'object',
                    properties: {
                        accountId: { type: 'string', example: '66f0a1b2c3d4e5f6a7b8c9d1' },
                        balance: { type: 'number', example: 1500 }
                    }
                },
                TransferRequest: {
                    type: 'object',
                    required: ['fromAccount', 'toAccount', 'amount', 'idemPotencyKey'],
                    properties: {
                        fromAccount: {
                            type: 'string',
                            description: 'ObjectId of the sender account (must be ACTIVE)',
                            example: '66f0a1b2c3d4e5f6a7b8c9d1'
                        },
                        toAccount: {
                            type: 'string',
                            description: 'ObjectId of the receiver account (must be ACTIVE)',
                            example: '66f0a1b2c3d4e5f6a7b8c9d2'
                        },
                        amount: {
                            type: 'number',
                            minimum: 1,
                            description: 'Amount to transfer (positive number)',
                            example: 500
                        },
                        idemPotencyKey: {
                            type: 'string',
                            description: 'Unique client-generated key to make this request safely retryable',
                            example: 'txn-2026-05-29-abc123'
                        }
                    }
                },
                InitialFundsRequest: {
                    type: 'object',
                    required: ['toAccount', 'amount', 'idemPotencyKey'],
                    properties: {
                        toAccount: { type: 'string', example: '66f0a1b2c3d4e5f6a7b8c9d2' },
                        amount: { type: 'number', example: 10000 },
                        idemPotencyKey: { type: 'string', example: 'seed-2026-05-29-001' }
                    }
                },
                Transaction: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string', example: '66f0a1b2c3d4e5f6a7b8c9d3' },
                        fromAccount: { type: 'string', example: '66f0a1b2c3d4e5f6a7b8c9d1' },
                        toAccount: { type: 'string', example: '66f0a1b2c3d4e5f6a7b8c9d2' },
                        amount: { type: 'number', example: 500 },
                        status: {
                            type: 'string',
                            enum: ['PENDING', 'COMPLETED', 'FAILED', 'REVERSED'],
                            example: 'COMPLETED'
                        },
                        idemPotencyKey: { type: 'string', example: 'txn-2026-05-29-abc123' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' }
                    }
                },
                TransactionResponse: {
                    type: 'object',
                    properties: {
                        message: { type: 'string', example: 'Transaction completed successfully' },
                        transaction: { $ref: '#/components/schemas/Transaction' }
                    }
                },
                MessageResponse: {
                    type: 'object',
                    properties: {
                        message: { type: 'string', example: 'Operation successful' }
                    }
                },
                ErrorResponse: {
                    type: 'object',
                    properties: {
                        message: { type: 'string', example: 'Something went wrong' },
                        error: { type: 'string', example: 'Detailed error description (optional)' }
                    }
                }
            },
            responses: {
                Unauthorized: {
                    description: 'Token is missing, invalid, or blacklisted',
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/ErrorResponse' },
                            example: { message: 'Unauthorized, token is missing' }
                        }
                    }
                },
                BadRequest: {
                    description: 'Validation failure or missing required fields',
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/ErrorResponse' }
                        }
                    }
                },
                NotFound: {
                    description: 'Resource not found',
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/ErrorResponse' }
                        }
                    }
                },
                ServerError: {
                    description: 'Internal server error',
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/ErrorResponse' }
                        }
                    }
                }
            }
        }
    },
    apis: [
        path.join(__dirname, '../routes/*.js'),
        path.join(__dirname, '../app.js')
    ]
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = swaggerSpec;
