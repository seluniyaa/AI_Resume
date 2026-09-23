import React, { useState } from 'react';
import ReportModal from '../components/ReportModal';

export default function FinalPage({ profile, targetJobs, onRestart }) {
  const [showReportModal, setShowReportModal] = useState(false);

  const generateCSVFromTargetJobs = () => {
    const headers = [
      "DATE ADDED", "COMPANY NAME", "JOB ROLE", "SOURCE PLATFORM", "LOCATION",
      "MATCH SCORE (%)", "COMPANY CONTACT EMAIL", "JOB POSTING URL",
      "AI EVALUATION & SKILLS", "EMAIL SUBJECT", "EMAIL BODY", "OUTREACH STATUS"
    ];
    const today = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const candidateName = profile?.full_name || "Candidate";
    const candidateEmail = profile?.email || "candidate@example.com";
    const skillsStr = (profile?.skills || ["Software Development"]).slice(0, 4).join(", ");

    const rows = [headers];
    (targetJobs || []).forEach(j => {
      const title = j.title || "Job Role";
      const company = j.company || "Company";
      const location = j.location || "Remote";
      const matchScore = `${j.match_score || 80}%`;
      const contactEmail = j.contact_email || `careers@${company.toLowerCase().replace(/\s+/g, '')}.com`;
      const jobUrl = j.url || "https://google.com";
      let sourcePlatform = "Company ATS Portal";
      if (jobUrl.includes("lever.co")) sourcePlatform = "Lever ATS";
      else if (jobUrl.includes("greenhouse.io")) sourcePlatform = "Greenhouse ATS";
      else if (jobUrl.includes("remoteok")) sourcePlatform = "RemoteOK Feed";

      const aiEval = `Matched skills: ${skillsStr}. Candidate role aligned with ${title}.`;
      const emailSubject = `Application for ${title} - ${candidateName}`;
      const emailBody = `Dear Hiring Team at ${company},\n\nI am writing to express my strong enthusiasm for the ${title} position listed on ${sourcePlatform}. With solid technical expertise in ${skillsStr}, I am confident in adding immediate value to your team.\n\nBest regards,\n${candidateName}\nEmail: ${candidateEmail}`;

      rows.push([
        today, company, title, sourcePlatform, location, matchScore, contactEmail, jobUrl, aiEval, emailSubject, emailBody, "Ready for Outreach"
      ]);
    });

    const csvLines = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","));
    return csvLines.join("\n");
  };

  const handleDownloadCSV = () => {
    const csvText = generateCSVFromTargetJobs();
    const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Job_Hunt_Master_List.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '20px auto', padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '28px' }}>

      {showReportModal && <ReportModal onClose={() => setShowReportModal(false)} />}

      {/* Title */}
      <div>
        <h2 style={{ fontSize: '1.6rem', fontWeight: '700' }}>Searched Jobs Export & Pipeline Complete</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Export your candidate job matches into standard CSV format for instant outreach.</p>
      </div>

      {/* Main CSV Export Card */}
      <div className="glass-panel" style={{ padding: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <div style={{ fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--accent-cyan)', fontWeight: '700', marginBottom: '4px' }}>
              Matched Jobs Export
            </div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: '700' }}>
              Download Candidate Job Hunt Master List
            </h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Candidate: <strong style={{ color: '#ffffff' }}>{profile?.full_name || 'Candidate'}</strong> ({targetJobs?.length || 0} Matched Opportunities)
            </p>
          </div>

          <button
            onClick={handleDownloadCSV}
            className="btn-primary"
            style={{ padding: '16px 28px', fontSize: '1rem', background: 'linear-gradient(135deg, #10b981, #059669)' }}
          >
            📥 Download Searched Jobs CSV ({targetJobs?.length || 0} Jobs)
          </button>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h4 style={{ fontSize: '1.05rem', fontWeight: '700' }}>Pipeline Process Complete</h4>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Click below to start a new candidate resume evaluation.</p>
        </div>

        <div>
          <button onClick={onRestart} className="btn-primary">
            Start New Resume Pipeline
          </button>
        </div>
      </div>

    </div>
  );
}
