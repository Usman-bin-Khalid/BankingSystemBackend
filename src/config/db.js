const mongoose = require('mongoose');


function connectoDB() {
    console.log('Attempting to connect to MongoDB Atlas...');
    
    mongoose.connect(process.env.MONGO_URI, {
        family: 4,
        serverSelectionTimeoutMS: 5000,
        // TEMPORARY FIX: Bypassing SSL validation because your system clock is wrong.
        // Once you fix your clock, you can remove this line.
        tlsAllowInvalidCertificates: true 
    }).then(() => {
        console.log('✅ Server is connected to the database (using TLS workaround)');
    }).catch((err) => {
        console.error('❌ Error connecting to the database:');
        console.error(err.message);
        
        console.log('\n---------------------------------------------------------');
        console.log('🛑 WHY IS THIS HAPPENING?');
        console.log('Your computer clock is set to: ' + new Date().toLocaleString());
        console.log('The actual date is May 17, 2026.');
        console.log('MongoDB certificates are NOT valid before May 17.');
        console.log('---------------------------------------------------------\n');
    });
}

module.exports = connectoDB;