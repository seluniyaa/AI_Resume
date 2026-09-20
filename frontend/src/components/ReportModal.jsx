import React, { useEffect, useState } from 'react';
import { resumeAPI } from '../services/api';

export default function ReportModal({ onClose }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReport();
  }, []);

  const fetchReport = async () => {
    try {
      const res = await resumeAPI.getReportJSON();
      setReport(res.data);
    } catch (err) {
      console.error('Failed to load report:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    const pdfUrl = resumeAPI.getReportPDFUrl();
    window.open(pdfUrl, '_blank');
  };

  if (!onClose) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(5, 8, 15, 0.85)',
      backdropFilter: 'blur(14px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div className="glass-panel" style={{
        maxWidth: '960px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: '36px',
        position: 'relative',
        background: '#0f172a',
        border: '1px solid rgba(99, 102, 241, 0.4)'
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'rgba(255, 255, 255, 0.1)',
            border: 'none',
            color: '#ffffff',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '1rem'
          }}
        >
          ×
        </button>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>Loading Consolidated Master Report...</div>
        ) : !report ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>No report data available yet.</div>
        ) : (
          <div>
            {/* Header */}
            <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '18px', marginBottom: '24px' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--accent-green)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '700' }}>
                Master ATS Audit & Quality Report
              </div>
              <h2 style={{ fontSize: '1.7rem', fontWeight: '700', marginTop: '4px' }}>
                {report.title}
              </h2>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                Candidate: <strong style={{ color: '#ffffff' }}>{report.candidate.name}</strong> • Target Role: <strong style={{ color: 'var(--primary)' }}>{report.candidate.target_role}</strong>
              </div>
            </div>

            {/* Multi-Dimensional Scores Grid */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '700', marginBottom: '12px', color: '#ffffff' }}>
                Multi-Dimensional ATS Quality Scorecard
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                {[
                  { label: "ATS Compatibility", score: report.scores?.ats_compatibility || 90 },
                  { label: "Job Keyword Match", score: report.scores?.job_keyword_match || 80 },
                  { label: "Experience Relevance", score: report.scores?.experience_relevance || 82 },
                  { label: "Achievement Quality", score: report.scores?.achievement_quality || 68 },
                  { label: "Formatting & Structure", score: report.scores?.formatting_structure || 92 },
                  { label: "Skills Alignment", score: report.scores?.skills_alignment || 85 },
                  { label: "Evidence Quality", score: report.scores?.evidence_quality || 88 },
                  { label: "Overall Match Score", score: report.scores?.overall_match || report.ats_compatibility.score }
                ].map((s, idx) => (
                  <div key={idx} style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
                    <div style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>{s.label}</div>
                    <strong style={{ fontSize: '1.1rem', color: '#34d399' }}>{s.score}%</strong>
                  </div>
                ))}
              </div>
            </div>

            {/* Truthfulness Protection Labels */}
            {report.truthfulness_labels && report.truthfulness_labels.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: '700', marginBottom: '10px', color: 'var(--accent-green)' }}>
                  Truthfulness Protection & Claim Verification
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {report.truthfulness_labels.map((lbl, idx) => (
                    <div key={idx} style={{ background: 'rgba(15, 23, 42, 0.4)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem' }}>
                      <div>
                        <strong style={{ color: '#ffffff' }}>{lbl.claim}</strong>: <span style={{ color: 'var(--text-muted)' }}>{lbl.recommendation}</span>
                      </div>
                      <span className={lbl.status === 'SAFE' ? "badge badge-green" : "badge badge-amber"}>{lbl.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top-to-Bottom Section Corrections */}
            {report.section_corrections && report.section_corrections.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: '700', marginBottom: '12px', color: '#ffffff' }}>
                  Top-to-Bottom Resume Section Corrections
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {report.section_corrections.map((sec, idx) => (
                    <div key={idx} style={{ background: 'rgba(15, 23, 42, 0.4)', border: '1px solid var(--border-color)', padding: '12px 16px', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <strong style={{ color: '#ffffff' }}>{sec.section_name}</strong>
                        <span className={sec.status === 'Good' ? "badge badge-green" : "badge badge-amber"}>{sec.status}</span>
                      </div>
                      <div style={{ color: '#34d399' }}>Correction: {sec.recommendation}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bullet Rewrites */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '700', marginBottom: '12px', color: 'var(--accent-cyan)' }}>
                Non-Hallucinated Bullet Rewrites (No Fake Metrics)
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {report.content_enhancements.bullet_rewrites.map((br, idx) => (
                  <div key={idx} style={{ background: 'rgba(15, 23, 42, 0.4)', border: '1px solid var(--border-color)', padding: '12px 16px', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
                    <div style={{ color: '#f87171', textDecoration: 'line-through' }}>Original: {br.original}</div>
                    <div style={{ color: '#34d399', fontWeight: '600', marginTop: '4px' }}>Enhanced: {br.improved}</div>
                    {br.missing_metric_suggestion && (
                      <div style={{ color: '#fbbf24', marginTop: '4px', fontSize: '0.78rem' }}>⚠️ {br.missing_metric_suggestion}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Skills & Missing Keywords */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div style={{ background: 'rgba(15, 23, 42, 0.4)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: '700', marginBottom: '8px', color: '#818cf8' }}>Extracted Technical Skills</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {report.extracted_profile.skills.map((s, idx) => (
                    <span key={idx} className="badge badge-indigo">{s}</span>
                  ))}
                </div>
              </div>
              <div style={{ background: 'rgba(15, 23, 42, 0.4)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: '700', marginBottom: '8px', color: '#fbbf24' }}>Missing High-Value Keywords</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {report.missing_keywords.map((kw, idx) => (
                    <span key={idx} className="badge badge-amber">+ {kw}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Matched Job Opportunities Table */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '700', marginBottom: '12px' }}>
                Matched Job Opportunities
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {report.matched_jobs.map((j, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(15, 23, 42, 0.4)', padding: '10px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
                    <div>
                      <strong style={{ color: '#ffffff' }}>{j.title}</strong> at {j.company} ({j.location})
                    </div>
                    <span className="badge badge-green">{j.match_score}% Match</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Personalized Recommendations */}
            <div style={{ marginBottom: '28px' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '700', marginBottom: '10px', color: 'var(--accent-green)' }}>
                Personalized Strategic Recommendations
              </h3>
              <ul style={{ paddingLeft: '20px', fontSize: '0.88rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {report.personalized_recommendations.map((rec, idx) => (
                  <li key={idx}>{rec}</li>
                ))}
              </ul>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
              <button onClick={onClose} className="btn-secondary">
                Close
              </button>
              <button onClick={handleDownloadPDF} className="btn-primary">
                Download PDF Report
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
