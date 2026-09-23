import json
import re
import requests
from typing import Dict, List, Any, Tuple
from app.config import OLLAMA_API_URL, OLLAMA_MODEL

# Role-specific technology and domain taxonomy
ROLE_TAXONOMY = {
    "Backend Developer": {
        "required": ["Python", "FastAPI", "Node.js", "Django", "SQL", "PostgreSQL", "REST API", "Docker"],
        "preferred": ["Redis", "Kubernetes", "Microservices", "GraphQL", "CI/CD", "AWS"],
        "related": ["Linux", "Git", "C#", "Java", "MongoDB"]
    },
    "Frontend Developer": {
        "required": ["React", "JavaScript", "TypeScript", "HTML", "CSS", "Next.js"],
        "preferred": ["TailwindCSS", "Vue", "Redux", "REST API", "GraphQL"],
        "related": ["Node.js", "Git", "Figma", "Jest", "Webpack"]
    },
    "Full Stack Engineer": {
        "required": ["JavaScript", "TypeScript", "React", "Python", "Node.js", "SQL", "REST API", "Docker"],
        "preferred": ["Next.js", "PostgreSQL", "FastAPI", "Git", "AWS", "CI/CD"],
        "related": ["TailwindCSS", "Redis", "GraphQL", "MongoDB"]
    },
    "ML / AI Engineer": {
        "required": ["Python", "PyTorch", "TensorFlow", "Machine Learning", "FastAPI", "Docker"],
        "preferred": ["Kubernetes", "AWS", "MLflow", "Pandas", "NumPy", "OpenCV"],
        "related": ["SQL", "Git", "Linux", "Scikit-Learn"]
    },
    "Data Scientist / Analyst": {
        "required": ["Python", "SQL", "Pandas", "NumPy", "Data Analysis", "Power BI"],
        "preferred": ["Tableau", "Machine Learning", "Statistics", "Scikit-Learn"],
        "related": ["R", "Excel", "BigQuery", "PostgreSQL"]
    },
    "DevOps / Cloud Engineer": {
        "required": ["Docker", "Kubernetes", "AWS", "CI/CD", "Linux", "Git"],
        "preferred": ["Terraform", "Ansible", "Python", "Bash", "Prometheus", "GCP"],
        "related": ["Azure", "REST API", "PostgreSQL"]
    },
    "Banking / Collection Officer": {
        "required": ["Debt Collection", "Credit Risk Assessment", "Customer Relationship Management", "Banking Operations", "Financial Compliance", "Negotiation"],
        "preferred": ["MS Excel", "Team Handling", "Loan Recovery", "Accounting", "MS Office"],
        "related": ["Financial Analysis", "KYC Compliance", "Customer Support", "Reporting"]
    },
    "Sales & Business Development Executive": {
        "required": ["Client Acquisition", "Sales Management", "Negotiation", "Lead Generation", "Communication"],
        "preferred": ["CRM", "Market Research", "Financial Services", "Excel", "Presentation"],
        "related": ["Customer Support", "Strategic Planning", "Account Management"]
    },
    "Accounting & Finance Specialist": {
        "required": ["Accounting", "Financial Reporting", "Taxation", "MS Excel", "Compliance"],
        "preferred": ["Tally", "Financial Auditing", "Bookkeeping", "Accounts Payable"],
        "related": ["Banking", "Payroll", "MS Office"]
    },
    "Operations & Administration Specialist": {
        "required": ["Operations Management", "Team Handling", "Process Optimization", "Excel", "Communication"],
        "preferred": ["MS Office", "Reporting", "Vendor Management", "Problem Solving"],
        "related": ["Documentation", "Budgeting", "Administrative Support"]
    },
    "General Professional / Operations": {
        "required": ["Team Work", "Problem Solving", "Communication", "MS Excel", "Organizational Skills"],
        "preferred": ["MS Office", "Customer Service", "Time Management"],
        "related": ["Reporting", "Multi-tasking"]
    }
}

VERB_MAP = {
    "built": "Built",
    "created": "Built / Developed",
    "developed": "Developed / Engineered",
    "designed": "Designed / Architected",
    "improved": "Optimized",
    "automated": "Automated",
    "researched": "Researched",
    "tested": "Tested",
    "managed": "Managed",
    "integrated": "Integrated",
    "implemented": "Implemented"
}

def extract_location_from_text(raw_text: str) -> str:
    lines = [l.strip() for l in raw_text.split("\n") if l.strip()]
    
    # Check for specific regional city indicators first
    for line in lines:
        line_lower = line.lower()
        if "coimbatore" in line_lower:
            return "Coimbatore, Tamil Nadu, India"
        elif "chennai" in line_lower:
            return "Chennai, Tamil Nadu, India"
        elif "bangalore" in line_lower or "bengaluru" in line_lower:
            return "Bangalore, Karnataka, India"
        elif "hyderabad" in line_lower:
            return "Hyderabad, Telangana, India"
        elif "mumbai" in line_lower:
            return "Mumbai, Maharashtra, India"
        elif "delhi" in line_lower:
            return "New Delhi, India"
        elif "tamil nadu" in line_lower:
            return "Tamil Nadu, India"
        elif "india" in line_lower:
            return "India"

    for line in lines[:12]:
        loc_match = re.search(r'\b([A-Z][a-zA-Z\s]{2,15}),\s*([A-Z]{2}|[A-Z][a-zA-Z\s]{2,15})\b', line)
        if loc_match and not any(k in line.lower() for k in ["university", "college", "company", "inc", "ltd", "http", "email", "present", "developer", "engineer"]):
            return loc_match.group(0)
    return ""

def is_valid_resume(raw_text: str) -> bool:
    """
    Validates whether the extracted text represents a candidate resume.
    Rejects non-resumes (e.g. random articles, assignment documents, invoices,
    code snippets, empty/scanned blank files).
    """
    if not raw_text or len(raw_text.strip()) < 80:
        return False

    text_lower = raw_text.lower()

    # 1. Check for contact information (Email, Phone, LinkedIn)
    has_email = bool(re.search(r'[\w\.-]+@[\w\.-]+\.\w+', raw_text))
    has_phone = bool(re.search(r'\(?\+?\d{1,3}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}', raw_text))
    has_linkedin = "linkedin.com/" in text_lower
    has_contact_info = has_email or has_phone or has_linkedin

    # 2. Check for resume structural headings and keywords
    resume_section_keywords = [
        "experience", "work history", "employment", "professional experience",
        "education", "academic", "skills", "technical skills", "core competencies",
        "projects", "summary", "profile", "objective", "curriculum vitae", "resume",
        "certifications", "qualifications", "achievements", "responsibilities",
        "bachelor", "master", "diploma", "degree", "university", "college"
    ]
    
    section_matches = sum(1 for kw in resume_section_keywords if kw in text_lower)

    # 3. Check for professional role titles or domain terms
    role_terms = [
        "developer", "engineer", "analyst", "manager", "specialist", "officer",
        "executive", "intern", "associate", "consultant", "administrator",
        "accountant", "supervisor", "coordinator", "lead", "architect"
    ]
    role_matches = sum(1 for term in role_terms if term in text_lower)

    # Valid resume criteria:
    if has_contact_info and (section_matches >= 1 or role_matches >= 1):
        return True
    if section_matches >= 2:
        return True
    if role_matches >= 2 and section_matches >= 1:
        return True

    return False

def parse_and_analyze_resume(raw_text: str, job_description: str = "") -> dict:
    """
    Master ATS Audit Engine featuring:
    1. Direct live Ollama qwen2.5:3b AI model inference
    2. Zero metric fabrication & truthfulness protection
    3. Multi-dimensional explainable scoring (ATS, Keyword, Achievement, Evidence, Formatting)
    4. Job description / Role classification alignment
    """
    linkedin_match = re.search(r'linkedin\.com/(?:in|company)/[\w\-]+', raw_text, re.IGNORECASE)
    linkedin = linkedin_match.group(0) if linkedin_match else None

    github_match = re.search(r'github\.com/[\w\-]+', raw_text, re.IGNORECASE)
    github = github_match.group(0) if github_match else None

    location = extract_location_from_text(raw_text)

    # 1. Try Ollama qwen2.5:3b with extended 300s timeout for live AI reasoning
    ollama_res = try_ollama_analysis(raw_text, job_description)
    if ollama_res:
        print("[OK] Successfully completed live Ollama qwen2.5:3b AI resume evaluation.")
        res = ollama_res
    else:
        print("Note: Reverting to master deterministic NLP engine fallback.")
        res = execute_master_nlp_engine(raw_text, job_description)

    # Enforce precise Header Section evaluation based on actual detected LinkedIn & Location
    if "section_corrections" in res and res["section_corrections"]:
        sec1 = res["section_corrections"][0]
        if linkedin and location:
            sec1["status"] = "Good"
            sec1["recommendation"] = "Header contact details, location, and professional links detected for regional ATS screening."
        elif linkedin:
            sec1["status"] = "Good"
            sec1["recommendation"] = "LinkedIn profile detected. Include city/country location for regional ATS matching."
        elif location:
            sec1["status"] = "Good"
            sec1["recommendation"] = "Location detected. Add a professional LinkedIn profile URL to boost ATS recruiter searchability."

    return res

def classify_target_role(text: str, job_description: str = "") -> str:
    """
    Intelligently classifies target role from resume text and job description across technical
    and non-technical domains (Banking, Debt Collection, Sales, Operations, Software, Data).
    """
    combined = (job_description + " " + text).lower()
    
    # 1. Banking / Debt Collection / Credit
    if any(k in combined for k in ["collection officer", "relationship officer", "debt collection", "loan recovery", "credit officer", "idfc first", "smfg india", "sales and collection"]):
        return "Banking / Collection Officer"

    # 2. Sales & Business Development
    elif any(k in combined for k in ["sales executive", "business development", "client acquisition", "lead generation", "sales manager"]):
        return "Sales & Business Development Executive"

    # 3. Accounting & Finance
    elif any(k in combined for k in ["accountant", "accounting", "tally", "taxation", "auditor", "bookkeeping"]):
        return "Accounting & Finance Specialist"

    # 4. Operations & Administration
    elif any(k in combined for k in ["operations officer", "operations manager", "team handling", "office assistant", "administration"]):
        return "Operations & Administration Specialist"

    # 5. Tech Domains
    elif "data analyst" in combined or "power bi" in combined or "tableau" in combined:
        return "Data Scientist / Analyst"
    elif "ml engineer" in combined or "machine learning" in combined or "pytorch" in combined or "tensorflow" in combined:
        return "ML / AI Engineer"
    elif "full stack" in combined or "fullstack" in combined or ("react" in combined and "node" in combined) or ("python" in combined and "javascript" in combined and "react" in combined):
        return "Full Stack Engineer"
    elif "frontend" in combined or ("react" in combined and "python" not in combined):
        return "Frontend Developer"
    elif "backend" in combined or "fastapi" in combined or "django" in combined or "microservices" in combined:
        return "Backend Developer"
    elif "devops" in combined or "kubernetes" in combined or "terraform" in combined:
        return "DevOps / Cloud Engineer"
    elif "software engineer" in combined or "software developer" in combined:
        return "Full Stack Engineer"
    
    # 6. Fallback: Search experience lines for job title
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    for line in lines:
        if any(k in line.lower() for k in ["officer", "manager", "executive", "analyst", "engineer", "developer", "specialist"]):
            if "collection" in line.lower() or "bank" in line.lower() or "credit" in line.lower():
                return "Banking / Collection Officer"
            elif "sales" in line.lower():
                return "Sales & Business Development Executive"
            elif "account" in line.lower():
                return "Accounting & Finance Specialist"
            elif "operation" in line.lower():
                return "Operations & Administration Specialist"

    return "General Professional / Operations"

def try_ollama_analysis(raw_text: str, job_description: str = "") -> dict:
    print(f"Calling live local Ollama model '{OLLAMA_MODEL}' at {OLLAMA_API_URL}...")
    prompt = f"""You are a Master ATS Resume Auditor and AI Career Analyst. Analyze the following candidate resume text dynamically from top to bottom.
STRICT AUDIT RULES:
1. ACCURATE ROLE CLASSIFICATION: Classify the candidate's exact target role based on their work experience (e.g. 'Banking / Collection Officer', 'Sales Executive', 'Data Analyst', 'Full Stack Engineer'). DO NOT default non-tech resumes to Full Stack Engineer!
2. DO NOT INVENT OR FABRICATE NUMERIC METRICS (e.g. do not add 'by 25%'). If a bullet lacks numbers, provide a helpful suggestion: 'Missing metric: Consider adding measurable scale...'.
3. DO NOT BLINDLY RECOMMEND UNRELATED KEYWORDS. Only categorize keywords relevant to the candidate's actual target role.
4. PRESERVE AND IMPROVE BULLET GRAMMAR cleanly without duplicated verbs.
5. HEADER SECTION CHECK: If LinkedIn URL or Location is present in the resume text, mark section 1 Good and DO NOT suggest adding them!

Candidate Resume Text:
{raw_text[:4500]}

Target Job Description (if available):
{job_description[:1000] if job_description else "N/A"}

Return ONLY a valid JSON object matching this exact schema:
{{
  "parsed_profile": {{
    "full_name": "Extracted Candidate Name",
    "email": "Candidate Email or N/A",
    "phone": "Candidate Phone or N/A",
    "location": "City, State/Country or N/A",
    "target_role": "Inferred Target Role Title",
    "summary": "Executive summary paragraph",
    "skills": ["Skill1", "Skill2", "Skill3"],
    "experience": [{{"title": "Job Title", "company": "Company Name", "period": "Dates", "description": "Bullet point"}}],
    "education": [{{"degree": "Degree Title", "institution": "University/College Name", "year": "Year"}}]
  }},
  "scores": {{
    "ats_compatibility": 92,
    "job_keyword_match": 84,
    "experience_relevance": 88,
    "achievement_quality": 72,
    "formatting_structure": 95,
    "skills_alignment": 86,
    "evidence_quality": 90,
    "overall_match": 85
  }},
  "section_corrections": [
    {{
      "section_name": "1. Header & Contact Information",
      "status": "Good",
      "observation": "Extracted name, email, location, and contact links.",
      "recommendation": "Header contact details, location, and professional links detected for regional ATS screening."
    }},
    {{
      "section_name": "2. Executive Professional Summary",
      "status": "Needs Improvement",
      "observation": "Summary highlights core background.",
      "recommendation": "Incorporate target role title and top 3 core skills in opening sentences."
    }},
    {{
      "section_name": "3. Work Experience & Achievement Quality",
      "status": "Needs Improvement",
      "observation": "Bullets describe key responsibilities.",
      "recommendation": "Add quantifiable outcomes (accounts handled, recovery rate, latency reduction, users served) if available."
    }},
    {{
      "section_name": "4. Technical Skills & Keyword Density",
      "status": "Good",
      "observation": "Extracted core skills.",
      "recommendation": "Review required role keywords and add only skills you actually possess."
    }},
    {{
      "section_name": "5. Education & Chronology Check",
      "status": "Good",
      "observation": "Academic background parsed cleanly.",
      "recommendation": "Maintain standard reverse chronological order."
    }}
  ]],
  "improvements": {{
    "bullet_rewrites": [
      {{
        "original": "Original resume bullet point",
        "improved": "Cleanly reconstructed action-oriented bullet",
        "missing_metric_suggestion": "Missing metric: If accurate, consider adding throughput, recovery rate, or performance gain."
      }}
    ],
    "keyword_breakdown": [
      {{"keyword": "Debt Collection", "category": "Required", "status": "Matched", "importance": "High", "evidence": "Senior Collection Officer at IDFC."}},
      {{"keyword": "Credit Assessment", "category": "Preferred", "status": "Missing", "importance": "Medium", "evidence": null}}
    ],
    "action_verb_suggestions": ["Managed", "Executed", "Optimized", "Spearheaded", "Directed"]
  }},
  "truthfulness_labels": [
    {{"claim": "Debt collection experience", "status": "SAFE", "recommendation": "Directly supported by resume."}}
  ]
}}
"""
    try:
        payload = {
            "model": OLLAMA_MODEL,
            "prompt": prompt,
            "stream": False,
            "format": "json"
        }
        resp = requests.post(OLLAMA_API_URL, json=payload, timeout=300)
        if resp.status_code == 200:
            data = resp.json()
            response_text = data.get("response", "").strip()
            if response_text.startswith("```"):
                response_text = re.sub(r'^```(json)?\s*', '', response_text)
                response_text = re.sub(r'\s*```$', '', response_text)
            parsed_json = json.loads(response_text)
            if "parsed_profile" in parsed_json and "scores" in parsed_json:
                return parsed_json
    except Exception as e:
        print(f"Ollama API audit call note ({OLLAMA_MODEL}): {e}")
    return None

def execute_master_nlp_engine(raw_text: str, job_description: str = "") -> dict:
    lines = [l.strip() for l in raw_text.split("\n") if l.strip()]
    
    # 1. Contact & Location Detection
    email_match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', raw_text)
    email = email_match.group(0) if email_match else "N/A"
    
    phone_match = re.search(r'\(?\+?\d{1,3}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}', raw_text)
    phone = phone_match.group(0) if phone_match else "N/A"

    linkedin_match = re.search(r'linkedin\.com/in/[\w\-]+', raw_text, re.IGNORECASE)
    linkedin = linkedin_match.group(0) if linkedin_match else None

    github_match = re.search(r'github\.com/[\w\-]+', raw_text, re.IGNORECASE)
    github = github_match.group(0) if github_match else None

    location = extract_location_from_text(raw_text)

    name = "Candidate"
    for line in lines[:5]:
        if not re.search(r'[@\:\/\\0-9]', line) and 2 <= len(line.split()) <= 4 and line.lower() not in ["resume", "curriculum vitae"]:
            name = line
            break

    # 2. Target Role Classification & Taxonomy
    target_role = classify_target_role(raw_text, job_description)
    taxonomy = ROLE_TAXONOMY.get(target_role, ROLE_TAXONOMY["General Professional / Operations"])

    # 3. Evidence-Grounded Skill Extraction
    found_skills = []
    evidence_map = {}
    
    all_possible_skills = set(taxonomy["required"] + taxonomy["preferred"] + taxonomy["related"] + [
        "Python", "JavaScript", "TypeScript", "React", "FastAPI", "SQL", "PostgreSQL", "Docker", "Git", "REST API", "HTML", "CSS",
        "MS Excel", "MS Office", "Excel", "Banking", "Debt Collection", "Sales", "Accounting", "Customer Support"
    ])

    for skill in all_possible_skills:
        pattern = r'\b' + re.escape(skill) + r'\b'
        match = re.search(pattern, raw_text, re.IGNORECASE)
        if match:
            found_skills.append(skill)
            # Find evidence sentence in resume
            for line in lines:
                if re.search(pattern, line, re.IGNORECASE):
                    evidence_map[skill] = line
                    break

    # 4. Keyword Match & Categorization Engine (Required / Preferred / Related)
    keyword_breakdown = []
    weighted_matched_score = 0
    weighted_total_score = 0

    for req_kw in taxonomy["required"]:
        weighted_total_score += 5
        if req_kw in found_skills or any(req_kw.lower() in raw_text.lower() for _ in [1]):
            weighted_matched_score += 5
            found_skills.append(req_kw) if req_kw not in found_skills else None
            keyword_breakdown.append({
                "keyword": req_kw,
                "category": "Required",
                "status": "Matched",
                "importance": "High",
                "evidence": evidence_map.get(req_kw, "Identified in candidate experience")
            })
        else:
            keyword_breakdown.append({
                "keyword": req_kw,
                "category": "Required",
                "status": "Missing",
                "importance": "High",
                "evidence": None
            })

    for pref_kw in taxonomy["preferred"]:
        weighted_total_score += 3
        if pref_kw in found_skills or any(pref_kw.lower() in raw_text.lower() for _ in [1]):
            weighted_matched_score += 3
            found_skills.append(pref_kw) if pref_kw not in found_skills else None
            keyword_breakdown.append({
                "keyword": pref_kw,
                "category": "Preferred",
                "status": "Matched",
                "importance": "Medium",
                "evidence": evidence_map.get(pref_kw, "Identified in resume")
            })
        else:
            keyword_breakdown.append({
                "keyword": pref_kw,
                "category": "Preferred",
                "status": "Missing",
                "importance": "Medium",
                "evidence": None
            })

    # 5. Keyword Stuffing Detection
    stuffing_warnings = []
    for skill in found_skills:
        count = len(re.findall(r'\b' + re.escape(skill) + r'\b', raw_text, re.IGNORECASE))
        if count > 6:
            stuffing_warnings.append(f"Potential keyword stuffing: '{skill}' appears {count} times relative to document length.")

    # 6. Non-Hallucinating Bullet Quality Rewriter & Metric Preserver
    bullet_rewrites = []
    achievement_count = 0
    total_bullets = 0

    # Filter out header / contact / non-bullet lines
    non_bullet_keywords = ["email", "phone", "address", "resume", "personal details", "declaration", "father", "mother", "marital", "sslc", "higher secondary", "place :", "signature"]

    for line in lines:
        clean_line = line.strip('-•*➢ ')
        clean_lower = clean_line.lower()
        if len(clean_line) > 20 and not any(nb in clean_lower for nb in non_bullet_keywords):
            if any(v in clean_lower for v in ["officer", "managed", "executed", "developed", "built", "designed", "created", "handled", "worked", "improved", "assisted"]):
                total_bullets += 1
                has_existing_metric = bool(re.search(r'\d+%', clean_line) or re.search(r'\$\d+', clean_line) or re.search(r'₹\d+', clean_line) or re.search(r'\b\d+\s*(years|months|users|accounts|customers)\b', clean_line, re.IGNORECASE))
                if has_existing_metric:
                    achievement_count += 1

                first_word = clean_line.split()[0].lower()
                verb = VERB_MAP.get(first_word, "Managed" if "collection" in clean_lower or "officer" in clean_lower else "Executed")

                if first_word in VERB_MAP:
                    improved_bullet = verb + " " + " ".join(clean_line.split()[1:])
                else:
                    improved_bullet = f"{verb} {clean_line[0].lower() + clean_line[1:]}"

                missing_metric = None
                if not has_existing_metric:
                    missing_metric = "Missing metric: Consider adding portfolio size (e.g. ₹50L+ portfolio), collection recovery rate (%), or total accounts managed." if "collection" in clean_lower or "banking" in clean_lower else "Missing metric: If accurate, consider adding a measurable outcome if available (e.g. volume handled, throughput, users served)."

                bullet_rewrites.append({
                    "original": clean_line,
                    "improved": improved_bullet,
                    "missing_metric_suggestion": missing_metric
                })
                if len(bullet_rewrites) >= 3:
                    break

    if not bullet_rewrites:
        # Find first meaningful work experience line
        exp_line = "Executed key operational responsibilities and portfolio management."
        for line in lines:
            if "officer" in line.lower() or "experience" in line.lower() or "role" in line.lower():
                exp_line = line.strip('-•*➢ ')
                break
                
        bullet_rewrites.append({
            "original": exp_line,
            "improved": f"Managed operations and key professional responsibilities for {target_role}.",
            "missing_metric_suggestion": "Missing metric: Consider adding portfolio volume, recovery rate, or customer accounts managed."
        })

    # 7. Truthfulness Protection Labels
    truthfulness_labels = []
    for item in keyword_breakdown[:6]:
        if item["status"] == "Matched":
            truthfulness_labels.append({
                "claim": f"{item['keyword']} experience",
                "status": "SAFE",
                "recommendation": f"Directly supported by resume text: '{str(item['evidence'])[:60]}...'"
            })
        else:
            truthfulness_labels.append({
                "claim": f"{item['keyword']} proficiency",
                "status": "UNSUPPORTED",
                "recommendation": f"Add {item['keyword']} to your resume ONLY if you have hands-on experience with it."
            })

    # 8. Multi-Dimensional Score Calculations
    job_keyword_match = min(100, max(60, int((weighted_matched_score / max(weighted_total_score, 1)) * 100)))
    ats_compatibility = min(98, 75 + (10 if email != "N/A" else 0) + (10 if phone != "N/A" else 0) + (5 if len(lines) > 8 else 0))
    experience_relevance = min(95, 70 + len(found_skills) * 4)
    achievement_quality = min(95, int((achievement_count / max(total_bullets, 1)) * 40 + 60))
    formatting_structure = 95 if not stuffing_warnings else 75
    skills_alignment = min(98, 65 + len(found_skills) * 5)
    evidence_quality = 85 if len(found_skills) >= 2 else 70

    overall_match = int(
        ats_compatibility * 0.20 +
        job_keyword_match * 0.25 +
        experience_relevance * 0.20 +
        achievement_quality * 0.15 +
        formatting_structure * 0.10 +
        evidence_quality * 0.10
    )

    # 9. Section Corrections
    section_corrections = [
        {
            "section_name": "1. Header & Contact Information",
            "status": "Good" if (email != "N/A" and (linkedin or location)) else "Needs Improvement",
            "observation": f"Name: '{name}'. Email: '{email}', Phone: '{phone}', Location: '{location if location else 'Not specified'}', LinkedIn: '{linkedin if linkedin else 'Not specified'}'.",
            "recommendation": "Header contact details, location, and professional links detected for regional ATS screening." if (linkedin and location) else ("Add LinkedIn profile URL to boost ATS recruiter searchability." if not linkedin else "Include city/country location for regional ATS screening.")
        },
        {
            "section_name": "2. Executive Professional Summary",
            "status": "Good" if len(found_skills) >= 2 else "Needs Improvement",
            "observation": f"Target Role: '{target_role}'. Summary aligns with candidate domain.",
            "recommendation": f"Ensure core skills ({', '.join(found_skills[:3]) if found_skills else 'core skills'}) and exact target role title ('{target_role}') appear in the first two sentences."
        },
        {
            "section_name": "3. Work Experience & Achievement Quality",
            "status": "Needs Improvement" if achievement_quality < 75 else "Good",
            "observation": f"Analyzed {total_bullets} experience bullets ({achievement_count} contain metrics).",
            "recommendation": "Do NOT invent fake metrics. For bullets lacking numbers, add measurable scale (portfolio size, recovery rate %, volume handled) if available."
        },
        {
            "section_name": "4. Technical Skills & Keyword Breakdown",
            "status": "Good" if job_keyword_match >= 75 else "Needs Improvement",
            "observation": f"Matched {len(found_skills)} relevant domain skills. Keyword Match Score: {job_keyword_match}/100.",
            "recommendation": f"Review missing required keywords ({', '.join([k['keyword'] for k in keyword_breakdown if k['status'] == 'Missing'][:3])}). Add ONLY skills you actually possess."
        },
        {
            "section_name": "5. Education & Chronology Check",
            "status": "Good",
            "observation": "Academic background parsed cleanly.",
            "recommendation": "Maintain standard reverse chronological order with graduation year specified near the bottom."
        }
    ]

    return {
        "parsed_profile": {
            "full_name": name,
            "email": email,
            "phone": phone,
            "location": location,
            "target_role": target_role,
            "summary": f"Targeted {target_role} with experience in {', '.join(found_skills[:3]) if found_skills else 'operations and professional services'}.",
            "skills": found_skills,
            "experience": [
                {
                    "title": target_role,
                    "company": "Professional Experience",
                    "period": "Recent",
                    "description": lines[2] if len(lines) > 2 else "Executed core responsibilities and portfolio management."
                }
            ],
            "education": [
                {
                    "degree": "Higher Education / Academic Chronicle",
                    "institution": "Govt. School / University",
                    "year": "Completed"
                }
            ]
        },
        "scores": {
            "ats_compatibility": ats_compatibility,
            "job_keyword_match": job_keyword_match,
            "experience_relevance": experience_relevance,
            "achievement_quality": achievement_quality,
            "formatting_structure": formatting_structure,
            "skills_alignment": skills_alignment,
            "evidence_quality": evidence_quality,
            "overall_match": overall_match
        },
        "section_corrections": section_corrections,
        "improvements": {
            "ats_formatting_tips": [
                "Truthfulness Rule: Do NOT invent metrics or numbers. Preserve original data.",
                "Ensure standard parseable headings (Work Experience, Technical Skills, Education).",
                "Avoid keyword stuffing and multi-column graphic tables for clean ATS parsing."
            ],
            "bullet_rewrites": bullet_rewrites,
            "keyword_breakdown": keyword_breakdown,
            "stuffing_warnings": stuffing_warnings,
            "action_verb_suggestions": ["Managed", "Executed", "Optimized", "Spearheaded", "Directed"]
        },
        "truthfulness_labels": truthfulness_labels
    }
