# Google Sheet Setup For Interview Form

## 1) Sheet Name
Create a Google Sheet tab named:

`Submissions`

## 2) Header Row (A1 onward)
Copy-paste this as your first row:

```text
submittedAt,positionApplyingFor,date,fullName,contactNumber,emailAddress,currentAddress,whyJoinUs,knowledgeOfJobRole,whyChangeJob,whyHireYou,currentLastEmployer,salaryExpectations,nightShiftWilling,idealWorkEnvironment,referenceNameAndContact,medicalIssues,skills,typingSpeedWpm,resumeFileName,resumeUrl,interviewerRemarks,interviewerName,signature,joiningDate
```

## 3) Apps Script Code
In Google Sheet: Extensions -> Apps Script, replace the default code with:

```javascript
const SHEET_NAME = "Submissions";

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || "{}");
    const sheet = getSheet_();

    const headers = getHeaders_(sheet);
    const row = headers.map((header) => normalizeValue_(body[header]));

    sheet.appendRow(row);

    return jsonResponse_({
      ok: true,
      message: "Saved successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return jsonResponse_({
      ok: false,
      error: error && error.message ? error.message : String(error),
    });
  }
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    throw new Error(
      `Sheet '${SHEET_NAME}' not found. Please create it and add headers in row 1.`
    );
  }
  return sheet;
}

function getHeaders_(sheet) {
  const lastCol = sheet.getLastColumn();
  if (lastCol < 1) {
    throw new Error("Header row is missing.");
  }
  const values = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const headers = values
    .map((v) => String(v || "").trim())
    .filter((v) => v.length > 0);
  if (!headers.length) {
    throw new Error("Header row is empty.");
  }
  return headers;
}

function normalizeValue_(value) {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function jsonResponse_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON
  );
}
```

## 4) Deploy
Deploy -> New deployment -> Type: Web app

- Execute as: `Me`
- Who has access: `Anyone`

Copy the Web app URL.

## 5) Connect Next.js app
Create `.env.local` in project root:

```env
GOOGLE_SHEET_SCRIPT_URL=
```

Paste your Web app URL as the value and restart Next.js dev server.
