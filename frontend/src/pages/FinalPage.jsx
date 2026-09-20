import React, { useState } from 'react';
import { actionsAPI, resumeAPI } from '../services/api';
import ReportModal from '../components/ReportModal';

export default function FinalPage({ profile, targetJobs, onRestart }) {
  const [exporting, setExporting] = useState(false);
  const [sheetsData, setSheetsData] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const SHEET_URL = "https://docs.google.com/spreadsheets/d/13YrBaEiTJZ7LP-ROpFfLzhp2MCPQtBBU5w6PgXdJ7rY/edit?usp=sharing";
  const SERVICE_ACCOUNT_EMAIL = "sheet-538@job-email-finder-auto-mail.iam.gserviceaccount.com";

  const handleExportSheets = async () => {
    setExporting(true);
    try {
      const jobIds = targetJobs.map(j => j.id);
      const res = await actionsAPI.exportSheets(jobIds);
      setSheetsData(res.data);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadCSV = () => {
    if (!sheetsData?.csv_content) return;
    const blob = new Blob([sheetsData.csv_content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', sheetsData.filename || 'Job_Hunt_Master_List.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(SERVICE_ACCOUNT_EMAIL);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleDownloadPDF = async () => {
    try {
      await resumeAPI.downloadReportPDF();
    } catch (err) {
      console.error('PDF download note:', err);
      window.open(resumeAPI.getReportPDFUrl(), '_blank');
    }
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '20px auto', padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
      
      {showReportModal && <ReportModal onClose={() => setShowReportModal(false)} />}

      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: '700' }}>Google Sheets Integration & Pipeline Export</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Direct GCP Sheets sync and automated candidate data export</p>
        </div>
        <button
          onClick={handleDownloadPDF}
          className="btn-primary"
          style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
        >
          Download ATS Audit Report (PDF)
        </button>
      </div>

      {/* Sheet Connection & GCP Setup Card */}
      <div className="glass-panel" style={{ padding: '24px', border: '1px solid rgba(99, 102, 241, 0.4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px' }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--primary)', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '1px' }}>
              Target Google Sheet Connected
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginTop: '4px', color: '#ffffff' }}>
              <a href={SHEET_URL} target="_blank" rel="noopener noreferrer" style={{ color: '#ffffff', textDecoration: 'underline' }}>
                Open Your Live Google Sheet ↗
              </a>
            </h3>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '6px' }}>
              Sheet ID: <code style={{ color: 'var(--accent-cyan)', background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '4px' }}>13YrBaEiTJZ7LP-ROpFfLzhp2MCPQtBBU5w6PgXdJ7rY</code>
            </div>
          </div>

          <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '14px 18px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', maxWidth: '480px' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#34d399', marginBottom: '4px' }}>
              GCP Service Account Setup Instruction:
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
              To enable direct automated row sync into your Google Sheet, click "Share" on your Google Sheet and invite:
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
              <code style={{ fontSize: '0.78rem', color: '#fbbf24', background: 'rgba(0,0,0,0.4)', padding: '4px 8px', borderRadius: '4px', wordBreak: 'break-all' }}>
                {SERVICE_ACCOUNT_EMAIL}
              </code>
              <button onClick={handleCopyEmail} className="btn-secondary" style={{ padding: '4px 10px', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                {copied ? '✓ Copied' : 'Copy Email'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Google Sheets Export Card */}
      <div className="glass-panel" style={{ padding: '28px' }}>
        <div style={{ fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--accent-cyan)', fontWeight: '700', marginBottom: '8px' }}>
          Automated Google Sheets Sync
        </div>
        <h3 style={{ fontSize: '1.3rem', fontWeight: '700', marginBottom: '10px' }}>
          Google Sheets Export & Synchronization
        </h3>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: '1.5', marginBottom: '18px' }}>
          Directly appends matched job listings, company contact emails, AI evaluation scores, and drafted cover letter emails into your connected Google Sheet.
        </p>

        {sheetsData && (
          <div style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginBottom: '18px' }}>
            <div style={{ fontSize: '0.88rem', fontWeight: '600', color: sheetsData.direct_sync_success ? '#34d399' : '#fbbf24', marginBottom: '6px' }}>
              ✓ {sheetsData.sync_message}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Synced Columns: {sheetsData.headers?.join(', ')}
            </div>
          </div>
        )}

        <div>
          {sheetsData ? (
            <div style={{ display: 'flex', gap: '12px' }}>
              <a
                href={sheetsData.direct_sheets_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-green"
                style={{ flex: 1, justifyContent: 'center', textDecoration: 'none' }}
              >
                Open Live Sheet ↗
              </a>
              <button onClick={handleDownloadCSV} className="btn-secondary">
                Download CSV
              </button>
            </div>
          ) : (
            <button
              onClick={handleExportSheets}
              className="btn-primary"
              disabled={exporting}
              style={{ width: '100%', justifyContent: 'center', padding: '14px' }}
            >
              {exporting ? 'Syncing to Google Sheets...' : 'Sync Data to Google Sheets →'}
            </button>
          )}
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h4 style={{ fontSize: '1.05rem', fontWeight: '700' }}>Pipeline Process Complete</h4>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>You can download the consolidated PDF report or run another resume evaluation.</p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={handleDownloadPDF} className="btn-secondary">
            Download PDF Report
          </button>
          <button onClick={onRestart} className="btn-primary">
            Start New Resume Pipeline
          </button>
        </div>
      </div>

    </div>
  );
}
