import React, { useState, useEffect, useRef } from "react";
import "../../styles/styles-admin/monitor-admin.css";
import SideBar from "./components/AdminSideBar";
import AdminNavbar from "./components/AdminNavBar";
import { db } from "../../firebase/firebase";
import { collection, getDocs, orderBy, query, updateDoc, doc, serverTimestamp, where } from "firebase/firestore";
import { useAuth } from "../../contexts/authContext";
import { useLocation, useNavigate } from "react-router-dom";
import { arrayUnion } from "firebase/firestore";

const AdminMonitorComplaints = () => {
  const [complaints, setComplaints] = useState([]);
  const [filteredComplaints, setFilteredComplaints] = useState([]);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [activeTab, setActiveTab] = useState("details");
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("view");

  // Filter states
  const [filters, setFilters] = useState({
    category: "all",
    status: "all",
    search: "",
  });

  

  // Form states
  const [feedback, setFeedback] = useState("");
  const [feedbackFiles, setFeedbackFiles] = useState([]);
  const [assignTo, setAssignTo] = useState("");
  const [assignMessage, setAssignMessage] = useState("");
  const [newStatus, setNewStatus] = useState("pending");
  const [noteModalComplaint, setNoteModalComplaint] = useState(null);
  const [noteInput, setNoteInput] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [noteError, setNoteError] = useState("");
  const [noteRole, setNoteRole] = useState("");
  const [assignmentError, setAssignmentError] = useState("");
  const [roleEmails, setRoleEmails] = useState({ staff: "", kasama: "" });
  const [assignmentUsers, setAssignmentUsers] = useState([]);
  const { currentUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const hasAppliedRouteSelection = useRef(false);
  const VIEW_TABS = ["details", "feedback"];
  const MANAGE_TABS = ["details", "feedback", "notes", "assign", "status"];
  const TAB_LABELS = {
    details: "Details",
    feedback: "Feedback",
    notes: "Notes",
    assign: "Assign",
    status: "Status",
  };
  const STATUS_OPTIONS = ["pending", "in-progress", "resolved", "closed"];
  const normalizeStatusValue = (value = "") =>
    value.toString().trim().toLowerCase().replace(/\s+/g, "-");
  const formatStatusLabel = (value = "") => {
    const normalized = normalizeStatusValue(value);
    const labels = {
      pending: "Pending",
      "in-progress": "In Progress",
      resolved: "Resolved",
      closed: "Closed",
    };
    return labels[normalized] || (value ? String(value) : "Pending");
  };

  const getCurrentUserRole = () => {
    try {
      const storedUser = JSON.parse(localStorage.getItem("user"));
      return (storedUser?.role || "admin").toLowerCase();
    } catch (error) {
      console.error("Failed to parse stored user role:", error);
      return "admin";
    }
  };

  // 🔥 Fetch complaints from Firestore
  useEffect(() => {
    const fetchComplaints = async () => {
      try {
        const q = query(collection(db, "complaints"), orderBy("submissionDate", "desc"));
        const snapshot = await getDocs(q);

        const fetchedComplaints = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        setComplaints(fetchedComplaints);
        setFilteredComplaints(fetchedComplaints);

        // If navigated with complaintId, open the modal once and clear state
        try {
          const state = location?.state || {};
          if (!hasAppliedRouteSelection.current && state.complaintId && !selectedComplaint) {
            const found = fetchedComplaints.find((c) => c.id === state.complaintId);
            if (found) {
              if (state.focusTab === 'status') {
                openModal(found, 'manage', 'status');
              } else if (state.focusTab === 'feedback') {
                openModal(found, 'view', 'feedback');
              } else {
                openModal(found, 'view', 'details');
              }
            }
            hasAppliedRouteSelection.current = true;
            try { navigate('/amonitorcomplaints', { replace: true }); } catch {}
          }
        } catch {}
      } catch (error) {
        console.error("❌ Error fetching complaints:", error);
      }
    };

    fetchComplaints();
  }, []);

  useEffect(() => {
    if (getCurrentUserRole() !== "admin") return;
    const fetchRoleEmails = async () => {
      try {
        const roleQuery = query(collection(db, "users"), where("role", "in", ["staff", "kasama"]));
        const snapshot = await getDocs(roleQuery);
        const found = { staff: "", kasama: "" };
        const users = [];

        snapshot.forEach((docSnap) => {
          const data = docSnap.data() || {};
          const role = (data.role || "").toLowerCase();
          const email = (data.email || "").trim();
          if ((role === "staff" || role === "kasama") && email) {
            if (!found[role]) {
              found[role] = email;
            }
            users.push({
              id: docSnap.id,
              role,
              email,
              emailLower: email.toLowerCase(),
            });
          }
        });

        setRoleEmails(found);
        setAssignmentUsers(users);
      } catch (error) {
        console.error("Failed to fetch role emails:", error);
      }
    };

    fetchRoleEmails();
  }, []);

  // 🔎 Filtering logic
  useEffect(() => {
    let filtered = complaints;

    if (filters.category !== "all") {
      filtered = filtered.filter((c) => c.category === filters.category);
    }

    if (filters.status !== "all") {
      filtered = filtered.filter(
        (c) => normalizeStatusValue(c.status) === normalizeStatusValue(filters.status)
      );
    }

    if (filters.search) {
      filtered = filtered.filter(
        (c) =>
          (c.id && c.id.toLowerCase().includes(filters.search.toLowerCase())) ||
          (c.category && c.category.toLowerCase().includes(filters.search.toLowerCase())) ||
          (c.college && c.college.toLowerCase().includes(filters.search.toLowerCase()))
      );
    }

    setFilteredComplaints(filtered);
  }, [filters, complaints]);

  useEffect(() => {
    const allowedTabs = modalMode === "view" ? VIEW_TABS : MANAGE_TABS;
    if (!allowedTabs.includes(activeTab)) {
      setActiveTab(allowedTabs[0]);
    }
  }, [modalMode, activeTab]);

  // 📄 Modal logic
  const openModal = (complaint, mode = "view", defaultTab = "details") => {
    setSelectedComplaint(complaint);
    setShowModal(true);
    setModalMode(mode);
    setActiveTab(defaultTab);
    setFeedback("");
    setFeedbackFiles([]);
    setAssignTo(getAssignmentValue(complaint.assignedRole, complaint.assignedTo));
    setAssignMessage("");
    setNewStatus(normalizeStatusValue(complaint.status || "pending"));
  };

  const switchToManageMode = (defaultTab = "details") => {
    setModalMode("manage");
    setActiveTab(defaultTab);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedComplaint(null);
    setActiveTab("details");
    setModalMode("view");
  };

  

  // 💬 Feedback & Admin actions (same as before)
  const getAdminIdentifier = () => currentUser?.uid || currentUser?.email || "admin-user";

  const getAdminDisplayName = () =>
    currentUser?.displayName || currentUser?.email || "Admin User";

  const getSharedNote = (complaint) =>
    (complaint?.adminNotes && complaint.adminNotes[0]) || null;

  const openNoteModal = (complaint) => {
    if (!currentUser) {
      alert("You must be logged in to manage notes.");
      return;
    }

    const existingNote = getSharedNote(complaint);
    setNoteModalComplaint(complaint);
    setNoteInput(existingNote?.note || "");
    setNoteError("");
    const roleSource = complaint.assignedRole || complaint.assignedTo || "admin";
    setNoteRole(roleSource);
  };

  const closeNoteModal = () => {
    setNoteModalComplaint(null);
    setNoteInput("");
    setNoteError("");
    setIsSavingNote(false);
  };

  const handleSaveAdminNote = async () => {
    if (!noteModalComplaint || !currentUser) return;

    if (!noteInput.trim()) {
      setNoteError("Please enter a note before saving.");
      return;
    }

    setIsSavingNote(true);
    setNoteError("");

    try {
      const adminId = getAdminIdentifier();
      const adminName = getAdminDisplayName();
      const updatedNote = {
        adminId,
        adminName,
        adminRole: getCurrentUserRole(),
        note: noteInput.trim(),
        updatedAt: new Date().toISOString(),
      };

      const updatedNotes = [updatedNote];

      const complaintRef = doc(db, "complaints", noteModalComplaint.id);
      await updateDoc(complaintRef, { adminNotes: updatedNotes });

      setComplaints((prev) =>
        prev.map((complaint) =>
          complaint.id === noteModalComplaint.id
            ? { ...complaint, adminNotes: updatedNotes }
            : complaint
        )
      );

      if (selectedComplaint?.id === noteModalComplaint.id) {
        setSelectedComplaint((prev) =>
          prev ? { ...prev, adminNotes: updatedNotes } : prev
        );
      }

      closeNoteModal();
    } catch (error) {
      console.error("Error saving admin note:", error);
      setNoteError("Unable to save note right now. Please try again.");
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleAssignSelectionChange = async (complaint, selectionValue) => {
    setAssignmentError("");
    const { role, email } = resolveAssignmentSelection(selectionValue);

    const applyLocalUpdate = (list) =>
      list.map((item) =>
        item.id === complaint.id ? { ...item, assignedRole: role, assignedTo: email } : item
      );

    setComplaints((prev) => applyLocalUpdate(prev));
    setFilteredComplaints((prev) => applyLocalUpdate(prev));
    if (selectedComplaint?.id === complaint.id) {
      setSelectedComplaint((prev) =>
        prev ? { ...prev, assignedRole: role, assignedTo: email } : prev
      );
      setAssignTo(getAssignmentValue(role, email));
    }

    try {
      await updateDoc(doc(db, "complaints", complaint.id), {
        assignedRole: role || "",
        assignedTo: email || "",
        assignmentUpdatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Failed to update assignment:", error);
      setAssignmentError("Unable to update assignment right now.");
    }
  };

  const handleSendFeedback = async () => {
    if (!selectedComplaint) return;
    if (!feedback.trim()) {
      alert("Please enter feedback");
      return;
    }

    const role = getCurrentUserRole();
    const adminName = currentUser?.displayName || currentUser?.email || (role === 'kasama' ? 'KASAMA' : 'Admin User');

    const newFeedback = {
      feedback,
      admin: adminName,
      adminRole: role,
      adminEmail: currentUser?.email || "",
      date: new Date().toISOString(),
      files: feedbackFiles.map((f) => f.name),
    };

    const updatedFeedback = [...(selectedComplaint.feedbackHistory || []), newFeedback];

    const updated = complaints.map((c) =>
      c.id === selectedComplaint.id
        ? { ...c, feedbackHistory: updatedFeedback, Feedback: newFeedback.feedback }
        : c
    );

    setComplaints(updated);
    setFilteredComplaints((prev) =>
      prev.map((c) => (c.id === selectedComplaint.id ? { ...c, feedbackHistory: updatedFeedback, Feedback: newFeedback.feedback } : c))
    );
    setSelectedComplaint({
      ...selectedComplaint,
      feedbackHistory: updatedFeedback,
      Feedback: newFeedback.feedback,
    });

    try {
      await updateDoc(doc(db, "complaints", selectedComplaint.id), {
        feedbackHistory: updatedFeedback,
        Feedback: newFeedback.feedback,
        feedbackUpdatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Failed to save feedback:", error);
      alert("Unable to save feedback right now. It may not appear to students.");
    }

    setFeedback("");
    setFeedbackFiles([]);
  };

  const handleFeedbackFileChange = (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setFeedbackFiles((prev) => [...prev, ...files]);
  };

  const handleRemoveFeedbackFile = (indexToRemove) => {
    setFeedbackFiles((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleSendFeedbackPersist = async () => {
    if (!selectedComplaint) return;
    const text = (feedback || "").trim();
    if (!text) {
      alert("Please enter feedback");
      return;
    }

    try {
      const adminId = currentUser?.uid || currentUser?.email || "admin-user";
      const adminName = currentUser?.displayName || currentUser?.email || "Admin User";
      const role = getCurrentUserRole ? getCurrentUserRole() : "admin";

      const newFeedback = {
        adminId,
        admin: adminName,
        adminRole: role,
        adminEmail: currentUser?.email || "",
        feedback: text,
        date: new Date().toISOString(),
        files: (feedbackFiles || []).map((f) => f?.name || String(f)),
      };

      const ref = doc(db, "complaints", selectedComplaint.id);
      await updateDoc(ref, {
        feedbackHistory: arrayUnion(newFeedback),
        Feedback: text,
        feedbackUpdatedAt: new Date().toISOString(),
      });

      setComplaints((prev) =>
        prev.map((c) =>
          c.id === selectedComplaint.id
            ? { ...c, feedbackHistory: [...(c.feedbackHistory || []), newFeedback], Feedback: text }
            : c
        )
      );
      setSelectedComplaint((prev) =>
        prev ? { ...prev, feedbackHistory: [...(prev.feedbackHistory || []), newFeedback], Feedback: text } : prev
      );
      setFeedback("");
      setFeedbackFiles([]);
      alert("Feedback sent");
    } catch (e) {
      console.error("Failed to send feedback:", e);
      alert("Failed to send feedback. Please try again.");
    }
  };

  const openModalForStatusChange = (complaint) => {
    openModal(complaint, "manage", "status");
  };

  const handleAssignComplaint = async () => {
    if (!selectedComplaint) return;
    const { role, email } = resolveAssignmentSelection(assignTo);
    if (!role || !email) {
      setAssignmentError("Please select a staff or kasama email to assign.");
      return;
    }

    setAssignmentError("");
    const trimmedMessage = assignMessage.trim();

    const updatedComplaints = complaints.map((c) =>
      c.id === selectedComplaint.id
        ? { ...c, assignedRole: role, assignedTo: email, assignmentMessage: trimmedMessage }
        : c
    );

    setComplaints(updatedComplaints);
    setSelectedComplaint({
      ...selectedComplaint,
      assignedRole: role,
      assignedTo: email,
      assignmentMessage: trimmedMessage,
    });
    setAssignMessage("");

    try {
      await updateDoc(doc(db, "complaints", selectedComplaint.id), {
        assignedRole: role,
        assignedTo: email,
        assignmentMessage: trimmedMessage,
        assignmentUpdatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Failed to update assignment details:", error);
      setAssignmentError("Unable to assign this complaint right now.");
    }
  };

const handleUpdateStatus = async (nextStatusValue) => {
  if (!selectedComplaint || !nextStatusValue) return;

  const normalizedNext = normalizeStatusValue(nextStatusValue);
  const currentNormalized = normalizeStatusValue(selectedComplaint.status);
  if (!normalizedNext || normalizedNext === currentNormalized) return;

  const displayStatus = formatStatusLabel(normalizedNext);

  const confirmed = window.confirm(
    `Are you sure you want to change the status to "${displayStatus}"?`
  );
  if (!confirmed) return;

  try {
    const complaintRef = doc(db, "complaints", selectedComplaint.id);
    await updateDoc(complaintRef, {
      status: displayStatus,
      statusUpdatedAt: serverTimestamp(),
    });

    const updatedComplaints = complaints.map((complaint) =>
      complaint.id === selectedComplaint.id
        ? { ...complaint, status: displayStatus }
        : complaint
    );

    setComplaints(updatedComplaints);
    setSelectedComplaint({ ...selectedComplaint, status: displayStatus });
    setNewStatus(normalizedNext);

  } catch (error) {
    console.error("❌ Error updating complaint status:", error);
  }
};

  const getStatusClass = (status) => {
    switch (normalizeStatusValue(status)) {
      case "pending":
        return "status-pending";
      case "in-progress":
        return "status-in-progress";
      case "resolved":
        return "status-resolved";
      case "closed":
        return "status-closed";
      default:
        return "status-pending";
    }
  };

  // 🧹 Utility helpers
  const formatDateTime = (date) => {
    if (!date) return "N/A";
    const d = date.toDate ? date.toDate() : new Date(date);
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
    other: [{ key: "otherDescription", label: "Concern Description" }],
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

  const renderComplaintDetails = () => {
    if (!selectedComplaint) return null;

    const categoryDetails = getCategorySpecificDetails(selectedComplaint);

    const attachmentCandidates = [];
    if (Array.isArray(selectedComplaint.attachments) && selectedComplaint.attachments.length) {
      attachmentCandidates.push(...selectedComplaint.attachments);
    }
    if (selectedComplaint.attachment) {
      attachmentCandidates.push(selectedComplaint.attachment);
    }
    if (selectedComplaint.attachmentUrl) {
      attachmentCandidates.push(selectedComplaint.attachmentUrl);
    }
    if (selectedComplaint.attachmentURL) {
      attachmentCandidates.push(selectedComplaint.attachmentURL);
    }

    return (
      <>
        <div className="detail-section">
          <h4>{`${getCategoryLabel(selectedComplaint.category)} Details`}</h4>
          {categoryDetails.length > 0 ? (
            <div className="detail-grid">
              {categoryDetails.map((info) => (
                <div className="detail-item" key={info.label}>
                  <strong>{info.label}:</strong>
                  <span>{info.value}</span>
                </div>
              ))}
            </div>
          ) : (
            <p>No specific details were provided for this category.</p>
          )}
        </div>

        {attachmentCandidates.length > 0 && (
          <div className="detail-section">
            <h4>Attachments</h4>
            {attachmentCandidates.map((file, index) => {
              const label =
                typeof file === "string"
                  ? file
                  : file?.name || file?.fileName || `Attachment ${index + 1}`;
              const url = typeof file === "string" ? file : file?.url || file?.downloadURL;

              return (
                <div className="attachment-item" key={`${label}-${index}`}>
                  <span>📎 {label}</span>
                  {url && (
                    <a className="btn-link" href={url} target="_blank" rel="noreferrer">
                      Open
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </>
    );
  };

  const visibleTabs = modalMode === "view" ? VIEW_TABS : MANAGE_TABS;
  const getRoleLabel = (role) => (role === "kasama" ? "Kasama" : "Staff");
  const getAssignmentValue = (role, email) => {
    const normalizedRole = (role || "").toLowerCase();
    const normalizedEmail = (email || "").trim().toLowerCase();
    if (!normalizedRole || !normalizedEmail) return "";
    return `${normalizedRole}|${normalizedEmail}`;
  };
  const parseAssignmentValue = (value) => {
    if (!value) return { role: "", emailLower: "" };
    const [role, emailLower] = value.split("|");
    return {
      role: (role || "").toLowerCase(),
      emailLower: (emailLower || "").toLowerCase(),
    };
  };
  const resolveAssignmentSelection = (value) => {
    const parsed = parseAssignmentValue(value);
    if (!parsed.role || !parsed.emailLower) {
      return { role: "", email: "", emailLower: "" };
    }
    const matched = assignmentUsers.find(
      (user) => user.role === parsed.role && user.emailLower === parsed.emailLower
    );
    if (matched) {
      return { role: matched.role, email: matched.email, emailLower: matched.emailLower };
    }
    return { role: parsed.role, email: parsed.emailLower, emailLower: parsed.emailLower };
  };
  const getAssignmentLabel = (role, email) => {
    if (!role || !email) return "Unassigned";
    return `${getRoleLabel(role)}: ${email}`;
  };
  const getComplaintAssignmentValue = (complaint) =>
    getAssignmentValue(complaint.assignedRole, complaint.assignedTo);
  const getAssignmentLabelFromValue = (value) => {
    const { role, email } = resolveAssignmentSelection(value);
    return getAssignmentLabel(role, email);
  };
  const assignSelectionExists = assignmentUsers.some(
    (user) => getAssignmentValue(user.role, user.email) === assignTo
  );
  const getFeedbackSenderLabel = (entry) => {
    if (!entry) return "ADMIN";
    const roleKey = (entry.adminRole || "").toLowerCase();
    const roleLabel = roleKey ? roleKey.toUpperCase() : "ADMIN";
    let identifier = entry.adminEmail || "";

    if (
      !identifier &&
      getCurrentUserRole() === "admin" &&
      (roleKey === "staff" || roleKey === "kasama")
    ) {
      identifier = roleEmails[roleKey] || "";
    }

    if (!identifier) {
      identifier = entry.admin || "Unknown";
    }

    return `${roleLabel}: ${identifier}`;
  };

  return (
    <div className="monitor-complaints-page">
      <SideBar />
      <AdminNavbar />

      <div className="main-content">
        <div className="page-header">
          <div>
            <h2>Monitor Student Complaints</h2>
            <p>View and manage all student complaints</p>
          </div>
        </div>

        {/* Filters */}
        <div className="filters-section">
          <div className="filter-group">
            <label>Search:</label>
            <input
              type="text"
              placeholder="Search by ID or College..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            />
          </div>
          <div className="filter-group">
            <label>Category:</label>
            <select
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            >
              <option value="all">All</option>
              <option value="academic">Academic</option>
              <option value="faculty-conduct">Faculty Conduct</option>
              <option value="facilities">Facilities</option>
              <option value="administrative-student-services">Admin/Student Services</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Status:</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="all">All</option>
              {STATUS_OPTIONS.map((statusValue) => (
                <option key={statusValue} value={statusValue}>
                  {formatStatusLabel(statusValue)}
                </option>
              ))}
            </select>
          </div>
        </div>

       {/* Table */} 
          <div className="table-container">
            <table className="complaints-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>College</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Assigned To</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredComplaints.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="no-data">
                      No complaints found
                    </td>
                  </tr>
                ) : (
                  filteredComplaints.map((c) => {
                    const assignmentValue = getComplaintAssignmentValue(c);
                    const assignmentOptionExists = assignmentUsers.some(
                      (user) => getAssignmentValue(user.role, user.email) === assignmentValue
                    );
                    return (
                    <tr key={c.id}>
                      <td>{c.id}</td>
                      <td>{c.college || "—"}</td>
                      <td>{getCategoryLabel(c.category)}</td>
                      <td>
                      <span 
                        className={`status-badge ${getStatusClass(c.status)}`}
                        onClick={() => openModalForStatusChange(c)}  // Open modal to change status
                        style={{ cursor: "pointer" }}  // Show pointer cursor on hover
                      >
                        {formatStatusLabel(c.status)}
                      </span>
                    </td>
                      <td>{formatDateTime(c.submissionDate)}</td>
                      <td>
                        <select
                          className="assignment-dropdown"
                          value={assignmentValue}
                          onChange={(e) => handleAssignSelectionChange(c, e.target.value)}
                        >
                          <option value="">Unassigned</option>
                          {!assignmentOptionExists && assignmentValue && (
                            <option value={assignmentValue}>
                              {getAssignmentLabel(c.assignedRole, c.assignedTo)}
                            </option>
                          )}
                          {assignmentUsers.map((user) => {
                            const optionValue = getAssignmentValue(user.role, user.email);
                            return (
                              <option key={user.id} value={optionValue}>
                                {getAssignmentLabel(user.role, user.email)}
                              </option>
                            );
                          })}
                        </select>
                      </td>
                      <td className="actions-cell">
                        <button
                          className="btn-note"
                          onClick={() => openNoteModal(c)}
                          disabled={!currentUser}
                          title={
                            getSharedNote(c)
                              ? "Update the note for this complaint"
                              : "Add a note for this complaint"
                          }
                        >
                          {getSharedNote(c) ? "Update Note" : "Add Note"}
                        </button>
                        <button
                          className="btn-view"
                          onClick={() => openModal(c)}
                          title="View the full complaint details"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {assignmentError && (
            <p className="inline-error" style={{ marginTop: "0.5rem" }}>
              {assignmentError}
            </p>
          )}

          {showModal && selectedComplaint && (
            <div className="modal-overlay" onClick={closeModal}>
              <div className="modal-container" onClick={(e) => e.stopPropagation()}>
             <div className="modal-header">
              <div>
                <h3>Complaint #{selectedComplaint.id}</h3>
                <p>
                  {(selectedComplaint.college || "No college specified") +
                    " - " +
                    getCategoryLabel(selectedComplaint.category)}
                </p>
              </div>
              <button className="btn-close" onClick={closeModal}>
                X
              </button>
            </div>

                <div className="modal-tabs">
                  {visibleTabs.map((tabKey) => (
                    <button
                      key={tabKey}
                      className={`tab-btn ${activeTab === tabKey ? "active" : ""}`}
                      onClick={() => setActiveTab(tabKey)}
                    >
                      {TAB_LABELS[tabKey]}
                    </button>
                  ))}
                  {modalMode === "view" && (
                    <button className="btn-secondary manage-switch" onClick={() => switchToManageMode("details")}>
                      Manage Complaint
                    </button>
                  )}
                </div>

                <div className="modal-body">
                  {visibleTabs.includes("details") && activeTab === "details" && (
                    <div className="tab-content">{renderComplaintDetails()}</div>
                  )}

                  {visibleTabs.includes("feedback") && activeTab === "feedback" && (
                    <div className="tab-content">
                      <h4>Feedback History</h4>
                      {!selectedComplaint.feedbackHistory ||
                      selectedComplaint.feedbackHistory.length === 0 ? (
                        <p className="empty-state">No feedback shared yet.</p>
                      ) : (
                        <div className="feedback-history">
                          {selectedComplaint.feedbackHistory.map((item, index) => (
                            <div className="feedback-item" key={`${item.date || index}-${index}`}>
                              <div className="feedback-header">
                                <strong>{getFeedbackSenderLabel(item)}</strong>
                                <span className="feedback-date">
                                  {item.date ? formatDateTime(item.date) : "Just now"}
                                </span>
                              </div>
                              <p>{item.feedback}</p>
                              {item.files && item.files.length > 0 && (
                                <div className="feedback-files">
                                  {item.files.map((file, fileIndex) => (
                                    <span className="file-tag" key={`${file}-${fileIndex}`}>
                                      {file.name || file}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="feedback-form">
                        <h4>Send New Feedback</h4>
                        <textarea
                          rows="4"
                          placeholder="Write your feedback to the student..."
                          value={feedback}
                          onChange={(e) => setFeedback(e.target.value)}
                        ></textarea>

                        <div className="file-upload-section">
                          <label className="file-upload-label">
                            <input
                              type="file"
                              multiple
                              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                              onChange={handleFeedbackFileChange}
                            />
                            📎 Attach Files
                          </label>
                          {feedbackFiles.length > 0 && (
                            <div className="selected-files">
                              {feedbackFiles.map((file, index) => (
                                <div className="file-chip" key={`${file.name}-${index}`}>
                                  <span>{file.name}</span>
                                  <button type="button" onClick={() => handleRemoveFeedbackFile(index)}>
                                    ×
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        <button className="btn-primary" onClick={handleSendFeedbackPersist}>
                          Send Feedback
                        </button>
                      </div>
                    </div>
                  )}

                  {visibleTabs.includes("notes") && activeTab === "notes" && (
                    <div className="tab-content">
                      <h4>Admin Notes (Private)</h4>
                      {!selectedComplaint.adminNotes || selectedComplaint.adminNotes.length === 0 ? (
                        <p className="empty-state">No notes have been added.</p>
                      ) : (
                        <div className="notes-history">
                          {selectedComplaint.adminNotes.map((note) => (
                            <div className="note-card" key={`${note.adminId}-${note.updatedAt}`}>
                              <div className="note-card-header">
                                <span className="note-author">
                                  {note.adminName || "Unknown"} -{" "}
                                  {note.adminRole ? note.adminRole.toUpperCase() : "ADMIN"}
                                </span>
                                <span className="note-timestamp">{formatNoteTimestamp(note.updatedAt)}</span>
                              </div>
                              <p className="note-text">{note.note}</p>
                            </div>
                          ))}
                        </div>
                      )}
                      <button className="btn-secondary" onClick={() => openNoteModal(selectedComplaint)}>
                        {getSharedNote(selectedComplaint) ? "Update Note" : "Add Note"}
                      </button>
                    </div>
                  )}

                  {visibleTabs.includes("assign") && activeTab === "assign" && (
                    <div className="tab-content">
                      <h4>Assignment</h4>
                      <div className="current-assignment">
                        <p>
                          <strong>Assigned Role:</strong> {
                            selectedComplaint.assignedRole
                              ? selectedComplaint.assignedRole.toUpperCase()
                              : "Unassigned"
                          }
                        </p>
                        <p>
                          <strong>Assigned To:</strong> {selectedComplaint.assignedTo || "Not yet assigned"}
                        </p>
                      </div>

                      <div className="assign-form">
                        <div className="form-group">
                          <label>Assign To:</label>
                          <select value={assignTo} onChange={(e) => setAssignTo(e.target.value)}>
                            <option value="">Unassigned</option>
                            {!assignSelectionExists && assignTo && (
                              <option value={assignTo}>{getAssignmentLabelFromValue(assignTo)}</option>
                            )}
                            {assignmentUsers.map((user) => {
                              const optionValue = getAssignmentValue(user.role, user.email);
                              return (
                                <option key={user.id} value={optionValue}>
                                  {getAssignmentLabel(user.role, user.email)}
                                </option>
                              );
                            })}
                          </select>
                        </div>

                        <div className="form-group">
                          <label>Message/Instructions:</label>
                          <textarea
                            rows="3"
                            placeholder="Add context for the assignee (optional)"
                            value={assignMessage}
                            onChange={(e) => setAssignMessage(e.target.value)}
                          ></textarea>
                        </div>

                        {assignmentError && <p className="inline-error">{assignmentError}</p>}

                        <button className="btn-primary" onClick={handleAssignComplaint}>
                          {selectedComplaint.assignedTo ? "Reassign" : "Assign"} Complaint
                        </button>
                      </div>
                    </div>
                  )}

                  {visibleTabs.includes("status") && activeTab === "status" && (
                    <div className="tab-content">
                      <h4>Status Management</h4>

                      <div className="current-status-display">
                        <p>
                          <strong>Current Status:</strong>
                        </p>
                        <span className={`status-badge ${getStatusClass(selectedComplaint.status)}`}>
                          {formatStatusLabel(selectedComplaint.status)}
                        </span>
                      </div>

                      <div className="status-form">
                        <div className="form-group">
                          <label>New Status:</label>
                          <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                            {STATUS_OPTIONS.map((statusValue) => (
                              <option key={statusValue} value={statusValue}>
                                {formatStatusLabel(statusValue)}
                              </option>
                            ))}
                          </select>
                        </div>
                        <button className="btn-primary" onClick={() => handleUpdateStatus(newStatus)}>
                          Update Status
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        {noteModalComplaint && (
          <div className="modal-overlay" onClick={closeNoteModal}>
            <div className="modal-container note-modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>
                  {getSharedNote(noteModalComplaint) ? "Update" : "Add"} Note - {noteModalComplaint.id}
                </h3>
                <button className="btn-close" onClick={closeNoteModal}>
                  ×
                </button>
              </div>
              <div className="modal-body">
                <p className="modal-subtext">
                  Notes are shared with admins and the assigned role ({noteRole?.toUpperCase()}).
                </p>
                <textarea
                  className="note-textarea"
                  placeholder="Write a quick update for this complaint..."
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                />
                {noteError && <p className="error-text">{noteError}</p>}
              </div>
              <div className="modal-footer">
                <button className="btn-secondary" onClick={closeNoteModal} disabled={isSavingNote}>
                  Cancel
                </button>
                <button
                  className="btn-primary"
                  onClick={handleSaveAdminNote}
                  disabled={isSavingNote}
                >
                  {isSavingNote
                    ? "Saving..."
                    : getSharedNote(noteModalComplaint)
                    ? "Update Note"
                    : "Add Note"}
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
    </div>
    );
  };

  const formatNoteTimestamp = (value) => {
    if (!value) return "Just now";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Just now";
    return date.toLocaleString();
  };

export default AdminMonitorComplaints;


