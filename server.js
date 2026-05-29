require('dotenv').config();

const app = require('./src/app');
const connectoDB = require('./src/config/db');

connectoDB();

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Swagger docs available at /api-docs`);
});
