const express = require('express');
const cookieParser = require('cookie-parser');


// Routes
const authRouter = require('./routes/auth.routes');
const accountRouter = require('./routes/account.routes');
const transactionRouter = require('./routes/transaction.routes');


const app = express();
app.use(express.json());
app.use(cookieParser());

// User Routes
app.use('/api/auth', authRouter);
app.use('/api/accounts', accountRouter);
app.use('/api/transactions', transactionRouter);
module.exports = app;


// app.js file ky 2 purpose hoty hyn 
// 1. Server ko create krna
// 2. Server ko configure krna