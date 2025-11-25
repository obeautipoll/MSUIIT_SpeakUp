import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/authContext';
import { BarChart3, Users, AlertTriangle, CheckCircle, FileText } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import '../../styles/styles-admin/admin.css';
import AdminSideBar from './components/AdminSideBar';
import AdminNavbar from './components/AdminNavBar';
import UrgentComplaintsWidget from './components/urgency-level';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    resolved: 0,
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState(null);

  useEffect(() => {
    const fetchComplaintStats = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'complaints'));

        const counts = snapshot.docs.reduce(
          (acc, doc) => {
            const data = doc.data() || {};
            const status = (data.status || '').toLowerCase().trim();

            acc.total += 1;

            switch (status) {
              case 'pending':
                acc.pending += 1;
                break;
              case 'in-progress':
              case 'in progress':
                acc.inProgress += 1;
                break;
              case 'resolved':
              case 'closed':
                acc.resolved += 1;
                break;
              default:
                break;
            }

            return acc;
          },
          { total: 0, pending: 0, inProgress: 0, resolved: 0 }
        );

        setStats(counts);
        setStatsError(null);
      } catch (error) {
        console.error('Error fetching complaint stats:', error);
        setStats({ total: 0, pending: 0, inProgress: 0, resolved: 0 });
        setStatsError('Unable to load complaint stats right now.');
      } finally {
        setIsLoadingStats(false);
      }
    };

    fetchComplaintStats();
  }, []);

  const formatStatValue = (value) => (isLoadingStats ? '...' : value);

  // ⭐ ADD CRITICAL SUPPORT HERE
  const getUrgencyClass = (urgency) => {
    switch (urgency.toLowerCase()) {
      case 'critical':
        return 'urgency-critical';   // ← NEW
      case 'high':
        return 'urgency-high';
      case 'medium':
        return 'urgency-medium';
      case 'low':
        return 'urgency-low';
      default:
        return '';
    }
  };

  const getStatusClass = (status) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'status-pending';
      case 'in progress':
        return 'status-progress';
      case 'resolved':
        return 'status-resolved';
      default:
        return '';
    }
  };

  return (
    <div className="admin-container">
      <AdminSideBar />

      <main className="main-content">
        <AdminNavbar />

        {/* Analytics Cards */}
        <div className="analytics-grid">
          <div className="stat-card">
            <div className="stat-content">
              <h3 className="stat-value">{formatStatValue(stats.total)}</h3>
              <p className="stat-label">Total Complaints</p>
            </div>
            <div className="stat-icon total">
              <FileText size={24} />
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-content">
              <h3 className="stat-value">{formatStatValue(stats.pending)}</h3>
              <p className="stat-label">Pending</p>
            </div>
            <div className="stat-icon pending">
              <AlertTriangle size={24} />
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-content">
              <h3 className="stat-value">{formatStatValue(stats.inProgress)}</h3>
              <p className="stat-label">In Progress</p>
            </div>
            <div className="stat-icon progress">
              <BarChart3 size={24} />
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-content">
              <h3 className="stat-value">{formatStatValue(stats.resolved)}</h3>
              <p className="stat-label">Resolved & Closed</p>
            </div>
            <div className="stat-icon resolved">
              <CheckCircle size={24} />
            </div>
          </div>
        </div>

        {statsError && (
          <p className="stats-error-message" style={{ color: '#b91c1c', marginTop: '0.5rem' }}>
            {statsError}
          </p>
        )}

        {/* ⭐ AI Urgency Widget */}
        <UrgentComplaintsWidget />

      </main>
    </div>
  );
};

export default AdminDashboard;
