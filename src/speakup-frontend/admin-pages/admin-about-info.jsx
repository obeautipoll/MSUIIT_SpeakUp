import React from 'react';
import { Shield, Target, BarChart3, Lock, Users, CheckCircle, TrendingUp } from 'lucide-react';
import '../../styles/styles-admin/about-info-admin.css';

export default function AdminAboutInfo() {
  return (
    <div className="about-container">
      <header className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">About Our Complaint Management System</h1>
          <p className="hero-subtitle">
            Welcome to the heart of our operations. This Staff & Admin Dashboard is a unified platform 
            dedicated to streamlining the entire complaint management lifecycle, from initial submission 
            to final resolution.
          </p>
        </div>
        <div className="hero-decoration"></div>
      </header>

      <section className="mission-section">
        <div className="section-header">
          <Target className="section-icon" />
          <h2>Our Mission and Purpose</h2>
        </div>
        <p className="mission-text">
          Our mission is simple: to ensure that every concern, issue, or feedback item submitted is 
          handled with speed, accountability, and precision. This dashboard empowers our staff and 
          administration to maintain high service standards by providing a clear, real-time overview 
          of all pending and resolved issues.
        </p>
      </section>

      <section className="benefits-section">
        <h2 className="section-title">Key Benefits</h2>
        <div className="benefits-grid">
          <div className="benefit-card">
            <div className="benefit-icon-wrapper">
              <BarChart3 className="benefit-icon" />
            </div>
            <h3>Centralized Tracking</h3>
            <p>Eliminate scattered emails and spreadsheets. All data resides in one secure location.</p>
          </div>
          
          <div className="benefit-card">
            <div className="benefit-icon-wrapper">
              <CheckCircle className="benefit-icon" />
            </div>
            <h3>Enhanced Accountability</h3>
            <p>Clear assignment and status tracking ensure responsibility is maintained throughout the resolution process.</p>
          </div>
          
          <div className="benefit-card">
            <div className="benefit-icon-wrapper">
              <TrendingUp className="benefit-icon" />
            </div>
            <h3>Data-Driven Insights</h3>
            <p>The system provides actionable Reports & Analytics to identify recurring issues and areas for improvement.</p>
          </div>
        </div>
      </section>

      <section className="security-section">
        <div className="section-header">
          <Lock className="section-icon" />
          <h2>Security and Access</h2>
        </div>
        <p className="security-intro">
          This platform is a secure, role-based environment designed for authorized Staff and Admin users.
        </p>
        
        <div className="roles-container">
          <div className="role-card">
            <div className="role-header">
              <Users className="role-icon" />
              <h3>Staff</h3>
            </div>
            <p className="role-description">
              Monitoring, updating, and resolving specific complaints assigned to them.
            </p>
          </div>
          
          <div className="role-card">
            <div className="role-header">
              <Shield className="role-icon" />
              <h3>Administrator</h3>
            </div>
            <p className="role-description">
              Overseeing all activities, generating organizational reports, and managing user roles.
            </p>
          </div>
        </div>
        
        <p className="security-commitment">
          We are committed to data privacy and maintaining the integrity of all reports processed through this system.
        </p>
      </section>

      <section className="cta-section">
        <div className="cta-content">
          <h2>Get Started</h2>
          <p>
            Your dedication to resolving issues efficiently is what makes this system valuable. 
            If you have any questions about navigation, functionality, or data handling, please 
            refer to our internal documentation or contact your system administrator.
          </p>
        </div>
      </section>
    </div>
  );
}