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

def generate_google_sheets_export_payload(candidate_info: Dict[str, Any], job_listings: List[Dict[str, Any]], sheet_id: str = DEFAULT_SPREADSHEET_ID, webhook_url: str = "") -> Dict[str, Any]:
    """
    Formulates 12 presentation columns and attempts direct sync to GCP Google Sheets via gspread or Apps Script Webhook.
    """
    today = datetime.now().strftime("%Y-%m-%d %H:%M")
    candidate_name = candidate_info.get("full_name", "Candidate")
    candidate_email = candidate_info.get("email", "candidate@example.com")
    skills_str = ", ".join(candidate_info.get("skills", ["Software Development"])[:4])

    rows = [PRESENTATION_HEADERS]
    formatted_job_rows = []
    jobs_payload = []

    for job in job_listings:
        title = job.get("title", "Software Developer")
        company = job.get("company", "Company")
        location = job.get("location", "Remote")
        match_score = f"{job.get('match_score', 80)}%"
        contact_email = job.get("contact_email", f"careers@{company.lower().replace(' ', '')}.com")
        job_url = job.get("url", "https://google.com")
        
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
            today, company, title, source_platform, location, match_score,
            contact_email, job_url, ai_eval, email_subject, email_body, status
        ]
        
        rows.append(row_data)
        formatted_job_rows.append(row_data)
        
        jobs_payload.append({
            "date_added": today,
            "company": company,
            "title": title,
            "source_platform": source_platform,
            "location": location,
            "match_score": str(job.get('match_score', 80)),
            "contact_email": contact_email,
            "url": job_url,
            "ai_evaluation": ai_eval,
            "email_subject": email_subject,
            "email_body": email_body,
            "status": status
        })

    # Format CSV Content
    csv_lines = [",".join([f'"{str(cell).replace(chr(34), chr(34)+chr(34))}"' for cell in row]) for row in rows]
    csv_content = "\n".join(csv_lines)

    direct_sync_success = False
    sync_message = ""
    target_sheet_url = f"https://docs.google.com/spreadsheets/d/{sheet_id}/edit"

    DEFAULT_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbzzw5GtwmnVKd_kP2CLM3g4efrPiFwvsunHcDF1mv2Qw-yDp_sPyeLuHdySpL-RszOjnQ/exec"
    target_webhook = webhook_url.strip() if webhook_url and webhook_url.strip() else DEFAULT_WEBHOOK_URL

    # Attempt 1: Google Apps Script Webhook Sync
    if target_webhook:
        try:
            import requests
            resp = requests.post(target_webhook, json={"jobs": jobs_payload, "spreadsheet_id": sheet_id}, timeout=10)
            if resp.status_code == 200:
                direct_sync_success = True
                sync_message = f"Successfully automated sync of {len(jobs_payload)} job listings to Google Sheet!"
            else:
                sync_message = f"Webhook response status {resp.status_code}. Attempting direct GCP Cloud sync..."
        except Exception as e:
            sync_message = f"Webhook sync attempt note: {str(e)}"

    # Attempt 2: Direct GCP gspread Sync
    if not direct_sync_success:
        client, auth_err = get_gspread_client()
        if client:
            try:
                doc = client.open_by_key(sheet_id)
                sheet = doc.sheet1

                existing_values = sheet.get_all_values()
                has_valid_header = False
                
                if existing_values and len(existing_values) > 0:
                    first_row = [str(val).strip().upper() for val in existing_values[0]]
                    if any(h in first_row for h in ["COMPANY NAME", "JOB ROLE", "DATE ADDED", "MATCH SCORE (%)"]):
                        has_valid_header = True

                if not has_valid_header:
                    if existing_values and len(existing_values) > 0:
                        sheet.update(range_name='A1:L1', values=[PRESENTATION_HEADERS])
                    else:
                        sheet.append_row(PRESENTATION_HEADERS)

                if formatted_job_rows:
                    sheet.append_rows(formatted_job_rows)
                    
                direct_sync_success = True
                sync_message = f"Successfully synced {len(formatted_job_rows)} job listings directly into your Google Sheet!"
            except Exception as e:
                err_str = str(e)
                sync_message = (
                    "Sync Note: Cloud API sync is unavailable (System clock set to 2026 or permissions restricted). "
                    "Please click 'Download Searched Jobs CSV' below for instant 1-click import into your Google Sheet!"
                )
        else:
            if not sync_message:
                sync_message = (
                    "Sync Note: Cloud API sync is unavailable. "
                    "Please click 'Download Searched Jobs CSV' below for instant 1-click import into your Google Sheet!"
                )

    return {
        "direct_sync_success": direct_sync_success,
        "sync_message": sync_message,
        "spreadsheet_id": sheet_id,
        "direct_sheets_url": target_sheet_url,
        "csv_content": csv_content,
        "filename": "Job_Hunt_Master_List.csv",
        "headers": PRESENTATION_HEADERS,
        "row_count": len(job_listings),
        "instructions": (
            f"1. Click 'Download Searched Jobs CSV' to get your job list file.\n"
            f"2. Open your Google Sheet ({target_sheet_url}), click File -> Import -> Upload tab, and select the CSV file.\n"
            f"3. Run your Google Sheets Mail Merge / YAMM extension directly using the pre-formatted Email Subject and Email Body columns."
        )
    }
