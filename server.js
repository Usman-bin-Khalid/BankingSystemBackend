require('dotenv').config();

const app = require('./src/app');
const connectoDB = require('./src/config/db');

connectoDB();


app.listen(5001, () => {
    console.log(`Server is running on port 5001`);

    
})