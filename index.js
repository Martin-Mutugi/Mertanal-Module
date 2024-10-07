const express = require('express');
const bodyParser = require('body-parser');
const path = require('path'); // Required for serving static files and views
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.applicationDefault(), // Automatically uses Render's environment for Firebase credentials
  databaseURL: process.env.FIREBASE_DB_URL // Make sure to set this environment variable in Render
});

const db = admin.firestore(); // Use Firestore as the database

const app = express();

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views')); // Use absolute paths to avoid issues
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files (CSS, JS, etc.)

// Define the tables and fields for each service
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

// -----------------------------------
// Root route to display the homepage
// -----------------------------------
app.get('/', (req, res) => {
  res.render('home');  // Renders the 'home.ejs' template
});

// -----------------------------------
// Route to display the Patient Registration form
// -----------------------------------
app.get('/PatientRegistration', (req, res) => {
  const fields = tableFields['PatientRegistration'];
  res.render('form', { table: 'PatientRegistration', fields, personalNumber: null, tables: Object.keys(tableFields) });
});

// -----------------------------------
// Handle form submissions for Patient Registration
// -----------------------------------
app.post('/PatientRegistration', (req, res) => {
  const data = req.body;
  const personalNumber = data.PersonalNumber;  // Capture Personal Number from the form

  // Check if Personal Number is provided
  if (!personalNumber) {
    return res.status(400).send('Personal Number is required');
  }

  // Store the patient registration data in Firebase
  db.collection('PatientRegistration').add(data)
    .then(() => {
      // Redirect to the first service form (Midwife Notes), passing Personal Number in the query string
      res.redirect(`/addData/MidwifeNotes?personalNumber=${personalNumber}`);
    })
    .catch((error) => {
      console.error('Error submitting patient data:', error);
      res.send('Error submitting patient data: ' + error);
    });
});

// -----------------------------------
// Render form for each service, with Personal Number prefilled
// -----------------------------------
app.get('/addData/:table', (req, res) => {
  const table = req.params.table;
  const personalNumber = req.query.personalNumber || null; // Personal Number will be passed in query string
  const fields = tableFields[table];

  if (!fields) {
    return res.status(404).send('Table not found');
  }

  // Render the form, passing personalNumber
  res.render('form', { table, fields, personalNumber, tables: Object.keys(tableFields) });
});

// -----------------------------------
// Handle form submissions for each service, linking to the patient by Personal Number
// -----------------------------------
app.post('/addData/:table', (req, res) => {
  const table = req.params.table;
  const data = req.body;
  const personalNumber = req.body.personalNumber || req.query.personalNumber || null;

  // Check if Personal Number is provided
  if (!personalNumber) {
    return res.status(400).send('Missing Personal Number');
  }

  // Add Personal Number to the data object
  data.personalNumber = personalNumber;

  // Store the service data in Firebase
  db.collection(table).add(data)
    .then(() => {
      const serviceOrder = [
        'MidwifeNotes', 'LaborProgressChart', 'DeliverySummary', 'LabResults', 'UltrasoundSummary',
        'DischargeSummary', 'MaternityReport', 'FollowUpNotes', 'PrenatalCheckup', 'RoutineBloodTestResults',
        'FollowUpBloodTestResults', 'Ultrasound', 'PregnancyOverview', 'DeliveryInformation',
        'PostpartumHealthCheck', 'MaternalHealthSummary', 'InfantHealthStatus'
      ];

      const nextServiceIndex = serviceOrder.indexOf(table) + 1;

      // If there are more services, redirect to the next one
      if (nextServiceIndex < serviceOrder.length) {
        const nextService = serviceOrder[nextServiceIndex];
        res.redirect(`/addData/${nextService}?personalNumber=${personalNumber}`);
      } else {
        // If no more services, redirect to the patient summary page
        res.redirect(`/patientSummary/${personalNumber}`);
      }
    })
    .catch((error) => {
      res.send('Error submitting data: ' + error);
    });
});

// -----------------------------------
// Route to show patient summary after completing all forms
// -----------------------------------
app.get('/patientSummary/:personalNumber', async (req, res) => {
  const personalNumber = req.params.personalNumber;

  if (!personalNumber || personalNumber === 'null') {
    return res.status(400).send('Invalid Personal Number');
  }

  try {
    // Fetch patient registration data using Personal Number
    const snapshot = await db.collection('PatientRegistration').where('PersonalNumber', '==', personalNumber).get();

    if (snapshot.empty) {
      return res.status(404).send('Patient not found');
    }

    const patientData = snapshot.docs[0].data();

    // Render the summary page with patient data
    res.render('patientSummary', { personalNumber, patientData });
  } catch (error) {
    res.status(500).send('Error retrieving patient data: ' + error.message);
  }
});

// -----------------------------------
// Start the server
// -----------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
