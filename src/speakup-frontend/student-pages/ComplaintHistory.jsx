import React, { useState, useEffect } from "react";
import "../../styles/styles-student/student-complaintHistory.css";
import { useNavigate, useLocation } from "react-router-dom";
import SideBar from "./components/SideBar";
import MainNavbar from "./components/MainNavbar";
import { db, auth } from "../../firebase/firebase";
import { collection, query, where, onSnapshot, doc, deleteDoc } from "firebase/firestore";


const ComplaintHistory = () => {
  const navigate = useNavigate();
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("details");
  const location = useLocation();
  const hasAppliedRouteSelection = React.useRef(false);


  // Load jsPDF library
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    script.async = true;
    document.body.appendChild(script);


    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  // Open a specific complaint and tab when navigated from Notifications
  useEffect(() => {
    // Only attempt once per route visit
    if (hasAppliedRouteSelection.current) return;
    const state = location?.state || {};
    const targetId = state.complaintId;
    const focusTab = state.focusTab;
    if (!targetId) return;

    // Wait until complaints have been loaded
    const target = complaints.find((c) => c.id === targetId);
    if (target) {
      setSelectedComplaint(target);
      setActiveTab(focusTab === 'feedback' ? 'feedback' : 'details');
      hasAppliedRouteSelection.current = true;
    }
  }, [location?.state, complaints]);


  // ✨ REAL-TIME UPDATES using onSnapshot
  useEffect(() => {
    let unsubscribeSnapshot = null;


    const setupRealtimeListener = (userId) => {
      console.log("🔄 Setting up real-time listener for user:", userId);
     
      const complaintsRef = collection(db, "complaints");
      const q = query(complaintsRef, where("userId", "==", userId));


      // onSnapshot provides real-time updates
      unsubscribeSnapshot = onSnapshot(
        q,
        (querySnapshot) => {
          console.log("📡 Real-time update received at:", new Date().toLocaleTimeString());
          console.log("✅ Total complaints:", querySnapshot.size);


          if (querySnapshot.empty) {
            console.warn("⚠️ No complaints found");
            setComplaints([]);
            setLoading(false);
            return;
          }


          const complaintList = [];
         
          querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            console.log(`📌 Processing complaint ${docSnap.id}:`, {
              status: data.status,
              dateResolved: data.dateResolved ? data.dateResolved.toDate().toLocaleString() : 'Not resolved'
            });
           
            complaintList.push({
              id: docSnap.id,
              ...data,
            });
          });


          // Sort by submission date - most recent first
          const sortedComplaints = complaintList.sort((a, b) => {
            const dateA = a.submissionDate ? a.submissionDate.toDate() : new Date(0);
            const dateB = b.submissionDate ? b.submissionDate.toDate() : new Date(0);
            return dateB - dateA;
          });


          setComplaints(sortedComplaints);
         
          // Update selected complaint if it's currently open in modal
          if (selectedComplaint) {
            const updatedSelected = sortedComplaints.find(c => c.id === selectedComplaint.id);
            if (updatedSelected) {
              console.log("🔄 Updating selected complaint in modal");
              setSelectedComplaint(updatedSelected);
            }
          }
         
          setLoading(false);
        },
        (error) => {
          console.error("❌ Real-time listener error:", error);
          alert("Error loading complaints: " + error.message);
          setLoading(false);
        }
      );
    };


    // Wait for auth to be ready
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        console.log("🔐 User authenticated:", user.uid);
        setupRealtimeListener(user.uid);
      } else {
        console.log("🚫 No user authenticated");
        setComplaints([]);
        setLoading(false);
      }
    });


    // Cleanup function
    return () => {
      console.log("🧹 Cleaning up listeners");
      unsubscribeAuth();
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }
    };
  }, []); // Only run once on mount


  // Category-specific field configuration
  const CATEGORY_FIELD_CONFIG = {
    academic: [
      { key: "courseTitle", label: "Course / Subject Title" },
      { key: "instructor", label: "Instructor" },
      { key: "concernDescription", label: "Concern Description" },
      { key: "impactExperience", label: "Academic Impact" },
      { key: "gradingFairness", label: "Grading Fairness" },
      { key: "lessonSatisfaction", label: "Lesson Satisfaction" },
      { key: "workloadStress", label: "Workload Stress Frequency" },
    ],
    "faculty-conduct": [
      { key: "departmentOffice", label: "Department / Office" },
      { key: "incidentDescription", label: "Incident Description" },
      { key: "incidentDate", label: "Date of Occurrence", format: formatDateTime },
      { key: "incidentFrequency", label: "Frequency" },
      { key: "additionalContext", label: "Additional Context" },
      { key: "respectLevel", label: "Respect Level" },
      { key: "professionalism", label: "Professionalism" },
      { key: "similarBehavior", label: "Similar Behavior Frequency" },
    ],
    facilities: [
      { key: "facilityLocation", label: "Location / Room" },
      { key: "observedDateTime", label: "Observed On", format: formatDateTime },
      { key: "facilityDescription", label: "Facility Issue" },
      { key: "facilitySatisfaction", label: "Facility Satisfaction" },
      { key: "facilityFrequency", label: "Issue Frequency" },
      { key: "facilitySafety", label: "Safety Concern Level" },
    ],
    "administrative-student-services": [
      { key: "officeInvolved", label: "Office / Service" },
      { key: "transactionDate", label: "Transaction Date", format: formatDateTime },
      { key: "concernFeedback", label: "Concern / Feedback" },
      { key: "additionalNotes", label: "Additional Notes" },
      { key: "serviceEfficiency", label: "Service Efficiency" },
      { key: "communicationSatisfaction", label: "Communication Satisfaction" },
      { key: "serviceAccessibility", label: "Service Accessibility" },
    ],
    other: [
      { key: "otherDescription", label: "Concern Description" }
    ],
  };


  const getCategorySpecificDetails = (complaint) => {
    if (!complaint) return [];


    const fields = CATEGORY_FIELD_CONFIG[complaint.category] || [];
    return fields
      .map(({ key, label, format }) => {
        const rawValue = complaint[key];
        if (rawValue === undefined || rawValue === null || rawValue === "") {
          return null;
        }
        const value = format ? format(rawValue) : rawValue;
        return { label, value };
      })
      .filter(Boolean);
  };


  const getCategoryLabel = (category) => {
    const labels = {
      academic: "Academic",
      "faculty-conduct": "Faculty Conduct",
      facilities: "Facilities",
      "administrative-student-services": "Admin/Student Services",
      other: "Other",
    };
    return labels[category] || "N/A";
  };


  const getDescription = (complaint) => {
    return (
      complaint.concernDescription ||
      complaint.otherDescription ||
      complaint.incidentDescription ||
      complaint.facilityDescription ||
      complaint.concernFeedback ||
      "No description provided"
    );
  };


  function formatDateTime(date) {
    if (!date) return "N/A";
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleString();
  }


  const formatDate = (date) => {
    if (!date) return "—";
    try {
      return date.toDate().toLocaleDateString();
    } catch {
      return "—";
    }
  };


  const canDelete = (status) => {
    // Allow deletion only when status is Pending
    return (status || "").toLowerCase() === "pending";
  };


  const handleDelete = async (complaintId) => {
    const complaint = complaints.find(c => c.id === complaintId);
   
    if (!complaint) {
      alert("Complaint not found");
      return;
    }


    if (!canDelete(complaint.status)) {
      alert("Cannot delete complaint. Only complaints with status 'Pending' can be deleted.");
      return;
    }


    if (window.confirm("Are you sure you want to delete this complaint? This action cannot be undone.")) {
      try {
        await deleteDoc(doc(db, "complaints", complaintId));
        alert("Complaint deleted successfully");
        // No need to manually update state - onSnapshot will handle it
      } catch (error) {
        console.error("Error deleting complaint:", error);
        alert("Failed to delete complaint: " + error.message);
      }
    }
  };


  // 📎 Get all attachments from multiple possible fields
  const getAttachments = (complaint) => {
    const attachments = [];
   
    // Check attachments array
    if (Array.isArray(complaint.attachments) && complaint.attachments.length) {
      attachments.push(...complaint.attachments);
    }
   
    // Check single attachment fields
    if (complaint.attachment) {
      attachments.push(complaint.attachment);
    }
   
    if (complaint.attachmentUrl) {
      attachments.push(complaint.attachmentUrl);
    }
   
    if (complaint.attachmentURL) {
      attachments.push(complaint.attachmentURL);
    }
   
    if (complaint.file) {
      attachments.push(complaint.file);
    }
   
    return attachments;
  };


  const generatePDF = (complaint) => {
    try {
      const { jsPDF } = window.jspdf || {};
     
      if (!jsPDF) {
        alert('PDF library is loading. Please try again in a moment.');
        return null;
      }


      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);
      let yPos = margin;


      // Header
      doc.setFillColor(128, 0, 32);
      doc.rect(0, 0, pageWidth, 35, 'F');
     
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('MSU-IIT SpeakUp', pageWidth / 2, 15, { align: 'center' });
     
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Complaint Management System', pageWidth / 2, 25, { align: 'center' });


      // Document Title
      yPos = 50;
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('COMPLAINT REPORT', pageWidth / 2, yPos, { align: 'center' });


      // Info Grid Background
      yPos = 65;
      doc.setFillColor(249, 249, 249);
      doc.rect(margin, yPos, contentWidth, 60, 'F');
      doc.setDrawColor(221, 221, 221);
      doc.rect(margin, yPos, contentWidth, 60, 'S');


      // Info Grid Content
      yPos += 10;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(128, 0, 32);


      // Left Column
      doc.text('DOCUMENT ID', margin + 5, yPos);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.text(complaint.id, margin + 5, yPos + 5);


      yPos += 15;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(128, 0, 32);
      doc.text('COMPLAINT CATEGORY', margin + 5, yPos);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.text(getCategoryLabel(complaint.category), margin + 5, yPos + 5);


      yPos += 15;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(128, 0, 32);
      doc.text('CURRENT STATUS', margin + 5, yPos);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.text(complaint.status || 'Pending', margin + 5, yPos + 5);


      // Right Column
      yPos = 75;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(128, 0, 32);
      doc.text('DATE GENERATED', pageWidth / 2 + 5, yPos);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.text(new Date().toLocaleDateString(), pageWidth / 2 + 5, yPos + 5);


      yPos += 15;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(128, 0, 32);
      doc.text('DATE FILED', pageWidth / 2 + 5, yPos);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.text(formatDate(complaint.submissionDate), pageWidth / 2 + 5, yPos + 5);


      yPos += 15;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(128, 0, 32);
      doc.text('DATE RESOLVED', pageWidth / 2 + 5, yPos);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(10);
      doc.text(formatDate(complaint.dateResolved) || '—', pageWidth / 2 + 5, yPos + 5);


      // Complaint Description Section
      yPos = 135;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(128, 0, 32);
      doc.text('COMPLAINT DESCRIPTION', margin, yPos);
     
      doc.setDrawColor(128, 0, 32);
      doc.setLineWidth(0.5);
      doc.line(margin, yPos + 2, pageWidth - margin, yPos + 2);


      yPos += 10;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
     
      const description = getDescription(complaint);
      const splitDescription = doc.splitTextToSize(description, contentWidth - 10);
      doc.text(splitDescription, margin + 5, yPos);


      // Attachments if exist
      const attachments = getAttachments(complaint);
      if (attachments.length > 0) {
        yPos += (splitDescription.length * 5) + 15;
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(128, 0, 32);
        doc.text('ATTACHED DOCUMENTS', margin, yPos);
       
        doc.setDrawColor(128, 0, 32);
        doc.line(margin, yPos + 2, pageWidth - margin, yPos + 2);
       
        yPos += 8;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        attachments.forEach((attachment, index) => {
          const fileName = typeof attachment === 'string' ? attachment : attachment.name || `Attachment ${index + 1}`;
          doc.text(`${index + 1}. ${fileName}`, margin + 5, yPos);
          yPos += 6;
        });
      }


      // Footer
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text('This is an official document generated from MSU-IIT SpeakUp Complaint Management System.', pageWidth / 2, pageHeight - 20, { align: 'center' });
      doc.text(`Generated on: ${new Date().toLocaleString()}`, pageWidth / 2, pageHeight - 15, { align: 'center' });


      return doc;
     
    } catch (error) {
      console.error('PDF generation error:', error);
      alert('Failed to generate PDF. Please try again.');
      return null;
    }
  };


  const handlePrint = () => {
    if (!selectedComplaint) return;
   
    const doc = generatePDF(selectedComplaint);
    if (doc) {
      const pdfBlob = doc.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      const printWindow = window.open(pdfUrl);
     
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }
    }
  };


  const handleDownload = () => {
    if (!selectedComplaint) return;
   
    const doc = generatePDF(selectedComplaint);
    if (doc) {
      doc.save(`complaint_${selectedComplaint.id}_${Date.now()}.pdf`);
    }
  };


  // 📋 Render Details Tab with Category-Specific Fields
  const renderDetailsTab = () => {
    if (!selectedComplaint) return null;


    const categoryDetails = getCategorySpecificDetails(selectedComplaint);
    const attachments = getAttachments(selectedComplaint);


    return (
      <div className="tab-content-area">
        <div className="detail-section">
          <h4>{getCategoryLabel(selectedComplaint.category)} Details</h4>
          {categoryDetails.length > 0 ? (
            <div className="detail-grid">
              {categoryDetails.map((info, index) => (
                <div className="detail-item" key={`${info.label}-${index}`}>
                  <strong>{info.label}:</strong>
                  <span>{info.value}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty-message">No specific details were provided for this category.</p>
          )}
        </div>


        {attachments.length > 0 && (
          <div className="detail-section">
            <h4>Attachments ({attachments.length})</h4>
            <div className="attachments-list">
              {attachments.map((file, index) => {
                const label = typeof file === "string" ? file : file?.name || file?.fileName || `Attachment ${index + 1}`;
                const url = typeof file === "string" ? file : file?.url || file?.downloadURL;


                return (
                  <div className="attachment-item" key={`attachment-${index}`}>
                    <div className="attachment-info">
                      <i className="fas fa-file-pdf file-icon"></i>
                      <div>
                        <div style={{ fontWeight: 500, color: 'var(--gray-900)' }}>
                          {label}
                        </div>
                      </div>
                    </div>
                    {url && (
                      <a className="btn-link" href={url} target="_blank" rel="noreferrer">
                        <i className="fas fa-external-link-alt"></i> Open
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };


  // 💬 Render Feedback Tab
  const renderFeedbackTab = () => {
    if (!selectedComplaint) return null;


    const feedbackHistory = selectedComplaint.feedbackHistory || [];


    return (
      <div className="tab-content-area">
        <h4>Admin Feedback</h4>
        {feedbackHistory.length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-inbox" style={{ fontSize: '48px', color: 'var(--gray-400)', marginBottom: '16px' }}></i>
            <p>No feedback received yet</p>
            <p style={{ fontSize: '12px', color: 'var(--gray-600)', marginTop: '8px' }}>
              Admin feedback will appear here once your complaint is reviewed
            </p>
          </div>
        ) : (
          <div className="feedback-history">
            {feedbackHistory.map((item, index) => (
              <div className="feedback-item" key={`feedback-${index}`}>
                <div className="feedback-header">
                  <div className="feedback-author">
                    <i className="fas fa-user-shield"></i>
                  </div>
                  <span className="feedback-date">
                    <i className="fas fa-clock"></i>
                    {item.date ? formatDateTime(item.date) : "Recent"}
                  </span>
                </div>
                <div className="feedback-content">
                  <p>{item.feedback}</p>
                </div>
                {item.files && item.files.length > 0 && (
                  <div className="feedback-files">
                    <p style={{ fontSize: '11px', fontWeight: 600, marginBottom: '8px', color: 'var(--gray-600)' }}>
                      <i className="fas fa-paperclip"></i> Attached Files:
                    </p>
                    <div className="file-tags">
                      {item.files.map((file, fileIndex) => (
                        <span className="file-tag" key={`file-${fileIndex}`}>
                          <i className="fas fa-file"></i>
                          {typeof file === 'string' ? file : file.name || `File ${fileIndex + 1}`}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };


  return (
    <div id="historyPage" className="container">
      <SideBar />


      <div className="main-content">
        <MainNavbar />
        <div className="card">
          <div className="card-header">
            <div className="card-title">All Submitted Complaints</div>
          </div>


          <table className="complain-table">
            <thead>
              <tr>
                <th style={{ width: "45%" }}>Complaint</th>
                <th style={{ width: "20%" }}>Category</th>
                <th style={{ width: "15%" }}>Date Filed</th>
                <th style={{ width: "12%" }}>Status</th>
                <th style={{ width: "8%" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="empty-state">
                    <i className="fas fa-spinner fa-spin"></i>
                    <p>Loading complaints...</p>
                  </td>
                </tr>
              ) : complaints.length === 0 ? (
                <tr>
                  <td colSpan="5" className="empty-state">
                    <i className="fas fa-inbox"></i>
                    <p>No complaints found</p>
                  </td>
                </tr>
              ) : (
                complaints.map((c) => (
                  <tr key={c.id}>
                    <td className="complaint-desc">{getDescription(c)}</td>
                    <td>{getCategoryLabel(c.category)}</td>
                    <td>{formatDate(c.submissionDate)}</td>
                    <td>
                      <span className={`status ${(c.status || "pending").toLowerCase()}`}>
                        {c.status || "Pending"}
                      </span>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="icon-btn btn-view"
                          onClick={() => {
                            setSelectedComplaint(c);
                            setActiveTab("details");
                          }}
                          title="View Details"
                        >
                          <i className="fas fa-eye"></i>
                        </button>
                        <button
                          className={`icon-btn btn-delete ${!canDelete(c.status) ? "disabled" : ""}`}
                          onClick={() => handleDelete(c.id)}
                          title={canDelete(c.status) ? "Delete Complaint" : "Cannot delete unless status is Pending"}
                          disabled={!canDelete(c.status)}
                        >
                          <i className="fas fa-trash-alt"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>


        {/* Modal */}
        {selectedComplaint && (
          <div className="modal" onClick={() => setSelectedComplaint(null)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Complaint Details</h2>
                <div className="ch-modal-actions">
                  <button className="ch-action-btn" onClick={handleDownload}>
                    <i className="fas fa-download"></i>
                    Download
                  </button>
                  <button className="ch-action-btn" onClick={handlePrint}>
                    <i className="fas fa-print"></i>
                    Print
                  </button>
                  <button className="close-btn" onClick={() => setSelectedComplaint(null)}>
                    ×
                  </button>
                </div>
              </div>


              {/* Tab Navigation */}
              <div className="modal-tabs">
                <button
                  className={`tab-btn ${activeTab === "details" ? "active" : ""}`}
                  onClick={() => setActiveTab("details")}
                >
                  <i className="fas fa-info-circle"></i> Details
                </button>
                <button
                  className={`tab-btn ${activeTab === "feedback" ? "active" : ""}`}
                  onClick={() => setActiveTab("feedback")}
                >
                  <i className="fas fa-comments"></i> Feedback
                  {selectedComplaint.feedbackHistory && selectedComplaint.feedbackHistory.length > 0 && (
                    <span className="badge">{selectedComplaint.feedbackHistory.length}</span>
                  )}
                </button>
              </div>


              <div className="modal-body">
                {/* Summary Grid */}
                <div className="complaint-details-grid">
                  <div className="detail-item">
                    <div className="detail-label">Complaint Category</div>
                    <div className="detail-value">{getCategoryLabel(selectedComplaint.category)}</div>
                  </div>
                 
                  <div className="detail-item">
                    <div className="detail-label">Date Filed</div>
                    <div className="detail-value">{formatDate(selectedComplaint.submissionDate)}</div>
                  </div>
                 
                  <div className="detail-item">
                    <div className="detail-label">Complaint Status</div>
                    <div className="detail-value">
                      <span className={`status ${(selectedComplaint.status || "pending").toLowerCase()}`}>
                        {selectedComplaint.status || "Pending"}
                      </span>
                    </div>
                  </div>
                 
                  <div className="detail-item">
                    <div className="detail-label">Date Resolved</div>
                    <div className="detail-value">
                      {formatDate(selectedComplaint.dateResolved) || "—"}
                    </div>
                  </div>
                </div>


                {/* Tab Content */}
                {activeTab === "details" && renderDetailsTab()}
                {activeTab === "feedback" && renderFeedbackTab()}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


export default ComplaintHistory;

