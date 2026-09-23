import React, { useState, useEffect } from 'react';
import { resumeAPI, jobsAPI } from '../services/api';
import ReportModal from '../components/ReportModal';

export default function PipelinePage({ resumeData, onProceedToFinal }) {
  const [profile, setProfile] = useState(resumeData?.parsed_profile || {
    full_name: '',
    email: '',
    phone: '',
    location: '',
    target_role: 'Full Stack Engineer',
    summary: '',
    skills: [],
    experience: []
  });

  const [atsScore, setAtsScore] = useState(resumeData?.ats_score || 82);
  const [scores, setScores] = useState(resumeData?.scores || {
    ats_compatibility: 90,
    job_keyword_match: 80,
    experience_relevance: 82,
    achievement_quality: 68,
    formatting_structure: 92,
    skills_alignment: 85,
    evidence_quality: 88,
    overall_match: 83
  });

  const [sectionCorrections, setSectionCorrections] = useState(resumeData?.section_corrections || [
    {
      section_name: "1. Header & Contact Information",
      status: "Good",
      observation: "Name, email, and contact details detected.",
      recommendation: "Header contact information, LinkedIn URL, and location parsed cleanly for ATS regional screening."
    },
    {
      section_name: "2. Executive Professional Summary",
      status: "Needs Improvement",
      observation: "Summary is brief.",
      recommendation: "Highlight top 3 core skills and target role title."
    },
    {
      section_name: "3. Work Experience & Achievements",
      status: "Needs Improvement",
      observation: "Bullets describe general duties without metrics.",
      recommendation: "Do NOT invent fake metrics. For bullets lacking numbers, add measurable impact metrics if available."
    },
    {
      section_name: "4. Technical Skills & Keyword Density",
      status: "Good",
      observation: "Core skills detected.",
      recommendation: "Group skills into Required, Preferred, and Related keywords."
    },
    {
      section_name: "5. Education & Chronology Check",
      status: "Good",
      observation: "Education information present.",
      recommendation: "List degree title and completion year clearly."
    }
  ]);

  const [improvements, setImprovements] = useState(resumeData?.ai_improvements || {
    ats_formatting_tips: [],
    bullet_rewrites: [],
    keyword_breakdown: [],
    action_verb_suggestions: []
  });

  const [newSkillInput, setNewSkillInput] = useState('');
  const [showReportModal, setShowReportModal] = useState(false);

  // Advanced Job Search State & Progress Bar
  const [jobs, setJobs] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchProgress, setSearchProgress] = useState(0);
  const [selectedJobIds, setSelectedJobIds] = useState([]);
  
  // Search Filters (Automatically pre-filled from resume location if present)
  const [searchRole, setSearchRole] = useState(profile.target_role || 'Full Stack Engineer');
  const [locationFilter, setLocationFilter] = useState(profile.location || '');
  const [workModeFilter, setWorkModeFilter] = useState('All');
  const [expLevelFilter, setExpLevelFilter] = useState('All');
  const [sortByFilter, setSortByFilter] = useState('match_score');

  useEffect(() => {
    if (profile.location && !locationFilter) {
      setLocationFilter(profile.location);
    }
  }, [profile.location]);

  useEffect(() => {
    handleJobSearch();
  }, []);

  const sanitizeBulletText = (text) => {
    if (!text) return text;
    let clean = text.replace(/,?\s*achieving a 25% improvement in performance and user adoption\.?/gi, '');
    clean = clean.replace(/^Spearheaded\s+(Built|Developed|Engineered|Created|Designed)\b/gi, '$1');
    clean = clean.replace(/^Spearheaded\s+/gi, 'Engineered ');
    return clean;
  };

  const handleAddSkill = () => {
    if (newSkillInput.trim() && !profile.skills.includes(newSkillInput.trim())) {
      const updatedSkills = [...profile.skills, newSkillInput.trim()];
      setProfile({ ...profile, skills: updatedSkills });
      setNewSkillInput('');
    }
  };

  const handleRemoveSkill = (skillToRemove) => {
    const updatedSkills = profile.skills.filter(s => s !== skillToRemove);
    setProfile({ ...profile, skills: updatedSkills });
  };

  const handleDownloadPDF = async () => {
    try {
      if (selectedJobIds && selectedJobIds.length > 0) {
        await jobsAPI.updateAction(selectedJobIds, 'saved');
      }
    } catch (e) {
      console.log('Saved jobs note:', e);
    }
    try {
      await resumeAPI.downloadReportPDF();
    } catch (err) {
      console.error('PDF download note:', err);
      window.open(resumeAPI.getReportPDFUrl(), '_blank');
    }
  };

  const handleJobSearch = async () => {
    setSearchLoading(true);
    setSearchProgress(25);
    try {
      const timer = setTimeout(() => {
        setSearchProgress(75);
      }, 600);

      const res = await jobsAPI.search({
        keywords: profile.skills && profile.skills.length > 0 ? profile.skills : ['Developer'],
        targetRole: searchRole || profile.target_role || 'Full Stack Engineer',
        location: locationFilter || profile.location || '',
        workMode: workModeFilter,
        experienceLevel: expLevelFilter,
        sortBy: sortByFilter
      });
      clearTimeout(timer);
      setSearchProgress(100);

      const fetchedJobs = res.data.jobs || [];
      setJobs(fetchedJobs);
      const relevantJobs = fetchedJobs.filter(j => j.match_score >= 70);
      setSelectedJobIds(relevantJobs.length > 0 ? relevantJobs.map(j => j.id) : fetchedJobs.map(j => j.id));
    } catch (err) {
      console.error('Job search failed:', err);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleRemoveJob = async (jobId) => {
    try {
      await jobsAPI.updateAction([jobId], 'removed');
      setJobs(jobs.filter(j => j.id !== jobId));
      setSelectedJobIds(selectedJobIds.filter(id => id !== jobId));
    } catch (err) {
      setJobs(jobs.filter(j => j.id !== jobId));
    }
  };

  const toggleJobSelection = (jobId) => {
    if (selectedJobIds.includes(jobId)) {
      setSelectedJobIds(selectedJobIds.filter(id => id !== jobId));
    } else {
      setSelectedJobIds([...selectedJobIds, jobId]);
    }
  };

  const handleProceed = async () => {
    const targetJobs = jobs.filter(j => selectedJobIds.includes(j.id));
    if (selectedJobIds.length > 0) {
      try {
        await jobsAPI.updateAction(selectedJobIds, 'saved');
      } catch (err) {
        console.error('Save action note:', err);
      }
    }
    onProceedToFinal(profile, targetJobs);
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '20px auto', padding: '0 20px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
      
      {showReportModal && <ReportModal onClose={() => setShowReportModal(false)} />}

      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: '700' }}>Master ATS Audit & Multi-Dimensional Quality Engine</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>AI-driven resume evaluation, bullet rewrites, and target role matching</p>
        </div>
        <button
          onClick={handleDownloadPDF}
          className="btn-primary"
          disabled={searchLoading}
          style={{
            background: searchLoading ? 'var(--text-muted)' : 'linear-gradient(135deg, #10b981, #059669)',
            cursor: searchLoading ? 'not-allowed' : 'pointer',
            opacity: searchLoading ? 0.6 : 1
          }}
        >
          {searchLoading ? 'Searching Jobs... (PDF Locked)' : 'Download ATS Audit Report (PDF)'}
        </button>
      </div>

      {/* 1. Multi-Dimensional Scorecard (8 Dimensions) */}
      <div className="glass-panel" style={{ padding: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: '700' }}>
              Multi-Dimensional ATS Quality Scorecard
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Explainable evaluation across 8 independent quality dimensions
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '2.2rem', fontWeight: '800', color: '#34d399' }}>
              {scores.overall_match || atsScore}/100
            </span>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Weighted Overall Match</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
          {[
            { label: "ATS Compatibility", score: scores.ats_compatibility || 90, color: "#6366f1" },
            { label: "Job Keyword Match", score: scores.job_keyword_match || 80, color: "#10b981" },
            { label: "Experience Relevance", score: scores.experience_relevance || 82, color: "#ec4899" },
            { label: "Achievement Quality", score: scores.achievement_quality || 68, color: "#f59e0b" },
            { label: "Formatting & Structure", score: scores.formatting_structure || 92, color: "#06b6d4" },
            { label: "Skills Alignment", score: scores.skills_alignment || 85, color: "#8b5cf6" },
            { label: "Evidence Quality", score: scores.evidence_quality || 88, color: "#3b82f6" },
            { label: "Overall Match Score", score: scores.overall_match || atsScore, color: "#10b981" }
          ].map((item, idx) => (
            <div key={idx} style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '14px 18px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.82rem', fontWeight: '600' }}>
                <span style={{ color: 'var(--text-muted)' }}>{item.label}</span>
                <span style={{ color: item.color, fontWeight: '700' }}>{item.score}%</span>
              </div>
              <div style={{ width: '100%', height: '6px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `${item.score}%`, height: '100%', background: item.color, borderRadius: '3px' }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Improvements */}
      <div className="glass-panel" style={{ padding: '28px' }}>
        <div style={{ fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--accent-cyan)', fontWeight: '700', marginBottom: '4px' }}>
          Improvements
        </div>
        <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '16px' }}>
          Improvements
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {improvements.bullet_rewrites && improvements.bullet_rewrites.length > 0 ? (
            improvements.bullet_rewrites.map((br, idx) => (
              <div key={idx} style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '0.82rem', color: '#f87171', marginBottom: '4px' }}>
                  <strong>Original:</strong> {sanitizeBulletText(br.original)}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#34d399', fontWeight: '600', marginBottom: '6px' }}>
                  <strong>Clean Improvement:</strong> {sanitizeBulletText(br.improved)}
                </div>
                {br.missing_metric_suggestion && (
                  <div style={{ fontSize: '0.78rem', color: '#fbbf24', background: 'rgba(245, 158, 11, 0.1)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                    ⚠️ {br.missing_metric_suggestion}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div style={{ fontSize: '0.82rem', color: 'var(--text-dim)' }}>No bullet rewrite suggestions required.</div>
          )}
        </div>
      </div>

      {/* 3. Categorized Keyword Breakdown (Required, Preferred, Related, Missing) */}
      <div className="glass-panel" style={{ padding: '28px' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '6px' }}>
          Target Role Keyword Match ({profile.target_role || 'Full Stack Engineer'})
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '18px' }}>
          Categorized keyword match based on target job description requirements
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
          {improvements.keyword_breakdown && improvements.keyword_breakdown.length > 0 ? (
            improvements.keyword_breakdown.map((kw, idx) => (
              <div
                key={idx}
                style={{
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: kw.status === 'Matched' ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <strong style={{ fontSize: '0.9rem', color: '#ffffff' }}>{kw.keyword}</strong>
                  <span className={kw.status === 'Matched' ? "badge badge-green" : "badge badge-amber"}>
                    {kw.status}
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Category: {kw.category} • Importance: {kw.importance}
                </div>
              </div>
            ))
          ) : (
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Required keywords evaluated cleanly.</div>
          )}
        </div>
      </div>

      {/* 4. Resume Section Corrections */}
      <div className="glass-panel" style={{ padding: '28px' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '4px' }}>
          Resume Section Corrections
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
          Ordered evaluation of resume sections from header to education
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {sectionCorrections.map((sec, idx) => {
            const isGood = sec.status === 'Good';
            return (
              <div
                key={idx}
                style={{
                  background: 'rgba(15, 23, 42, 0.5)',
                  border: isGood ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: 'var(--radius-md)',
                  padding: '16px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '16px'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontWeight: '700', fontSize: '0.98rem', color: '#ffffff' }}>{sec.section_name}</span>
                    <span className={isGood ? "badge badge-green" : "badge badge-amber"}>
                      {isGood ? 'Good' : 'Needs Improvement'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    <strong>Observation:</strong> {sec.observation}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#34d399', marginTop: '4px', fontWeight: '500' }}>
                    <strong>Correction:</strong> {sec.recommendation}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Parsed Data Audit & Inline Editor */}
      <div className="glass-panel" style={{ padding: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '700' }}>
              Audit & Edit Candidate Profile
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Verify parsed skills, location, and contact details before executing job search
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '20px' }}>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Full Name</label>
            <input
              type="text"
              className="input-field"
              value={profile.full_name || ''}
              onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Email Address</label>
            <input
              type="email"
              className="input-field"
              value={profile.email || ''}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Target Role Title</label>
            <input
              type="text"
              className="input-field"
              value={profile.target_role || ''}
              onChange={(e) => {
                setProfile({ ...profile, target_role: e.target.value });
                setSearchRole(e.target.value);
              }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Extracted Location</label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. San Francisco, CA"
              value={profile.location || ''}
              onChange={(e) => {
                setProfile({ ...profile, location: e.target.value });
                setLocationFilter(e.target.value);
              }}
            />
          </div>
        </div>

        <div>
          <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
            Extracted Technical Skills ({profile.skills?.length || 0})
          </label>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
            {profile.skills && profile.skills.map((skill, idx) => (
              <span key={idx} className="badge badge-indigo" style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
                {skill}
                <button
                  onClick={() => handleRemoveSkill(skill)}
                  style={{ background: 'none', border: 'none', color: '#f87171', marginLeft: '6px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '10px', maxWidth: '400px' }}>
            <input
              type="text"
              className="input-field"
              placeholder="Add skill keyword..."
              value={newSkillInput}
              onChange={(e) => setNewSkillInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
            />
            <button onClick={handleAddSkill} className="btn-secondary" style={{ whiteSpace: 'nowrap' }}>
              + Add Skill
            </button>
          </div>
        </div>
      </div>

      {/* 6. Advanced Controlled Job Search (Target Role & Resume Location Driven) */}
      <div className="glass-panel" style={{ padding: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '700' }}>
              Target Role & Location Job Search Engine
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Search ATS portals (Lever, Greenhouse, Workable) based on Target Role Title, Skills, and Location
            </p>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '20px', background: 'rgba(15, 23, 42, 0.6)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
          <div>
            <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Target Role Search Title</label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. Backend Developer, Full Stack..."
              value={searchRole}
              onChange={(e) => setSearchRole(e.target.value)}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              Location / City {profile.location ? '(Extracted from Resume)' : ''}
            </label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. Remote, San Francisco, New York..."
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Work Mode</label>
            <select
              className="input-field"
              value={workModeFilter}
              onChange={(e) => setWorkModeFilter(e.target.value)}
              style={{ cursor: 'pointer' }}
            >
              <option value="All">All Modes</option>
              <option value="Remote">Remote Only</option>
              <option value="Hybrid">Hybrid</option>
              <option value="On-Site">On-Site</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Experience Level</label>
            <select
              className="input-field"
              value={expLevelFilter}
              onChange={(e) => setExpLevelFilter(e.target.value)}
              style={{ cursor: 'pointer' }}
            >
              <option value="All">All Experience Levels</option>
              <option value="Entry">Entry Level / Fresher</option>
              <option value="Mid">Mid Level</option>
              <option value="Senior">Senior / Lead</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
          <button onClick={handleJobSearch} className="btn-primary" disabled={searchLoading} style={{ padding: '12px 32px' }}>
            {searchLoading ? 'Searching ATS Portals...' : 'Execute Location-Based Job Search'}
          </button>
        </div>

        {/* Progress bar during job search */}
        {searchLoading && (
          <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid var(--border-color)', padding: '18px', borderRadius: 'var(--radius-md)', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.85rem' }}>
              <span style={{ color: '#ffffff', fontWeight: '600' }}>Searching live job feeds...</span>
              <span style={{ color: 'var(--primary)', fontWeight: '700' }}>{searchProgress}%</span>
            </div>
            <div style={{ width: '100%', height: '8px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${searchProgress}%`, height: '100%', background: 'linear-gradient(90deg, #6366f1, #10b981)', borderRadius: '4px', transition: 'width 0.3s ease' }} />
            </div>
          </div>
        )}

        {/* Jobs List */}
        {!searchLoading && jobs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            No job listings found matching these criteria.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {jobs.map((job) => {
              const isSelected = selectedJobIds.includes(job.id);
              return (
                <div
                  key={job.id}
                  style={{
                    background: isSelected ? 'rgba(99, 102, 241, 0.12)' : 'rgba(15, 23, 42, 0.5)',
                    border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    padding: '18px 24px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', flex: 1 }}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleJobSelection(job.id)}
                      style={{ width: '18px', height: '18px', marginTop: '4px', cursor: 'pointer' }}
                    />
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <h4 style={{ fontSize: '1.05rem', fontWeight: '700' }}>{job.title}</h4>
                        <span className="badge badge-green">{job.match_score}% Match</span>
                      </div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Company: {job.company} • Location: {job.location} • Contact: {job.contact_email}
                      </div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginTop: '6px' }}>
                        {job.description}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: '16px' }}>
                    <a
                      href={job.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '0.8rem', textDecoration: 'none' }}
                    >
                      View Posting
                    </a>
                    <button
                      onClick={() => handleRemoveJob(job.id)}
                      className="btn-danger"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{
          marginTop: '28px',
          paddingTop: '20px',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Selected Target Jobs: <strong style={{ color: '#ffffff' }}>{selectedJobIds.length}</strong> of {jobs.length}
          </div>
          <button
            onClick={handleProceed}
            className="btn-primary"
            disabled={selectedJobIds.length === 0}
            style={{ opacity: selectedJobIds.length === 0 ? 0.5 : 1, padding: '14px 32px' }}
          >
            Proceed to Export & Sync →
          </button>
        </div>

      </div>

    </div>
  );
}
