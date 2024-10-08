const fs = require('fs');
const path = require('path');

// Define the path to your serviceAccountKey.json file
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');

// Read the serviceAccountKey.json file
fs.readFile(serviceAccountPath, 'utf8', (err, data) => {
    if (err) {
        console.error('Error reading service account key file:', err);
        return;
    }

    // Convert the file content to a Base64-encoded string
    const base64String = Buffer.from(data).toString('base64');

    // Output the Base64 string
    console.log('Base64-encoded serviceAccountKey.json:');
    console.log(base64String);
});
