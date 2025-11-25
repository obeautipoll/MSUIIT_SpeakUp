import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles/styles-student/students.css";
import "../../styles/styles-student/student-dashboard.css";
import SideBar from "../student-pages/components/SideBar";
import MainNavbar from "./components/MainNavbar";
import { useAuth } from "../../contexts/authContext";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db, auth } from "../../firebase/firebase";


const Dashboard = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
 
  const [complaints, setComplaints] = useState([]);
  const [complaintsCount, setComplaintsCount] = useState({
    filed: 0,
    pending: 0,
    resolved: 0,
    inProgress: 0,
    closed: 0,
  });
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Function to handle complaint click
  const handleComplaintClick = (complaint) => {
    setSelectedComplaint(complaint);
    setShowModal(true);
  };

  // Function to close modal
  const closeModal = () => {
    setShowModal(false);
    setSelectedComplaint(null);
  };


  // Fetch complaints from Firebase
  useEffect(() => {
    const fetchComplaints = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          console.log("No user logged in");
          return;
        }

        console.log("Fetching complaints for user:", user.uid);

        // Fetch all complaints without filtering first to debug
        const complaintsRef = collection(db, "complaints");
        const querySnapshot = await getDocs(complaintsRef);
        
        console.log("Total complaints in DB:", querySnapshot.size);
        
        // Filter and sort complaints for current user
        const complaintList = querySnapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
          .filter(complaint => complaint.userId === user.uid)
          .sort((a, b) => {
            // Sort by submissionDate descending (most recent first)
            if (!a.submissionDate) return 1;
            if (!b.submissionDate) return -1;
            return b.submissionDate.toDate() - a.submissionDate.toDate();
          });

        console.log("User's complaints:", complaintList.length);


        setComplaints(complaintList);


        const statusCounts = {
          filed: 0,
          pending: 0,
          resolved: 0,
          inProgress: 0,
          closed: 0,
        };


        complaintList.forEach((complaint) => {
          const status = complaint.status?.toLowerCase();
          if (status === "filed") statusCounts.filed++;
          if (status === "closed") statusCounts.closed++;
          if (status === "resolved") statusCounts.resolved++;
          if (status === "in-progress") statusCounts.inProgress++;
          if (status === "pending") statusCounts.pending++;
        });


        setComplaintsCount(statusCounts);
      } catch (error) {
        console.error("Error fetching complaints:", error);
      }
    };


    fetchComplaints();
  }, [currentUser]);


  // Get resolution rate percentage
  const getResolutionRate = () => {
    if (complaints.length === 0) return 0;
    const resolved = complaintsCount.resolved + complaintsCount.closed;
    return Math.round((resolved / complaints.length) * 100);
  };


  // Get category breakdown
  const getCategoryBreakdown = () => {
    const categories = {};
    complaints.forEach(complaint => {
      const cat = complaint.category || 'Uncategorized';
      categories[cat] = (categories[cat] || 0) + 1;
    });
    return Object.entries(categories)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);
  };


  // Calculate average resolution time
  const getAverageResolutionDays = () => {
    const resolvedComplaints = complaints.filter(
      c => (c.status?.toLowerCase() === 'resolved' || c.status?.toLowerCase() === 'closed')
      && c.submissionDate && c.dateResolved
    );
   
    if (resolvedComplaints.length === 0) return null;
   
    const totalDays = resolvedComplaints.reduce((sum, complaint) => {
      const startDate = complaint.submissionDate?.toDate();
      const endDate = complaint.dateResolved?.toDate();
      const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
      return sum + days;
    }, 0);
   
    return Math.round(totalDays / resolvedComplaints.length);
  };


  const categoryBreakdown = getCategoryBreakdown();
  const avgDays = getAverageResolutionDays();
  const resolutionRate = getResolutionRate();

  const getGradientColors = (index) => {
    const gradients = [
      "#8B0000, #A52A2A",
      "#FF6B35, #F7931E",
      "#10B981, #059669",
      "#6366F1, #8B5CF6"
    ];
    return gradients[index] || gradients[0];
  };


  return (
    <div className="container dashboard-page">
      <SideBar />

      <div className="main-content">
          <MainNavbar />

        {/* Welcome Section */}
        <div className="dashboard-welcome">
          <h3>Track your complaints and stay updated on their progress</h3>
        </div>


        {/* Main Stats Grid */}
        <div className="dashboard-stats-grid">
          {/* Total Complaints */}
          <div className="dashboard-stat-card total">
            <div className="dashboard-stat-label">Total Complaints</div>
            <div className="dashboard-stat-number">{complaints.length}</div>
            <div className="dashboard-stat-description">
              {complaints.length === 0 ? "No complaints filed" :
               complaints.length === 1 ? "1 complaint filed" :
               `${complaints.length} complaints filed`}
            </div>
          </div>


          {/* In Progress */}
          <div className="dashboard-stat-card in-progress">
            <div className="dashboard-stat-label">In Progress</div>
            <div className="dashboard-stat-number">
              {complaintsCount.inProgress + complaintsCount.pending}
            </div>
            <div className="dashboard-stat-description">Currently being reviewed</div>
          </div>


          {/* Resolved */}
          <div className="dashboard-stat-card resolved">
            <div className="dashboard-stat-label">Resolved</div>
            <div className="dashboard-stat-number">
              {complaintsCount.resolved + complaintsCount.closed}
            </div>
            <div className="dashboard-stat-description">{resolutionRate}% success rate</div>
          </div>
        </div>


        {/* Recent Complaints Section */}
        <div className="dashboard-recent-section">
          <div className="dashboard-recent-header">
            <h2 className="dashboard-recent-title">Recent Complaints</h2>
            {complaints.length > 3 && (
              <button
                onClick={() => navigate('/history')}
                className="dashboard-view-all-btn"
              >
                View Entire History
              </button>
            )}
          </div>


          {complaints.length === 0 ? (
            // Empty State
            <div className="dashboard-empty-state">
              <div className="dashboard-empty-icon">
                <i className="fas fa-inbox"></i>
              </div>
              <h3 className="dashboard-empty-title">No complaints yet</h3>
              <p className="dashboard-empty-description">
                Your submitted complaints will appear here
              </p>
            </div>
          ) : (
            // Complaints Table
            <div style={{ overflowX: "auto" }}>
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Complaint</th>
                    <th style={{ width: "150px" }}>Category</th>
                    <th style={{ width: "120px" }}>Date Filed</th>
                    <th className="center" style={{ width: "100px" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {complaints.slice(0, 3).map((complaint) => (
                    <tr
                      key={complaint.id}
                      onClick={() => handleComplaintClick(complaint)}
                    >
                      <td className="description">
                        <div className="dashboard-description-cell">
                          {complaint.concernDescription ||
                            complaint.otherDescription ||
                            complaint.incidentDescription ||
                            complaint.facilityDescription ||
                            complaint.concernFeedback ||
                            "No description provided"}
                        </div>
                      </td>
                      <td className="category">
                        {complaint.category || "Uncategorized"}
                      </td>
                      <td className="date">
                        {complaint.submissionDate?.toDate().toLocaleDateString() || "—"}
                      </td>
                      <td className="status">
                        <span className={`status ${complaint.status?.toLowerCase() || "pending"}`}>
                          {complaint.status || "Pending"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>


        {/* Secondary Info Grid */}
        {complaints.length > 0 && (
          <div className="dashboard-secondary-grid">
            {/* Category Breakdown */}
            {categoryBreakdown.length > 0 && (
              <div className="dashboard-category-card">
                <h3 className="dashboard-category-title">Complaints by Category</h3>
                <div className="dashboard-category-list">
                  {categoryBreakdown.map(([category, count], index) => (
                    <div key={category}>
                      <div className="dashboard-category-item-header">
                        <span className="dashboard-category-name">{category}</span>
                        <span className="dashboard-category-count">
                          {count} ({Math.round((count / complaints.length) * 100)}%)
                        </span>
                      </div>
                      <div className="dashboard-category-bar">
                        <div 
                          className="dashboard-category-bar-fill"
                          style={{
                            width: `${(count / complaints.length) * 100}%`,
                            background: `linear-gradient(90deg, ${getGradientColors(index)})`
                          }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}


            {/* Quick Stats */}
            <div className="dashboard-quick-stats">
              <h3 className="dashboard-quick-stats-title">Quick Stats</h3>
              <div className="dashboard-quick-stats-list">
                <div>
                  <div className="dashboard-quick-stat-label">Avg. Resolution Time</div>
                  <div className="dashboard-quick-stat-value">
                    {avgDays !== null ? `${avgDays} days` : "N/A"}
                  </div>
                </div>
                <div className="dashboard-divider"></div>
                <div>
                  <div className="dashboard-quick-stat-label">Success Rate</div>
                  <div className={`dashboard-quick-stat-value ${
                    resolutionRate >= 70 ? 'success' : 
                    resolutionRate >= 40 ? 'warning' : 'danger'
                  }`}>
                    {resolutionRate}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Complaint Details Modal */}
      {showModal && selectedComplaint && (
        <div className="dashboard-modal-overlay" onClick={closeModal}>
          <div className="dashboard-modal-content" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="dashboard-modal-header">
              <div className="dashboard-modal-header-content">
                <h2>Complaint Details</h2>
                <p>ID: {selectedComplaint.id.slice(-8).toUpperCase()}</p>
              </div>
              <button className="dashboard-modal-close" onClick={closeModal}>×</button>
            </div>

            {/* Body */}
            <div className="dashboard-modal-body">
              {/* Status & Category Badges */}
              <div className="dashboard-modal-badges">
                <span className={`status ${selectedComplaint.status?.toLowerCase() || "pending"}`}>
                  {selectedComplaint.status || "Pending"}
                </span>
                <span className="dashboard-modal-badge">
                  {selectedComplaint.category || "Uncategorized"}
                </span>
              </div>

              {/* Description */}
              <div className="dashboard-modal-card">
                <div className="dashboard-modal-card-label">Description</div>
                <div className="dashboard-modal-card-value">
                  {selectedComplaint.concernDescription ||
                    selectedComplaint.otherDescription ||
                    selectedComplaint.incidentDescription ||
                    selectedComplaint.facilityDescription ||
                    selectedComplaint.concernFeedback ||
                    "No description provided"}
                </div>
              </div>

              {/* Date Grid */}
              <div className="dashboard-modal-grid">
                {/* Date Filed */}
                <div className="dashboard-modal-date-card">
                  <div className="dashboard-modal-date-label">📅 Date Filed</div>
                  <div className="dashboard-modal-date-value">
                    {selectedComplaint.submissionDate?.toDate().toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    }) || "—"}
                  </div>
                  <div className="dashboard-modal-date-time">
                    {selectedComplaint.submissionDate?.toDate().toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>

                {/* Status Card */}
                {selectedComplaint.dateResolved ? (
                  <div className="dashboard-modal-status-card resolved">
                    <div className="dashboard-modal-status-label">✓ Resolved</div>
                    <div className="dashboard-modal-status-value">
                      {selectedComplaint.dateResolved?.toDate().toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </div>
                    <div className="dashboard-modal-status-description">
                      {selectedComplaint.dateResolved?.toDate().toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="dashboard-modal-status-card in-progress">
                    <div className="dashboard-modal-status-label">⏱ Status</div>
                    <div className="dashboard-modal-status-value">In Progress</div>
                    <div className="dashboard-modal-status-description">Being reviewed</div>
                  </div>
                )}
              </div>

              {/* Office Involved */}
              {selectedComplaint.officeInvolved && (
                <div className="dashboard-modal-card">
                  <div className="dashboard-modal-card-label">🏢 Office Involved</div>
                  <div className="dashboard-modal-card-value">
                    {selectedComplaint.officeInvolved}
                  </div>
                </div>
              )}

              {/* Service Ratings */}
              {(selectedComplaint.communicationSatisfaction || 
                selectedComplaint.serviceAccessibility || 
                selectedComplaint.serviceEfficiency) && (
                <div className="dashboard-modal-card">
                  <div className="dashboard-modal-card-label">⭐ Service Ratings</div>
                  <div className="dashboard-modal-ratings">
                    {selectedComplaint.communicationSatisfaction && (
                      <div className="dashboard-modal-rating-item">
                        <span className="dashboard-modal-rating-label">Communication</span>
                        <span className="dashboard-modal-rating-value">
                          {selectedComplaint.communicationSatisfaction}
                        </span>
                      </div>
                    )}
                    {selectedComplaint.serviceAccessibility && (
                      <div className="dashboard-modal-rating-item">
                        <span className="dashboard-modal-rating-label">Accessibility</span>
                        <span className="dashboard-modal-rating-value">
                          {selectedComplaint.serviceAccessibility}
                        </span>
                      </div>
                    )}
                    {selectedComplaint.serviceEfficiency && (
                      <div className="dashboard-modal-rating-item">
                        <span className="dashboard-modal-rating-label">Efficiency</span>
                        <span className="dashboard-modal-rating-value">
                          {selectedComplaint.serviceEfficiency}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Additional Notes */}
              {selectedComplaint.additionalNotes && (
                <div className="dashboard-modal-card">
                  <div className="dashboard-modal-card-label">📝 Additional Notes</div>
                  <div className="dashboard-modal-card-value">
                    {selectedComplaint.additionalNotes}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="dashboard-modal-footer">
              <button className="dashboard-modal-close-btn" onClick={closeModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


export default Dashboard;