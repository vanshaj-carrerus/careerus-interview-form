// Re-sends applications with sheetSynced: false to the Google Sheet of the form they came from.
// Usage: node --env-file=.env scripts/resync-sheet.mjs
//        node --env-file=.env scripts/resync-sheet.mjs --all   (re-send every application)
import { MongoClient } from "mongodb";

const FIELDS = [
  "positionApplyingFor", "date", "fullName", "contactNumber", "emailAddress", "currentAddress",
  "whyJoinUs", "knowledgeOfJobRole", "whyChangeJob", "whyHireYou", "currentLastEmployer", "salaryExpectations",
  "nightShiftWilling", "idealWorkEnvironment", "referenceNameAndContact", "medicalIssues", "joiningDate",
  "interviewerRemarks", "interviewerName", "signature",
];

const APP_URL = (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");

// Mirrors src/lib/googleSheet.ts: each form has its own sheet.
function sheetEnvFor(source) {
  return source === "custech"
    ? { url: process.env.CUSTECH_SHEET_SCRIPT_URL, secret: process.env.CUSTECH_SHEET_SCRIPT_SECRET || process.env.GOOGLE_SCRIPT_SECRET }
    : { url: process.env.GOOGLE_SHEET_SCRIPT_URL, secret: process.env.GOOGLE_SCRIPT_SECRET };
}

const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10_000 });

try {
  await client.connect();
  const col = client.db(process.env.MONGODB_DB || "interview").collection("applications");
  const filter = process.argv.includes("--all") ? {} : { sheetSynced: { $ne: true } };
  const pending = await col.find(filter).sort({ submittedAt: 1 }).toArray();
  console.log(`${pending.length} application(s) to sync`);

  for (const doc of pending) {
    const source = doc.submittedFrom === "custech" ? "custech" : "careerus";
    const { url, secret } = sheetEnvFor(source);
    if (!url) {
      console.log(`✗ ${doc.fullName}: no sheet script URL set for "${source}"`);
      continue;
    }

    const row = {
      secret,
      id: doc._id.toString(),
      submittedAt: new Date(doc.submittedAt).toISOString(),
      skills: (doc.skills || []).join(", "),
      resumeUrl: doc.resumePublicId ? `${APP_URL}/api/resume/${doc._id}` : "",
    };
    for (const f of FIELDS) row[f] = doc[f] ?? "";

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(row),
      signal: AbortSignal.timeout(20_000),
    });
    const text = await res.text();
    let data = {};
    try {
      data = JSON.parse(text);
    } catch {
      console.log(`✗ ${doc.fullName}: non-JSON response (status ${res.status}) - check the ${source} sheet script URL`);
      continue;
    }
    if (data.ok) {
      await col.updateOne({ _id: doc._id }, { $set: { sheetSynced: true } });
      console.log(`✓ ${doc.fullName}`);
    } else {
      console.log(`✗ ${doc.fullName}: ${data.error}`);
    }
  }
} finally {
  await client.close();
}
