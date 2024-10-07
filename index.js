const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.applicationDefault(),  // Uses GOOGLE_APPLICATION_CREDENTIALS
  databaseURL: process.env.FIREBASE_DB_URL  // Firebase Realtime Database URL
});

const db = admin.firestore();  // Firestore instance
const app = express();

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));  // Set views directory
app.use(express.static(path.join(__dirname, 'public')));  // Serve static files (CSS, images, etc.)

// Define services and fields
const services = {
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

// Home Route
app.get('/', (req, res) => {
  res.render('home');  // Render homepage
});

// Route for Patient Registration
app.get('/PatientRegistration', (req, res) => {
  const fields = services['PatientRegistration'];
  res.render('form', { service: 'PatientRegistration', fields, personalNumber: null });
});

// Handle Patient Registration Form Submission
app.post('/addData/PatientRegistration', (req, res) => {
  const data = req.body;
  const personalNumber = data.PersonalNumber;

  // Validate Personal Number
  if (!personalNumber) {
    return res.status(400).send('Missing Personal Number');
  }

  // Store patient registration data in Firestore
  db.collection('PatientRegistration').add(data)
    .then(() => {
      // Redirect to MidwifeNotes service form
      res.redirect(`/addData/MidwifeNotes?personalNumber=${personalNumber}`);
    })
    .catch(error => {
      console.error('Error adding Patient Registration:', error);
      res.status(500).send('Error adding patient registration: ' + error);
    });
});

// Handle Form Submission for Each Service
app.post('/addData/:service', (req, res) => {
  const service = req.params.service;
  const data = req.body;
  const personalNumber = req.body.personalNumber || req.query.personalNumber;

  if (!personalNumber) {
    return res.status(400).send('Missing Personal Number');
  }

  // Add personalNumber to the data object
  data.personalNumber = personalNumber;

  // Store the data in Firestore
  db.collection(service).add(data)
    .then(() => {
      const serviceOrder = [
        'MidwifeNotes', 'LaborProgressChart', 'DeliverySummary', 'LabResults', 'UltrasoundSummary',
        'DischargeSummary', 'MaternityReport', 'FollowUpNotes', 'PrenatalCheckup', 'RoutineBloodTestResults',
        'FollowUpBloodTestResults', 'Ultrasound', 'PregnancyOverview', 'DeliveryInformation',
        'PostpartumHealthCheck', 'MaternalHealthSummary', 'InfantHealthStatus'
      ];

      const currentIndex = serviceOrder.indexOf(service);
      const nextService = serviceOrder[currentIndex + 1];

      // Redirect to next service or patient summary
      if (nextService) {
        res.redirect(`/addData/${nextService}?personalNumber=${personalNumber}`);
      } else {
        res.redirect(`/patientSummary/${personalNumber}`);
      }
    })
    .catch(error => {
      res.status(500).send('Error submitting data: ' + error);
    });
});

// Render Form for Each Service
app.get('/addData/:service', (req, res) => {
  const service = req.params.service;
  const personalNumber = req.query.personalNumber || null;
  const fields = services[service];

  if (!fields) {
    return res.status(404).send('Service not found');
  }

  res.render('form', { service, fields, personalNumber });
});

// CRUD Routes

// Read (Fetch Data)
app.get('/viewData/:service/:personalNumber', async (req, res) => {
  const service = req.params.service;
  const personalNumber = req.params.personalNumber;

  try {
    const snapshot = await db.collection(service).where('personalNumber', '==', personalNumber).get();
    const records = snapshot.docs.map(doc => doc.data());

    res.render('viewData', { service, records });
  } catch (error) {
    res.status(500).send('Error fetching data: ' + error);
  }
});

// Delete
app.post('/deleteData/:service/:docId', (req, res) => {
  const service = req.params.service;
  const docId = req.params.docId;

  db.collection(service).doc(docId).delete()
    .then(() => {
      res.send(`Record with ID ${docId} deleted from ${service}`);
    })
    .catch(error => {
      res.status(500).send('Error deleting data: ' + error);
    });
});

// Patient Summary Route
app.get('/patientSummary/:personalNumber', async (req, res) => {
  const personalNumber = req.params.personalNumber;

  if (!personalNumber || personalNumber === 'null') {
    return res.status(400).send('Invalid Personal Number');
  }

  try {
    // Fetch Patient Registration Data
    const snapshot = await db.collection('PatientRegistration').where('PersonalNumber', '==', personalNumber).get();
    if (snapshot.empty) {
      return res.status(404).send('Patient not found');
    }

    const patientData = snapshot.docs[0].data();
    res.render('patientSummary', { personalNumber, patientData });
  } catch (error) {
    res.status(500).send('Error retrieving patient data: ' + error.message);
  }
});

// Start Server
const PORT = process.env.PORT || 3000;  // Use PORT assigned by Render
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
