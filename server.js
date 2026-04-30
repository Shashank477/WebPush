const express = require('express');
const webpush = require('web-push');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');
const creds = require('./creds.json');

const app = express();
app.use(express.static('public'));
app.use(express.json());

// Setup Google Sheet
const serviceAccountAuth = new JWT({
  email: creds.client_email,
  key: creds.private_key,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const doc = new GoogleSpreadsheet('1Veuy3t8H4ghmHfm827QdXktxxvtQRottHeQjTTyO9ZM', serviceAccountAuth);

// Web Push Keys
webpush.setVapidDetails(
    'mailto:shashankmn171@gmail.com', 
    'BKhgejwm6SptvYO3dsDTILhz8-ESDrfsOmOeuUFfLLVRdHOajrvx311WHUVgAFAJibC2rJ013b17i6lsujvYdOc', 
    'HMJkG2z1snLJZpyWNSuTDMElVrd28Ci_DKSlyRjbU44'
);

app.post('/subscribe', async (req, res) => {
    try {
        const { user, subscription } = req.body;
        await doc.loadInfo();
        const sheet = doc.sheetsByIndex[0];
        
        await sheet.addRow({
            Username: user,
            Endpoint: subscription.endpoint,
            p256dh: subscription.keys.p256dh,
            auth: subscription.keys.auth
        });
        res.status(201).json({ success: true });
    } catch (error) {
        console.error("Error saving subscription:", error);
        res.status(500).json({ error: "Failed to store subscription" });
    }
});

// CHANGED: Now using app.post to receive custom message data
app.post('/send-push', async (req, res) => {
    try {
        const { title, summary, image } = req.body;
        
        await doc.loadInfo();
        const sheet = doc.sheetsByIndex[0];
        const rows = await sheet.getRows(); 

        // Construct the custom payload
        // Inside your app.post('/send-push'...)
const payload = JSON.stringify({
    title: title,
    body: summary,
    image: image // Ensure this variable contains a valid HTTPS link
});

        const notifications = rows.map(row => {
            const pushSubscription = {
                endpoint: row.get('Endpoint'),
                keys: { 
                    auth: row.get('auth'), 
                    p256dh: row.get('p256dh') 
                }
            };

            return webpush.sendNotification(pushSubscription, payload)
                .catch(err => {
                    if (err.statusCode === 410 || err.statusCode === 404) {
                        console.log(`Subscription for ${row.get('Username')} expired.`);
                        // Optionally: row.delete();
                    } else {
                        console.error("Error sending push:", err);
                    }
                });
        });

        await Promise.all(notifications);
        res.json({ message: "Pushes Sent Successfully!" });
    } catch (error) {
        console.error("Error in /send-push:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));