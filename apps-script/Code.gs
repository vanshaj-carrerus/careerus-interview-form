/**
 * Interview form -> Google Sheet
 *
 * Setup:
 * 1. Open your Google Sheet > Extensions > Apps Script, paste this file.
 * 2. Change SECRET below (same value as GOOGLE_SCRIPT_SECRET in .env)
 *    Use this script once per sheet: one deployment for CareerUS (GOOGLE_SHEET_SCRIPT_URL)
 *    and one for CUSTECH (CUSTECH_SHEET_SCRIPT_URL)..
 * 3. Deploy > New deployment > type "Web app"
 *      Execute as: Me
 *      Who has access: Anyone
 * 4. Copy the Web app URL into GOOGLE_SHEET_SCRIPT_URL (CareerUS) or CUSTECH_SHEET_SCRIPT_URL (CUSTECH) in .env.
 * After editing this script, use Deploy > Manage deployments > Edit > New version,
 * otherwise the old code keeps running.
 */

const SECRET = 'change-me';
// Leave empty when the script is opened from the sheet (Extensions > Apps Script).
// Otherwise use the ID from the sheet link: docs.google.com/spreadsheets/d/<THIS PART>/edit
const SPREADSHEET_ID = '';
const SHEET_NAME = 'Applications';

// [header shown in the sheet, key sent by the Next.js app]
const COLUMNS = [
  ['Submitted At', 'submittedAt'],
  ['Application ID', 'id'],
  ['Position', 'positionApplyingFor'],
  ['Applying Date', 'date'],
  ['Full Name', 'fullName'],
  ['Contact Number', 'contactNumber'],
  ['Email', 'emailAddress'],
  ['Current Address', 'currentAddress'],
  ['Why Join Us', 'whyJoinUs'],
  ['About Job Role', 'knowledgeOfJobRole'],
  ['Why Change Job', 'whyChangeJob'],
  ['Why Hire You', 'whyHireYou'],
  ['Current / Last Employer', 'currentLastEmployer'],
  ['Salary Expectation', 'salaryExpectations'],
  ['Night Shifts', 'nightShiftWilling'],
  ['Ideal Work Environment', 'idealWorkEnvironment'],
  ['Reference', 'referenceNameAndContact'],
  ['Medical Issues', 'medicalIssues'],
  ['Skills', 'skills'],
  ['Joining Date', 'joiningDate'],
  ['Resume (PDF)', 'resumeUrl'],
  ['Interviewer Remarks', 'interviewerRemarks'],
  ['Interviewer Name', 'interviewerName'],
  ['Signature', 'signature'],
];

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    if (body.secret !== SECRET) return json_({ ok: false, error: 'Unauthorized' });

    lock.waitLock(20000);
    const sheet = getSheet_();
    const row = COLUMNS.map(function (c) {
      const v = body[c[1]];
      // Prefix with ' so values like "+91..." or "=..." are stored as plain text
      return v === undefined || v === null ? '' : "'" + String(v);
    });
    sheet.appendRow(row);
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

// Visiting the web app URL in a browser shows this; handy to check the deployment.
function doGet() {
  const ss = openSpreadsheet_();
  return json_({
    ok: true,
    message: 'Interview form endpoint is live',
    spreadsheet: ss.getName(),
    tab: SHEET_NAME,
    url: ss.getUrl(),
  });
}

function getSheet_() {
  const ss = openSpreadsheet_();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(COLUMNS.map(function (c) { return c[0]; }));
    sheet.getRange(1, 1, 1, COLUMNS.length).setFontWeight('bold').setBackground('#1e3a8a').setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function openSpreadsheet_() {
  return SPREADSHEET_ID ? SpreadsheetApp.openById(SPREADSHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
}
