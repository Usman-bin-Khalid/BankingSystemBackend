const nodemailer  = require('nodemailer');
const transporter = nodemailer.createTransport({
    service : 'gmail',
    auth : {
        type : 'OAuth2',
        user : process.env.EMAIL_USER,
        clientId : process.env.CLIENT_ID,
        clientSecret : process.env.CLIENT_SECRET,
        refreshToken : process.env.REFRESH_TOKEN
    }
});

// verify the configuration
transporter.verify((error, success) => {
   if (error) {
    console.log('Error configuring email transporter:' , error);
   } else {
    console.log('Email transporter is ready to send messages');
   }
});


// Function to send email

const sendEmail = async (to, subject, text, html) => {
    try {
        const info = await transporter.sendMail({
            from : `"Backend Banking System" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            text,
            html
        });
        console.log('Message sent: %s' , info.messageId);
        console.log('Preview URL: %s' , nodemailer.getTestMessageUrl(info));
    } catch (error) {
        console.error('Error sending email:' , error);
    }
}

async function sendRegistrationEmail(userEmail, name ) {
    const subject = 'Welcome to Backend Banking System';
    const text = `Hello ${name},\n\nThank you for registering with our banking system. We are excited to have you on board!\n\nBest regards,\nBackend Banking System Team`;
    const html = `<p>Hello ${name},</p><p>Thank you for registering with our banking system. We are excited to have you on board!</p><p>Best regards,<br/>Backend Banking System Team</p>`;
    await sendEmail(userEmail, subject, text, html);


}

// Jis user ko email send honi chahiye usko tester mai lazmi add krna hai taki email send ho sake 
// warna error aayega kyunki email send karne ke liye lazmi hai ki email address valid ho
//  aur us email address par email send karne ki permission ho

module.exports =  {sendRegistrationEmail};

