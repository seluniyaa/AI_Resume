import React, { useState, useEffect } from 'react';
import { resumeAPI } from '../services/api';

export default function UploadPage({ onUploadSuccess, existingResume }) {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [ocrStatus, setOcrStatus] = useState('');
  const [error, setError] = useState('');

  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile) => {
    setError('');
    const ext = selectedFile.name.split('.').pop().toLowerCase();
    const validExts = ['pdf', 'docx', 'txt', 'jpg', 'jpeg', 'png'];

    if (!validExts.includes(ext)) {
      setError(`Unsupported file extension .${ext}. Allowed formats: PDF, DOCX, TXT, JPG, PNG.`);
      setFile(null);
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      const sizeMB = (selectedFile.size / (1024 * 1024)).toFixed(1);
      setError(`File size (${sizeMB} MB) exceeds the 10 MB limit. Please select a file under 10 MB.`);
      setFile(null);
      return;
    }

    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    setProgress(15);
    setOcrStatus('Stage 1/3: Ingesting file & executing OCR text extraction...');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const timer1 = setTimeout(() => {
        setProgress(50);
        setOcrStatus('Stage 2/3: Top-to-bottom resume section analysis & ATS evaluation...');
      }, 1000);

      const timer2 = setTimeout(() => {
        setProgress(85);
        setOcrStatus('Stage 3/3: Synthesizing achievement rewrites & keyword density...');
      }, 2500);

      const res = await resumeAPI.upload(formData);
      clearTimeout(timer1);
      clearTimeout(timer2);
      
      setProgress(100);
      setOcrStatus('Extraction & Section Corrections Complete! Loading Pipeline...');
      
      setTimeout(() => {
        onUploadSuccess(res.data);
      }, 600);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to process resume. Please check file readability or size limits.');
      setLoading(false);
      setProgress(0);
    }
  };

  const handleUseExisting = () => {
    if (existingResume) {
      onUploadSuccess(existingResume);
    }
  };

  return (
    <div style={{ maxWidth: '850px', margin: '30px auto', padding: '0 20px' }}>
      
      {/* Existing Uploaded Resume Card (Avoid re-uploading) */}
      {existingResume && existingResume.filename && (
        <div className="glass-panel" style={{
          padding: '24px',
          marginBottom: '28px',
          border: '1px solid rgba(16, 185, 129, 0.4)',
          background: 'rgba(16, 185, 129, 0.06)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.8rem', color: '#34d399', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '1px' }}>
                Active Uploaded Resume
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginTop: '4px', color: '#ffffff' }}>
                {existingResume.filename}
              </h3>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Candidate: <strong style={{ color: '#ffffff' }}>{existingResume.parsed_profile?.full_name || 'Uploaded Profile'}</strong> • Previous ATS Score: <span className="badge badge-green">{existingResume.ats_score || 80}/100</span>
              </div>
            </div>

            <button
              onClick={handleUseExisting}
              className="btn-green"
              style={{ padding: '12px 24px', fontSize: '0.92rem' }}
            >
              Use Existing Resume →
            </button>
          </div>
        </div>
      )}

      <div className="glass-panel" style={{ padding: '44px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.7rem', fontWeight: '700' }}>
            {existingResume ? 'Upload a New Resume Document' : 'Resume Upload & Multimodal OCR Scanning'}
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', marginTop: '6px' }}>
            Supported Formats: <span className="badge badge-indigo">PDF</span> <span className="badge badge-indigo">DOCX</span> <span className="badge badge-indigo">TXT</span> <span className="badge badge-indigo">JPG</span> <span className="badge badge-indigo">PNG</span>
          </p>
          <div style={{ fontSize: '0.8rem', color: 'var(--accent-green)', marginTop: '6px', fontWeight: '500' }}>
            Maximum File Upload Limit: 10 MB
          </div>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#f87171',
            padding: '14px 18px',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.88rem',
            marginBottom: '24px'
          }}>
            {error}
          </div>
        )}

        {/* Drag & Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={{
            border: isDragging ? '2px dashed var(--primary)' : '2px dashed var(--border-color)',
            background: isDragging ? 'rgba(99, 102, 241, 0.15)' : 'rgba(15, 23, 42, 0.45)',
            borderRadius: 'var(--radius-lg)',
            padding: '54px 20px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.25s ease',
            marginBottom: '28px'
          }}
          onClick={() => document.getElementById('resume-file-input').click()}
        >
          <input
            id="resume-file-input"
            type="file"
            accept=".pdf,.docx,.txt,.jpg,.jpeg,.png"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />

          {file ? (
            <div>
              <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#ffffff' }}>
                Document Selected: {file.name}
              </div>
              <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                {(file.size / 1024).toFixed(1)} KB • Click to change file
              </div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#ffffff' }}>
                Select or drop your resume document here
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                PDF, Word DOCX, Text, JPG, or PNG (Maximum size: 10 MB)
              </div>
            </div>
          )}
        </div>

        {/* Progress Bar replaces generic loading spinner */}
        {loading && (
          <div style={{
            background: 'rgba(15, 23, 42, 0.7)',
            border: '1px solid var(--border-color)',
            padding: '22px',
            borderRadius: 'var(--radius-md)',
            marginBottom: '28px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.85rem' }}>
              <span style={{ color: '#ffffff', fontWeight: '600' }}>{ocrStatus}</span>
              <span style={{ color: 'var(--primary)', fontWeight: '700' }}>{progress}%</span>
            </div>
            
            {/* Animated Progress Bar track */}
            <div style={{
              width: '100%',
              height: '10px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '5px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${progress}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #6366f1 0%, #10b981 100%)',
                borderRadius: '5px',
                transition: 'width 0.4s ease'
              }} />
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={handleUpload}
            disabled={!file || loading}
            className="btn-primary"
            style={{
              padding: '14px 38px',
              fontSize: '1rem',
              opacity: (!file || loading) ? 0.5 : 1,
              cursor: (!file || loading) ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Processing OCR Scan...' : 'Start OCR Scan & AI Analysis →'}
          </button>
        </div>
      </div>
    </div>
  );
}
