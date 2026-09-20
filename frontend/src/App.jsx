import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Stepper from './components/Stepper';
import AuthPage from './pages/AuthPage';
import UploadPage from './pages/UploadPage';
import PipelinePage from './pages/PipelinePage';
import FinalPage from './pages/FinalPage';
import { authAPI, resumeAPI } from './services/api';

export default function App() {
  const [activeStep, setActiveStep] = useState(1);
  const [user, setUser] = useState(null);
  const [resumeData, setResumeData] = useState(null);
  const [existingResume, setExistingResume] = useState(null);
  const [profile, setProfile] = useState(null);
  const [targetJobs, setTargetJobs] = useState([]);
  const [initLoading, setInitLoading] = useState(true);

  // Lock browser history back button to prevent navigating backward
  useEffect(() => {
    window.history.pushState(null, "", window.location.href);
    const handlePopState = (e) => {
      window.history.pushState(null, "", window.location.href);
    };
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Restore session & existing resume on mount
  useEffect(() => {
    checkUserSession();
  }, []);

  const checkUserSession = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const userRes = await authAPI.getMe();
        if (userRes.data?.user) {
          setUser(userRes.data.user);
          setActiveStep(2);
          
          // Fetch existing uploaded resume to avoid re-uploading
          const resumeRes = await resumeAPI.getLatest();
          if (resumeRes.data && resumeRes.data.filename) {
            setExistingResume(resumeRes.data);
          }
        }
      } catch (err) {
        console.error('Session expired or invalid:', err);
        localStorage.removeItem('token');
        setUser(null);
        setActiveStep(1);
      }
    }
    setInitLoading(false);
  };

  const handleLoginSuccess = async (userData) => {
    setUser(userData);
    setActiveStep(2);
    
    // Check if newly logged-in user already has a resume uploaded
    try {
      const resumeRes = await resumeAPI.getLatest();
      if (resumeRes.data && resumeRes.data.filename) {
        setExistingResume(resumeRes.data);
      }
    } catch (err) {
      console.log('No existing resume found for user.');
    }
  };

  const handleUploadSuccess = (data) => {
    setResumeData(data);
    setExistingResume(data);
    if (data.parsed_profile) {
      setProfile(data.parsed_profile);
    }
    setActiveStep(3);
  };

  const handleProceedToFinal = (updatedProfile, selectedJobs) => {
    setProfile(updatedProfile);
    setTargetJobs(selectedJobs);
    setActiveStep(4);
  };

  // Restart workflow -> Clears ALL old resume and job data on backend + local state
  const handleRestart = async () => {
    try {
      await resumeAPI.clearAllData();
    } catch (err) {
      console.error('Failed to clear old pipeline data:', err);
    }
    setResumeData(null);
    setExistingResume(null);
    setProfile(null);
    setTargetJobs([]);
    setActiveStep(2);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setResumeData(null);
    setExistingResume(null);
    setProfile(null);
    setTargetJobs([]);
    setActiveStep(1);
  };

  // Strict route navigation guard (Strict Forward-Only Workflow)
  const handleSetStep = (targetStep) => {
    if (!user) {
      setActiveStep(1);
      return;
    }
    // Strictly prevent navigating backward
    if (targetStep < activeStep) {
      return;
    }
    // Lock forward navigation if prerequisites are missing
    if (targetStep === 3 && !resumeData && !existingResume) {
      alert('Please upload a resume or select an existing resume first.');
      return;
    }
    if (targetStep === 4 && (!profile || targetJobs.length === 0)) {
      alert('Please complete the AI analysis and select target jobs first.');
      return;
    }
    setActiveStep(targetStep);
  };

  if (initLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-dark)', color: '#ffffff' }}>
        <div>Loading Application...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar user={user} onLogout={handleLogout} />
      
      <Stepper activeStep={activeStep} setStep={handleSetStep} />

      <main style={{ flex: 1, paddingBottom: '40px' }}>
        {activeStep === 1 && (
          <AuthPage
            onLoginSuccess={handleLoginSuccess}
          />
        )}

        {activeStep === 2 && (
          <UploadPage
            onUploadSuccess={handleUploadSuccess}
            existingResume={existingResume}
          />
        )}

        {activeStep === 3 && (
          <PipelinePage
            resumeData={resumeData || existingResume}
            onProceedToFinal={handleProceedToFinal}
          />
        )}

        {activeStep === 4 && (
          <FinalPage
            profile={profile}
            targetJobs={targetJobs}
            onRestart={handleRestart}
          />
        )}
      </main>
    </div>
  );
}
