const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json'); // Path to your Firebase credentials

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://maternal-health-monitori-a6612.firebaseio.com" // Replace <your-project-id> with the actual ID
});

const db = admin.firestore();
module.exports = db;
