/**
 * ====================================================================================
 *  AI RESUME - GOOGLE SHEETS AUTOMATED OUTREACH MAIL SCRIPT
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
 * 3. (Optional) If you want to attach a PDF resume from Google Drive:
 *    - Right-click your resume PDF in Google Drive > Share > Copy link.
 *    - Extract the ID string (between /d/ and /view) and paste into RESUME_FILE_ID below.
 *    - Example: https://drive.google.com/file/d/1ABCXYZ.../view -> "1ABCXYZ..."
 * 4. Click Save (disk icon) and return to your Google Sheet.
 * 5. Refresh your Google Sheet webpage — a new menu "Auto Resume Mailer" will appear at top!
 * 6. Click "Auto Resume Mailer" > "Send Resume Emails to Companies" to dispatch emails.
 * ====================================================================================
 */

// 1. (OPTIONAL) REPLACE THIS WITH YOUR GOOGLE DRIVE RESUME PDF FILE ID
// Extract the ID from your Google Drive link: https://drive.google.com/file/d/YOUR_FILE_ID/view
// Leave as "" if sending without PDF attachment.
const RESUME_FILE_ID = ""; 

/**
 * MAIN FUNCTION: Dispatches resume emails to all rows in the active Google Sheet.
 * Features Gmail Daily Quota Protection & Anti-Spam Revocation Control.
 */
function sendResumeEmails() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = sheet.getDataRange().getValues();
  
  if (data.length <= 1) {
    SpreadsheetApp.getUi().alert("No job rows found in sheet. Please export selected jobs from the AI Resume app first.");
    return;
  }

  // Check remaining daily email quota
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

  // Gracefully load Resume File Attachment from Google Drive
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

  // Loop through rows (skip header row index 0)
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    
    const companyName = String(row[1] || "").trim();               // Column B (Company)
    const jobRole = String(row[2] || "").trim();                   // Column C (Role)
    const recipientEmail = String(row[6] || "").replace(/["']/g, '').trim(); // Column G (Contact Email)
    const emailSubject = String(row[9] || "").trim();              // Column J (Email Subject)
    const emailBody = String(row[10] || "").trim();                // Column K (Email Body)
    const status = String(row[11] || "").trim();                   // Column L (Status)

    // Skip if already sent
    if (status && status.toUpperCase().includes("SENT")) {
      skippedSentCount++;
      continue;
    }

    // Check for valid email address
    if (!recipientEmail || !recipientEmail.includes("@")) {
      Logger.log("Skipping Row " + (i + 1) + ": Missing or invalid email address ('" + recipientEmail + "').");
      skippedMissingCount++;
      continue;
    }

    // Check for email subject and body
    if (!emailSubject || !emailBody) {
      Logger.log("Skipping Row " + (i + 1) + ": Missing Subject or Body.");
      skippedMissingCount++;
      continue;
    }

    // Check remaining daily email quota before sending
    if (MailApp.getRemainingDailyQuota() <= 0) {
      Logger.log("Quota limit reached during execution. Halting outreach.");
      sheet.getRange(i + 1, 12).setValue("QUOTA EXHAUSTED (Resume tomorrow)");
      quotaStopped = true;
      break;
    }

    try {
      // Build options object
      const options = {
        name: "Job Applicant"
      };

      if (resumeFile) {
        options.attachments = [resumeFile.getAs(MimeType.PDF)];
      }

      // Send email via MailApp (Fallback to GmailApp)
      try {
        MailApp.sendEmail(recipientEmail, emailSubject, emailBody, options);
      } catch (eMailApp) {
        GmailApp.sendEmail(recipientEmail, emailSubject, emailBody, options);
      }

      // Update Column L (Status) to SENT with timestamp
      const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || "GMT", "yyyy-MM-dd HH:mm");
      sheet.getRange(i + 1, 12).setValue("SENT (" + timestamp + ")");
      sentCount++;

      Logger.log("✅ Sent email " + sentCount + " to " + recipientEmail);

      // Pause 3.5 seconds between emails to bypass Google anti-abuse triggers
      Utilities.sleep(3500);
    } catch (err) {
      Logger.log("❌ Failed to send email for Row " + (i + 1) + ": " + err.message);
      
      const errLower = err.message.toLowerCase();
      if (errLower.includes("quota") || errLower.includes("limit") || errLower.includes("revoked") || errLower.includes("too many")) {
        sheet.getRange(i + 1, 12).setValue("QUOTA EXHAUSTED (Resume tomorrow)");
        quotaStopped = true;
        break;
      } else {
        sheet.getRange(i + 1, 12).setValue("ERROR: " + err.message);
      }
    }
  }

  const finalQuota = MailApp.getRemainingDailyQuota();

  // Show detailed summary dialog
  SpreadsheetApp.getUi().alert(
    "Outreach Summary:\n\n" +
    "✅ Emails Sent in this Run: " + sentCount + "\n" +
    "⏭️ Skipped (Already Sent): " + skippedSentCount + "\n" +
    "⚠️ Skipped (Missing Data): " + skippedMissingCount + "\n" +
    "📊 Remaining Daily Gmail Quota: " + finalQuota + " emails\n\n" +
    (quotaStopped ? "⛔ Paused: Daily Gmail limit reached. Remaining rows will resume tomorrow automatically when you re-run." : "✨ Batch completed successfully!")
  );
}

/**
 * Creates custom menu in Google Sheets header
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu("Auto Resume Mailer")
    .addItem("Send Resume Emails to Companies", "sendResumeEmails")
    .addToUi();
}
