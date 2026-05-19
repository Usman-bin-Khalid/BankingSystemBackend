const express = require('express');
const cookieParser = require('cookie-parser');

const authRouter = require('./routes/auth.routes');


const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api/auth', authRouter);

module.exports = app;


// app.js file ky 2 purpose hoty hyn 
// 1. Server ko create krna
// 2. Server ko configure krna