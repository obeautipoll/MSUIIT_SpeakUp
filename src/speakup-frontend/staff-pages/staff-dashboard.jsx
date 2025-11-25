import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/authContext'; // Import useAuth for fetching user data
import { BarChart3, Users, AlertTriangle, CheckCircle, FileText } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/firebase';
import '../../styles/styles-admin/admin.css';
import StaffSideBar from './components/StaffSideBar';
import StaffNavBar from './components/StaffNavBar';
import UrgentComplaintsWidget from './components/urgency-level';

const StaffDashboard = () => {
  const { currentUser } = useAuth();
  const [roleLabel, setRoleLabel] = useState('Staff Role');
  const [staffRole, setStaffRole] = useState(null);
  const [staffEmail, setStaffEmail] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    resolved: 0,
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState(null);

  useEffect(() => {
    try {
      const storedUserRaw = localStorage.getItem('user');
      const storedUser = storedUserRaw ? JSON.parse(storedUserRaw) : null;

      if (storedUser?.role) {
        setRoleLabel(storedUser.role);
        setStaffRole(storedUser.role.toLowerCase());
      } else if (currentUser?.role) {
        setRoleLabel(currentUser.role);
        setStaffRole(currentUser.role.toLowerCase());
      } else {
        setRoleLabel('Staff Role');
        setStaffRole('');
      }

      const resolvedEmail = (storedUser?.email || currentUser?.email || '')
        .trim()
        .toLowerCase();
      setStaffEmail(resolvedEmail);
    } catch (error) {
      console.error('Failed to parse stored user for role/email:', error);
      setRoleLabel('Staff Role');
      setStaffRole('');
      setStaffEmail('');
    }
  }, [currentUser]);

  useEffect(() => {
    if (staffRole === null || staffEmail === null) return;

    const fetchComplaintStats = async () => {
      setIsLoadingStats(true);

      const normalizedEmail = staffEmail.trim().toLowerCase();
      if (!normalizedEmail) {
        setStats({ total: 0, pending: 0, inProgress: 0, resolved: 0 });
        setStatsError('No staff email found. Please re-login.');
        setIsLoadingStats(false);
        return;
      }

      try {
        const snapshot = await getDocs(collection(db, 'complaints'));

        const filteredDocs = snapshot.docs.filter((doc) => {
          const data = doc.data() || {};
          const assignedRole = (data.assignedRole || '').toLowerCase().trim();
          const assignedTo = (data.assignedTo || '').toLowerCase().trim();

          if (staffRole) {
            return assignedRole === staffRole && assignedTo === normalizedEmail;
          }
          return assignedTo === normalizedEmail;
        });

        const counts = filteredDocs.reduce(
          (acc, doc) => {
            const data = doc.data() || {};
            const status = (data.status || '').toString().toLowerCase().trim();

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
  }, [staffRole, staffEmail]);

  const formatStatValue = (value) => (isLoadingStats ? '...' : value);

  const getUrgencyClass = (urgency) => {
    switch (urgency.toLowerCase()) {
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

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <div className="admin-container">
      {/* Sidebar */}
      <StaffSideBar />

      {/* Main Content */}
      <main className="main-content">
        <StaffNavBar />


        {/* Analytics Cards */}
        <div className="analytics-grid">
          <div className="stat-card">
            <div className="stat-icon total">
              <FileText size={24} />
            </div>
            <div className="stat-content">
              <h3 className="stat-value">{formatStatValue(stats.total)}</h3>
              <p className="stat-label">Total Complaints</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon pending">
              <AlertTriangle size={24} />
            </div>
            <div className="stat-content">
              <h3 className="stat-value">{formatStatValue(stats.pending)}</h3>
              <p className="stat-label">Pending</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon progress">
              <BarChart3 size={24} />
            </div>
            <div className="stat-content">
              <h3 className="stat-value">{formatStatValue(stats.inProgress)}</h3>
              <p className="stat-label">In Progress</p>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon resolved">
              <CheckCircle size={24} />
            </div>
            <div className="stat-content">
              <h3 className="stat-value">{formatStatValue(stats.resolved)}</h3>
              <p className="stat-label">Resolved & Closed</p>
            </div>
          </div>
        </div>

        {statsError && (
          <p className="stats-error-message" style={{ color: '#b91c1c', marginTop: '0.5rem' }}>
            {statsError}
          </p>
        )}

        <UrgentComplaintsWidget />

      </main>
    </div>
  );
};

export default StaffDashboard;
