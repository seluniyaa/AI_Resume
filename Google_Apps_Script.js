/**
 * ====================================================================================
 *  AI RESUME - GOOGLE SHEETS AUTOMATED OUTREACH MAIL & DIRECT SYNC SCRIPT
 * ====================================================================================
 * 
 * 📋 GOOGLE SHEETS ROW 1 COLUMN HEADERS (Copy & Paste these exact headers into Row 1):
 * ------------------------------------------------------------------------------------
 * Col A (1)  : DATE ADDED
 * Col B (2)  : COMPANY NAME
 * Col C (3)  : JOB ROLE
 * Col D (4)  : SOURCE PLATFORM
 * Col E (5)  : LOCATION
 * Col F (6)  : MATCH SCORE (%)
 * Col G (7)  : COMPANY CONTACT EMAIL
 * Col H (8)  : JOB POSTING URL
 * Col I (9)  : AI EVALUATION & SKILLS
 * Col J (10) : EMAIL SUBJECT
 * Col K (11) : EMAIL BODY
 * Col L (12) : OUTREACH STATUS
 * 
 * ------------------------------------------------------------------------------------
 * ⚙️ HOW TO SETUP IN GOOGLE SHEETS:
 * 1. Open your Google Sheet > Click "Extensions" > Click "Apps Script".
 * 2. Delete any default code in Code.gs, and paste this ENTIRE code block below.
 * 3. Click "Deploy" (top right) > "New deployment" > Select type "Web app":
 *    - Description: AI Resume Auto Sync Webhook
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 4. Click "Deploy", approve permissions, and copy the Web App URL!
 * 5. Paste the Web App URL into the AI Resume web app for 100% automated 1-click sheet sync!
 * ====================================================================================
 */

// 1. (OPTIONAL) REPLACE THIS WITH YOUR GOOGLE DRIVE RESUME PDF FILE ID
const RESUME_FILE_ID = ""; 

/**
 * WEB APP AUTOMATED SYNC WEBHOOK (doPost):
 * Enables 100% automated 1-click direct job posting into Google Sheets.
 * Bypasses GCP Service Account JWT Signatures & System Clock Skew!
 */
function doPost(e) {
  try {
    let payload = {};
    if (e && e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    }
    const jobs = payload.jobs || [];
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getActiveSheet();
    const data = sheet.getDataRange().getValues();

    const headers = [
      "DATE ADDED", "COMPANY NAME", "JOB ROLE", "SOURCE PLATFORM", "LOCATION", 
      "MATCH SCORE (%)", "COMPANY CONTACT EMAIL", "JOB POSTING URL", 
      "AI EVALUATION & SKILLS", "EMAIL SUBJECT", "EMAIL BODY", "OUTREACH STATUS"
    ];

    // Detect if headers exist in row 1
    let hasHeader = false;
    if (data.length > 0 && data[0][0]) {
      const firstRowStr = data[0].join(" ").toUpperCase();
      if (firstRowStr.includes("COMPANY NAME") || firstRowStr.includes("JOB ROLE") || firstRowStr.includes("DATE ADDED")) {
        hasHeader = true;
      }
    }

    if (!hasHeader) {
      if (data.length > 0) {
        sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      } else {
        sheet.appendRow(headers);
      }
    }

    let addedCount = 0;
    const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || "GMT", "yyyy-MM-dd HH:mm");
    
    jobs.forEach(function(j) {
      sheet.appendRow([
        j.date_added || today,
        j.company || 'Company',
        j.title || 'Job Role',
        j.source_platform || 'Company ATS Portal',
        j.location || 'Remote',
        (j.match_score || 80) + '%',
        j.contact_email || '',
        j.url || '',
        j.ai_evaluation || '',
        j.email_subject || '',
        j.email_body || '',
        'Ready for Outreach'
      ]);
      addedCount++;
    });

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      message: "Successfully automated sync of " + addedCount + " job listings!",
      count: addedCount
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * MAIN OUTREACH FUNCTION: Dispatches resume emails to all rows in the active Google Sheet.
 */
function sendResumeEmails() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = sheet.getDataRange().getValues();
  
  if (data.length <= 1) {
    SpreadsheetApp.getUi().alert("No job rows found in sheet. Please export selected jobs from the AI Resume app first.");
    return;
  }

  const initialQuota = MailApp.getRemainingDailyQuota();
  Logger.log("Remaining Daily Email Quota for your Google Account: " + initialQuota);

  if (initialQuota <= 0) {
    SpreadsheetApp.getUi().alert(
      "⛔ Gmail Daily Sending Limit Reached!\n\n" +
      "Your Google account has used up its daily email quota limit.\n" +
      "Google resets your quota automatically after 24 hours. Please run this script tomorrow!"
    );
    return;
  }

  let resumeFile = null;
  if (RESUME_FILE_ID && RESUME_FILE_ID.trim() !== "") {
    try {
      resumeFile = DriveApp.getFileById(RESUME_FILE_ID.trim());
      Logger.log("Successfully loaded resume file: " + resumeFile.getName());
    } catch (e) {
      Logger.log("Warning: Could not open resume file from Drive (" + e.message + "). Proceeding without PDF attachment.");
    }
  }

  let sentCount = 0;
  let skippedSentCount = 0;
  let skippedMissingCount = 0;
  let quotaStopped = false;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    
    const companyName = String(row[1] || "").trim();
    const jobRole = String(row[2] || "").trim();
    const recipientEmail = String(row[6] || "").replace(/["']/g, '').trim();
    const emailSubject = String(row[9] || "").trim();
    const emailBody = String(row[10] || "").trim();
    const status = String(row[11] || "").trim();

    if (status && status.toUpperCase().includes("SENT")) {
      skippedSentCount++;
      continue;
    }

    if (!recipientEmail || !recipientEmail.includes("@")) {
      skippedMissingCount++;
      continue;
    }

    if (!emailSubject || !emailBody) {
      skippedMissingCount++;
      continue;
    }

    if (MailApp.getRemainingDailyQuota() <= 0) {
      sheet.getRange(i + 1, 12).setValue("QUOTA EXHAUSTED (Resume tomorrow)");
      quotaStopped = true;
      break;
    }

    try {
      const options = { name: "Job Applicant" };
      if (resumeFile) {
        options.attachments = [resumeFile.getAs(MimeType.PDF)];
      }

      try {
        MailApp.sendEmail(recipientEmail, emailSubject, emailBody, options);
      } catch (eMailApp) {
        GmailApp.sendEmail(recipientEmail, emailSubject, emailBody, options);
      }

      const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || "GMT", "yyyy-MM-dd HH:mm");
      sheet.getRange(i + 1, 12).setValue("SENT (" + timestamp + ")");
      sentCount++;
      Utilities.sleep(3500);
    } catch (err) {
      sheet.getRange(i + 1, 12).setValue("ERROR: " + err.message);
    }
  }

  const finalQuota = MailApp.getRemainingDailyQuota();
  SpreadsheetApp.getUi().alert(
    "Outreach Summary:\n\n" +
    "✅ Emails Sent: " + sentCount + "\n" +
    "⏭️ Skipped (Already Sent): " + skippedSentCount + "\n" +
    "📊 Remaining Daily Gmail Quota: " + finalQuota + " emails\n"
  );
}

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu("Auto Resume Mailer")
    .addItem("Send Resume Emails to Companies", "sendResumeEmails")
    .addToUi();
}
