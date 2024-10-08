const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config();  // Optional, for local .env files

const app = express();

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));  // Ensure views are in the right folder
app.use(express.static(path.join(__dirname, 'public')));  // Serve static files (CSS, JS)

// Firebase Initialization (Handles Render and local development)
if (process.env.GOOGLE_CREDENTIALS_BASE64) {
    // Decode Base64 credentials in Render
    const serviceAccountBuffer = Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64, 'base64');
    const serviceAccount = JSON.parse(serviceAccountBuffer.toString('utf-8'));

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DB_URL  // Ensure this is set in Render environment variables
    });
} else {
    // For local development, use serviceAccountKey.json file
    const serviceAccount = require('./serviceAccountKey.json');
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: 'https://netdokproject.firebaseio.com'  // Replace with your Firebase DB URL
    });
}

// Firestore database reference
const db = admin.firestore();

// Fields for each service form (includes Patient Registration and 18 services)
const tableFields = {
  'PatientRegistration': ['PersonalNumber', 'FirstName', 'LastName', 'DateOfBirth', 'Gender', 'ContactNumber', 'Email', 'Address', 'Allergies', 'PreviousConditions', 'InsuranceProvider', 'InsuranceNumber', 'EmergencyContact', 'EmergencyContactNo', 'BloodGroup'],
  'MidwifeNotes': ['Time', 'MidwifeNote', 'DayNote', 'Discharge', 'MaternityReport'],
  'LaborProgressChart': ['PersonalNumber', 'Name', 'WomensClinic', 'TimeOfLabor', 'CervicalDilation', 'FetalHeartRate', 'Contractions'],
  'DeliverySummary': ['PersonalNumber', 'Name', 'Facility', 'DateOfBirth', 'DeliveryMethod', 'BirthWeight', 'ApgarScore', 'HeadCircumference', 'Length'],
  'LabResults': ['SerumFerritin', 'SensitiveTSH', 'FreeThyroxine', 'Hepatitis', 'HIV', 'ImmunizationTest', 'RhFactor', 'Rubella', 'SyphilisTest'],
  'UltrasoundSummary': ['Date', 'GestationalAge', 'FetalHeartRate', 'AmnioticFluid', 'EstimatedDelivery', 'BiparietalDiameter', 'AbdominalDiameter', 'FemurLength'],
  'DischargeSummary': ['Date', 'DischargeTime', 'HemoglobinLevel', 'BloodReceived', 'RecommendedFollowUp', 'WoundHealed'],
  'MaternityReport': ['DeliveryMethod', 'ApgarScore', 'BirthWeight', 'HeadCircumference', 'Length', 'NeonatalCondition', 'Breastfeeding', 'FollowUp'],
  'FollowUpNotes': ['Time', 'MidwifeNote', 'CopySent', 'BloodTest', 'HemoglobinLevel', 'FollowUp'],
  'PrenatalCheckup': ['PersonalNumber', 'Name', 'GestationalWeek', 'LastMenstrualPeriod', 'ExpectedDueDate', 'BloodPressure', 'Weight', 'FetalMovements'],
  'RoutineBloodTestResults': ['Hemoglobin', 'Ferritin', 'TSH', 'FreeT4', 'Hepatitis', 'HIV', 'Syphilis', 'RhFactor'],
  'FollowUpBloodTestResults': ['Hemoglobin', 'BloodTransfusion', 'HemoglobinPostTransfusion', 'FollowUp'],
  'Ultrasound': ['AmnioticFluid', 'FetalHeartRate', 'BiparietalDiameter', 'AbdominalDiameter', 'FemurLength', 'EstimatedDeliveryDate'],
  'PregnancyOverview': ['GestationalWeek', 'ExpectedDeliveryDate', 'BloodPressure', 'Weight', 'FetalActivity', 'Complications', 'Hemoglobin'],
  'DeliveryInformation': ['ChildsBirthDate', 'BirthWeight', 'HeadCircumference', 'Length', 'ApgarScore', 'DeliveryMethod', 'DeliveryComplications'],
  'PostpartumHealthCheck': ['BloodPressure', 'Hemoglobin', 'BloodTransfusion', 'PostTransfusionHemoglobin', 'WoundHealed', 'FollowUp'],
  'MaternalHealthSummary': ['Weight', 'BloodPressure', 'Hemoglobin', 'FetalMovements', 'Complications'],
  'InfantHealthStatus': ['BirthWeight', 'HeadCircumference', 'ApgarScore', 'BirthStatus', 'Breastfeeding', 'FollowUp']
};

// Route for Home Page (e.g., a dashboard of services)
app.get('/', (req, res) => {
  const tables = Object.keys(tableFields);
  res.render('home', { tables });  // This will render the home.ejs with list of tables (services)
});

// Patient Registration Route (GET)
app.get('/PatientRegistration', (req, res) => {
  const fields = tableFields['PatientRegistration'];
  res.render('form', { table: 'PatientRegistration', fields, personalNumber: null });
});

// Handle Patient Registration Form (POST)
app.post('/PatientRegistration', (req, res) => {
  const data = req.body;
  const personalNumber = data.PersonalNumber;  // Capture Personal Number

  if (!personalNumber) {
    return res.status(400).send('Personal Number is required.');
  }

  // Store patient registration data
  db.collection('PatientRegistration').add(data)
    .then(() => {
      // Redirect to the first service form after registration (Midwife Notes)
      res.redirect(`/addData/MidwifeNotes?personalNumber=${personalNumber}`);
    })
    .catch((error) => {
      console.error('Error adding patient registration:', error);
      res.status(500).send('Error adding patient registration: ' + error.message);
    });
});

// Route to handle each service (GET)
app.get('/addData/:table', (req, res) => {
  const table = req.params.table;
  const personalNumber = req.query.personalNumber;  // Capturing Personal Number passed in query string
  const fields = tableFields[table];

  if (!fields) {
    return res.status(404).send('Service not found.');
  }

  res.render('form', { table, fields, personalNumber });
});

// Handle form submission for each service (POST)
app.post('/addData/:table', (req, res) => {
  const table = req.params.table;
  const data = req.body;
  const personalNumber = req.body.personalNumber || req.query.personalNumber;

  if (!personalNumber) {
    return res.status(400).send('Missing Personal Number.');
  }

  // Ensure personal number is part of the data
  data.PersonalNumber = personalNumber;

  // Store service data in Firebase
  db.collection(table).add(data)
    .then(() => {
      const serviceOrder = [
        'MidwifeNotes', 'LaborProgressChart', 'DeliverySummary', 'LabResults', 'UltrasoundSummary',
        'DischargeSummary', 'MaternityReport', 'FollowUpNotes', 'PrenatalCheckup', 'RoutineBloodTestResults',
        'FollowUpBloodTestResults', 'Ultrasound', 'PregnancyOverview', 'DeliveryInformation',
        'PostpartumHealthCheck', 'MaternalHealthSummary', 'InfantHealthStatus'
      ];

      const nextServiceIndex = serviceOrder.indexOf(table) + 1;

      // Redirect to the next service form or the summary page if all services are completed
      if (nextServiceIndex < serviceOrder.length) {
        const nextService = serviceOrder[nextServiceIndex];
        res.redirect(`/addData/${nextService}?personalNumber=${personalNumber}`);
      } else {
        res.redirect(`/patientSummary/${personalNumber}`);
      }
    })
    .catch((error) => {
      console.error('Error submitting data:', error);
      res.status(500).send('Error submitting data: ' + error.message);
    });
});

// Patient Summary Route
app.get('/patientSummary/:personalNumber', async (req, res) => {
  const personalNumber = req.params.personalNumber;

  if (!personalNumber) {
    return res.status(400).send('Invalid Personal Number.');
  }

  try {
    // Fetch patient registration data
    const snapshot = await db.collection('PatientRegistration').where('PersonalNumber', '==', personalNumber).get();

    if (snapshot.empty) {
      return res.status(404).send('Patient not found.');
    }

    const patientData = snapshot.docs[0].data();
    res.render('patientSummary', { personalNumber, patientData });
  } catch (error) {
    console.error('Error retrieving patient data:', error);
    res.status(500).send('Error retrieving patient data: ' + error.message);
  }
});

// Start the server
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
