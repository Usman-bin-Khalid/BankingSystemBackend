const nodemailer = require('nodemailer');

// Whether to attempt sending email at all.
// Render's free tier blocks outbound SMTP (ports 25/465/587), so even with OAuth2
// the connection to smtp.gmail.com will time out. Set EMAIL_ENABLED=false on Render
// free to skip the attempt entirely. See DEPLOYMENT.md for HTTP-API alternatives.
const EMAIL_ENABLED = process.env.EMAIL_ENABLED !== 'false';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        type: 'OAuth2',
        user: process.env.EMAIL_USER,
        clientId: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        refreshToken: process.env.REFRESH_TOKEN
    },
    // Fail fast instead of hanging the request for ~2 minutes when SMTP is blocked.
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 5000
});

// NOTE: we intentionally do NOT call transporter.verify() at startup.
// On Render's free tier, that call fails with ETIMEDOUT (SMTP egress is blocked)
// and produces a noisy stack trace on every boot, even though the rest of the app
// is healthy.

const sendEmail = async (to, subject, text, html) => {
    if (!EMAIL_ENABLED) {
        console.log(`[email skipped] EMAIL_ENABLED=false — would send "${subject}" to ${to}`);
        return;
    }
    try {
        const info = await transporter.sendMail({
            from: `"Backend Banking System" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            text,
            html
        });
        console.log('Message sent:', info.messageId);
    } catch (error) {
        // Soft-fail — never let an email problem break the API response.
        console.warn(`[email failed] "${subject}" to ${to}:`, error.code || error.message);
    }
};

async function sendRegistrationEmail(userEmail, name) {
    const subject = 'Welcome to Backend Banking System';
    const text = `Hello ${name},\n\nThank you for registering with our banking system. We are excited to have you on board!\n\nBest regards,\nBackend Banking System Team`;
    const html = `<p>Hello ${name},</p><p>Thank you for registering with our banking system. We are excited to have you on board!</p><p>Best regards,<br/>Backend Banking System Team</p>`;
    await sendEmail(userEmail, subject, text, html);
}

async function sendTransactionEmail(userEmail, name, amount, toAccount) {
    const subject = 'Transaction Successful';
    const text = `Hello ${name},\n\nYour transaction of amount ${amount} to account ${toAccount} has been successful.\n\nBest regards,\nBackend Banking System Team`;
    const html = `<p>Hello ${name},</p><p>Your transaction of amount ${amount} to account ${toAccount} has been successful.</p><p>Best regards,<br/>Backend Banking System Team</p>`;
    await sendEmail(userEmail, subject, text, html);
}

async function sendTransactionFailureEmail(userEmail, name, amount, toAccount) {
    const subject = 'Transaction Failed';
    const text = `Hello ${name},\n\nWe regret to inform you that your transaction of amount ${amount} to account ${toAccount} has failed. Please try again later or contact support for assistance.\n\nBest regards,\nBackend Banking System Team`;
    const html = `<p>Hello ${name},</p><p>We regret to inform you that your transaction of amount ${amount} to account ${toAccount} has failed. Please try again later or contact support for assistance.</p><p>Best regards,<br/>Backend Banking System Team</p>`;
    await sendEmail(userEmail, subject, text, html);
}

module.exports = { sendRegistrationEmail, sendTransactionEmail, sendTransactionFailureEmail };
