const express = require('express');
const bodyParser = require('body-parser');
const db = require('./firebase'); // Firebase setup

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', './views');
app.use(express.static('public'));

// Define the tables and fields for each
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
// Homepage displaying all tables
// -----------------------------------
app.get('/', (req, res) => {
  const tables = Object.keys(tableFields); // Get all table names
  res.render('home', { tables }); // Render the homepage with the list of tables
});

// -----------------------------------
// CREATE ROUTE: Render form based on table
// -----------------------------------
app.get('/:table', (req, res) => {
  const table = req.params.table;
  const fields = tableFields[table];

  if (!fields) {
    return res.status(404).send('Table not found');
  }

  // Render form for this table
  res.render('form', { table, fields });
});

// -----------------------------------
// CREATE ROUTE: Handle form submissions
// -----------------------------------
app.post('/:table', (req, res) => {
  const table = req.params.table;
  const data = req.body;

  db.collection(table).add(data)
    .then(() => res.send("Data submitted successfully!"))
    .catch(error => res.send("Error submitting data: " + error));
});

// -----------------------------------
// READ ROUTE: View all entries for a specific table
// -----------------------------------
app.get('/view/:table', async (req, res) => {
  const table = req.params.table;

  try {
    const snapshot = await db.collection(table).get();
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.render('view', { table, data });
  } catch (error) {
    res.status(500).send('Error retrieving data: ' + error.message);
  }
});

// -----------------------------------
// EDIT ROUTE: Get a specific entry to edit (GET /edit)
// -----------------------------------
app.get('/edit/:table/:id', async (req, res) => {
  const table = req.params.table;
  const id = req.params.id;

  try {
    const doc = await db.collection(table).doc(id).get();

    if (!doc.exists) {
      return res.status(404).send('Document not found');
    }

    res.render('edit', { table, id, data: doc.data() });
  } catch (error) {
    res.status(500).send('Error retrieving data: ' + error.message);
  }
});

// -----------------------------------
// UPDATE ROUTE: Handle form submission for editing (POST /edit)
// -----------------------------------
app.post('/edit/:table/:id', async (req, res) => {
  const table = req.params.table;
  const id = req.params.id;
  const updatedData = req.body;

  try {
    await db.collection(table).doc(id).update(updatedData);
    res.redirect(`/view/${table}`);
  } catch (error) {
    res.status(500).send('Error updating data: ' + error.message);
  }
});

// -----------------------------------
// DELETE ROUTE: Handle deleting an entry (GET /delete)
// -----------------------------------
app.get('/delete/:table/:id', async (req, res) => {
  const table = req.params.table;
  const id = req.params.id;

  try {
    await db.collection(table).doc(id).delete();
    res.redirect(`/view/${table}`);
  } catch (error) {
    res.status(500).send('Error deleting document: ' + error.message);
  }
});

// -----------------------------------
// Start the server
// -----------------------------------
app.listen(3000, () => {
  console.log("Server is running on port 3000");
});
