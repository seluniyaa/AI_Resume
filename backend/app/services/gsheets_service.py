import os
import urllib.parse
from datetime import datetime
from typing import List, Dict, Any

try:
    import gspread
    from google.oauth2.service_account import Credentials
except ImportError:
    gspread = None
    Credentials = None

# Default User Spreadsheet ID
DEFAULT_SPREADSHEET_ID = "13YrBaEiTJZ7LP-ROpFfLzhp2MCPQtBBU5w6PgXdJ7rY"

# Credential file locations
CREDENTIAL_PATHS = [
    os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "credits.json"),
    os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "service_account.json"),
    os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "credentials.json"),
]

PRESENTATION_HEADERS = [
    "DATE ADDED",
    "COMPANY NAME",
    "JOB ROLE",
    "SOURCE PLATFORM",
    "LOCATION",
    "MATCH SCORE (%)",
    "COMPANY CONTACT EMAIL",
    "JOB POSTING URL",
    "AI EVALUATION & SKILLS",
    "EMAIL SUBJECT",
    "EMAIL BODY",
    "OUTREACH STATUS"
]

def get_gspread_client():
    if not gspread or not Credentials:
        return None, "gspread package not installed."

    cred_file = None
    for path in CREDENTIAL_PATHS:
        if os.path.exists(path):
            cred_file = path
            break

    if not cred_file:
        return None, "Service Account JSON file (credits.json) not found in project directory."

    try:
        scopes = [
            "https://www.googleapis.com/auth/spreadsheets",
            "https://www.googleapis.com/auth/drive"
        ]
        creds = Credentials.from_service_account_file(cred_file, scopes=scopes)
        client = gspread.authorize(creds)
        return client, None
    except Exception as e:
        return None, f"GCP Authentication failed: {str(e)}"

def generate_google_sheets_export_payload(candidate_info: Dict[str, Any], job_listings: List[Dict[str, Any]], sheet_id: str = DEFAULT_SPREADSHEET_ID) -> Dict[str, Any]:
    """
    Formulates 12 presentation columns and attempts direct sync to GCP Google Sheets via gspread.
    """
    today = datetime.now().strftime("%Y-%m-%d %H:%M")
    candidate_name = candidate_info.get("full_name", "Candidate")
    candidate_email = candidate_info.get("email", "candidate@example.com")
    skills_str = ", ".join(candidate_info.get("skills", ["Software Development"])[:4])

    rows = [PRESENTATION_HEADERS]
    formatted_job_rows = []

    for job in job_listings:
        title = job.get("title", "Software Developer")
        company = job.get("company", "Company")
        location = job.get("location", "Remote")
        match_score = f"{job.get('match_score', 80)}%"
        contact_email = job.get("contact_email", f"careers@{company.lower().replace(' ', '')}.com")
        job_url = job.get("url", "https://google.com")
        
        # Determine Source Platform
        source_platform = "Company ATS Portal"
        if "lever.co" in job_url.lower(): source_platform = "Lever ATS"
        elif "greenhouse.io" in job_url.lower(): source_platform = "Greenhouse ATS"
        elif "workable.com" in job_url.lower(): source_platform = "Workable ATS"
        elif "workday" in job_url.lower(): source_platform = "Workday ATS"
        elif "remoteok" in job_url.lower(): source_platform = "RemoteOK Feed"
        elif "arbeitnow" in job_url.lower(): source_platform = "Arbeitnow Feed"

        ai_eval = f"Matched skills: {skills_str}. Candidate role aligned with {title}."
        
        email_subject = f"Application for {title} - {candidate_name}"
        email_body = (
            f"Dear Hiring Team at {company},\n\n"
            f"I am writing to express my strong enthusiasm for the {title} position listed on {source_platform}. "
            f"With solid technical expertise in {skills_str}, I am confident in adding immediate value to your team.\n\n"
            f"I have attached my updated resume for your review.\n\n"
            f"Best regards,\n{candidate_name}\n"
            f"Email: {candidate_email}"
        )
        status = "Ready for Outreach"

        row_data = [
            today,
            company,
            title,
            source_platform,
            location,
            match_score,
            contact_email,
            job_url,
            ai_eval,
            email_subject,
            email_body,
            status
        ]
        
        rows.append(row_data)
        formatted_job_rows.append(row_data)

    # Format CSV Content
    csv_lines = [",".join([f'"{str(cell).replace(chr(34), chr(34)+chr(34))}"' for cell in row]) for row in rows]
    csv_content = "\n".join(csv_lines)

    # Attempt Direct Sync to Google Sheets via gspread
    client, auth_err = get_gspread_client()
    direct_sync_success = False
    sync_message = ""
    target_sheet_url = f"https://docs.google.com/spreadsheets/d/{sheet_id}/edit"

    if client:
        try:
            doc = client.open_by_key(sheet_id)
            sheet = doc.sheet1
            
            # Check if headers exist
            existing_values = sheet.get_all_values()
            if not existing_values:
                sheet.append_row(PRESENTATION_HEADERS)

            # Append job rows
            for r in formatted_job_rows:
                sheet.append_row(r)
                
            direct_sync_success = True
            sync_message = f"Successfully synced {len(formatted_job_rows)} job listings directly into your Google Sheet!"
        except Exception as e:
            sync_message = f"GCP Direct Sync Note: {str(e)}. Make sure your sheet is shared with: sheet-538@job-email-finder-auto-mail.iam.gserviceaccount.com"
    else:
        sync_message = f"GCP Direct Sync Note: {auth_err}"

    return {
        "direct_sync_success": direct_sync_success,
        "sync_message": sync_message,
        "spreadsheet_id": sheet_id,
        "direct_sheets_url": target_sheet_url,
        "service_account_email": "sheet-538@job-email-finder-auto-mail.iam.gserviceaccount.com",
        "csv_content": csv_content,
        "filename": "Job_Hunt_Master_List.csv",
        "headers": PRESENTATION_HEADERS,
        "row_count": len(job_listings),
        "instructions": (
            f"1. Share your Google Sheet ({target_sheet_url}) with: sheet-538@job-email-finder-auto-mail.iam.gserviceaccount.com as Editor.\n"
            f"2. Or click 'Download CSV' and import it into your sheet via File -> Import.\n"
            f"3. Run your Google Sheets Mail Merge / YAMM extension directly using the pre-formatted Email Subject and Email Body columns."
        )
    }
