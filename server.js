require('dotenv').config();

const app = require('./src/app');
const connectoDB = require('./src/config/db');

connectoDB();


app.listen(3000, () => {
    console.log(`Server is running on port 3000`);

    
})