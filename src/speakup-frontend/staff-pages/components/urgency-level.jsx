import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../../firebase/firebase";
import { analyzeComplaintUrgency } from "../../../services/aiUrgencyService";
import { useNavigate } from "react-router-dom";
import "../../../styles/styles-admin/urgency.css";
import { useAuth } from "../../../contexts/authContext";

const PriorityTag = ({ priority }) => {
  let colorClasses;

  switch ((priority || "").toLowerCase()) {
    case "critical":
      colorClasses = "bg-red-600 text-white animate-pulse";
      break;
    case "high":
      colorClasses = "bg-orange-500 text-white";
      break;
    case "medium":
      colorClasses = "bg-yellow-400 text-gray-800";
      break;
    default:
      colorClasses = "bg-gray-300 text-gray-700";
  }

  return (
    <span className={`px-3 py-1 text-xs font-semibold rounded-full shadow-md ${colorClasses}`}>
      {String(priority || "").toUpperCase()}
    </span>
  );
};

const UrgentComplaintsWidget = () => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [staffRole, setStaffRole] = useState(null);
  const [staffEmail, setStaffEmail] = useState("");
  const auth = useAuth?.();
  const currentUser = auth?.currentUser || null;
  const navigate = useNavigate();

  useEffect(() => {
    let storedUser = {};
    try {
      storedUser = JSON.parse(localStorage.getItem("user")) || {};
    } catch {
      storedUser = {};
    }

    const normalizedRole = (storedUser.role || "").toLowerCase();
    if (normalizedRole === "staff" || normalizedRole === "kasama") {
      setStaffRole(normalizedRole);
    } else if (currentUser?.role && ["staff", "kasama"].includes(currentUser.role.toLowerCase())) {
      setStaffRole(currentUser.role.toLowerCase());
    } else {
      setStaffRole("");
    }

    const emailSource = (storedUser.email || currentUser?.email || "").toLowerCase();
    setStaffEmail(emailSource);
  }, [currentUser]);

  useEffect(() => {
    if (staffRole === null) return;
    if (!staffRole) {
      setComplaints([]);
      setLoading(false);
      return;
    }
    const fetchAndAnalyzeComplaints = async () => {
      setLoading(true);

      try {
        const snapshot = await getDocs(collection(db, "complaints"));
        const complaintsArray = [];

        for (const docSnap of snapshot.docs) {
          const data = docSnap.data();

          const text =
            data.concernDescription?.toString() ||
            data.incidentDescription?.toString() ||
            data.facilityDescription?.toString() ||
            data.concernFeedback?.toString() ||
            data.otherDescription?.toString() ||
            data.additionalContext?.toString() ||
            data.additionalNotes?.toString() ||
            data.impactExperience?.toString() ||
            data.facilitySafety?.toString() ||
            "";

          const analysis = await analyzeComplaintUrgency(text);

          if (analysis && (analysis.urgency === "High" || analysis.urgency === "Critical")) {
            const assignedRole = (data.assignedRole || "").toLowerCase();
            const assignedToValue = (data.assignedTo || "").toLowerCase();

            if (staffRole && assignedRole !== staffRole) {
              continue;
            }

            if (staffEmail && assignedToValue && assignedToValue !== staffEmail) {
              continue;
            }

            complaintsArray.push({
              id: docSnap.id,
              snippet: text.slice(0, 120),
              category: data.category,
              submissionDate: data.submissionDate,
              timeAgo: formatDateTime(data.submissionDate),
              priority: analysis.urgency,
              fullData: data,
            });
          }
        }

        setComplaints(complaintsArray);
      } catch (err) {
        console.error("Error fetching/analyzing complaints:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAndAnalyzeComplaints();
  }, [staffRole, staffEmail]);

  const formatDateTime = (date) => {
    if (!date) return "N/A";
    const d = date.toDate ? date.toDate() : date;
    return d.toLocaleString();
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

  const handleViewDetails = (complaint) => {
    navigate("/smonitorcomplaints", {
      state: { complaintId: complaint.id, focusTab: "details" },
    });
  };

  if (loading) {
    return <div className="urgent-complaints-widget">Analyzing complaints...</div>;
  }

  return (
    <div className="urgent-complaints-widget">
      <div className="widget-header">
        <h3 className="widget-title">Urgent Complaints Queue</h3>
        <span className="new-count-badge">{complaints.length} New</span>
      </div>

      <div className="complaints-list">
        {complaints.length > 0 ? (
          complaints.map((complaint) => (
            <div key={complaint.id} className="complaint-card">
              <div className="complaint-header">
                <PriorityTag priority={complaint.priority} />
                <span className="complaint-category">{getCategoryLabel(complaint.category)}</span>
              </div>

              <div className="complaint-content">
                <p className="complaint-id-snippet">
                  {complaint.id}: {complaint.snippet}
                </p>

                <div className="complaint-meta">
                  <span className="meta-time">Filed: {formatDateTime(complaint.submissionDate)}</span>
                </div>
              </div>

              <div className="complaint-actions">
                <button className="action-btn btn-view" onClick={() => handleViewDetails(complaint)}>
                  View Details
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">All quiet! No urgent complaints found.</div>
        )}
      </div>

      <div className="widget-footer">
        <a
          href="#"
          className="view-all-link"
          onClick={(e) => {
            e.preventDefault();
            navigate("/smonitorcomplaints");
          }}
        >
          View Full Complaints Queue
        </a>
      </div>
    </div>
  );
};

export default UrgentComplaintsWidget;
