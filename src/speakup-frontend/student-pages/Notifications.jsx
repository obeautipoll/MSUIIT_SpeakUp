// student notifivation 

import React, { useEffect, useMemo, useRef, useState } from "react";
import "../../styles/styles-student/notification.css";
import SideBar from "./components/SideBar";
import MainNavbar from "./components/MainNavbar";
import { useNotifications } from "../../contexts/notificationsContext";
import { useNavigate } from "react-router-dom";



const Notifications = () => {
  const [activeTab, setActiveTab] = useState("all");
  const navigate = useNavigate();
  const { notifications, loading, lastSeenAt, markAllSeen, markSeenUpTo } = useNotifications();

  // Persistently dismissed notifications (survives refresh/logout)
  const DISMISSED_KEY = "student_notifications_dismissed";
  const [dismissed, setDismissed] = useState(() => {
    try {
      const raw = localStorage.getItem(DISMISSED_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch { return []; }
  });
  useEffect(() => {
    try { localStorage.setItem(DISMISSED_KEY, JSON.stringify(dismissed)); } catch {}
  }, [dismissed]);
  const dismissedSet = useMemo(() => new Set(dismissed), [dismissed]);

  // Undo support for deletions
  const [lastDeleted, setLastDeleted] = useState([]); // array of ids
  const undoTimerRef = useRef(null);
  const handleUndoDelete = () => {
    if (!lastDeleted.length) return;
    if (undoTimerRef.current) { try { clearTimeout(undoTimerRef.current); } catch {} undoTimerRef.current = null; }
    setDismissed((prev) => prev.filter((id) => !lastDeleted.includes(id)));
    setLastDeleted([]);
  };

  // Auto-hide Undo banner after 10s
  useEffect(() => {
    if (undoTimerRef.current) { try { clearTimeout(undoTimerRef.current); } catch {} undoTimerRef.current = null; }
    if (lastDeleted.length > 0) {
      undoTimerRef.current = setTimeout(() => {
        setLastDeleted([]);
        undoTimerRef.current = null;
      }, 10000);
    }
    return () => {
      if (undoTimerRef.current) { try { clearTimeout(undoTimerRef.current); } catch {} undoTimerRef.current = null; }
    };
  }, [lastDeleted]);

  const getCategoryLabel = (cat) => {
    const labels = {
      academic: "Academic",
      "faculty-conduct": "Faculty Conduct",
      facilities: "Facilities",
      "administrative-student-services": "Administrative/Student Services",
      other: "Other",
    };
    return labels[cat] || (cat || "");
  };

  const filtered = useMemo(() => {
    if (activeTab === "unread") {
      return notifications.filter((n) => n.date > lastSeenAt && !dismissedSet.has(n.id));
    }
    return notifications.filter((n) => !dismissedSet.has(n.id));
  }, [notifications, activeTab, lastSeenAt, dismissedSet]);

  const handleDeleteOne = (id) => {
    const ok = window.confirm("Delete this notification?");
    if (!ok) return;
    setDismissed((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setLastDeleted([id]);
  };

  const handleDeleteAll = () => {
    const ok = window.confirm("Delete all notifications? This cannot be undone.");
    if (!ok) return;
    const allIds = notifications.map((n) => n.id);
    const toAdd = allIds.filter((id) => !dismissedSet.has(id));
    setDismissed((prev) => Array.from(new Set([...prev, ...allIds])));
    setLastDeleted(toAdd);
  };


  return (
    <div id="notificationsPage" className="container">
      <SideBar />

      {/* Main Content */}
      <div className="main-content">
        <MainNavbar/>

        {/* Tabs */}
        <div className="tabs">
          <div
            className={`tab ${activeTab === "all" ? "active" : ""}`}
            onClick={() => setActiveTab("all")}
          >
            All
          </div>
          <div
            className={`tab ${activeTab === "unread" ? "active" : ""}`}
            onClick={() => setActiveTab("unread")}
          >
            Unread
          </div>
        </div>

        {/* Actions */}
        <div className="actions" style={{ display: "flex", gap: 8, justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ color: '#374151', fontSize: 14 }}>
            {lastDeleted.length > 0 && (
              <>
                Deleted {lastDeleted.length} notification{lastDeleted.length > 1 ? 's' : ''}.
                <button onClick={handleUndoDelete} style={{ marginLeft: 8, color: '#1d4ed8', background: 'transparent', border: 'none', cursor: 'pointer' }}>Undo</button>
              </>
            )}
          </div>
          <button className="btn-primary" onClick={markAllSeen} disabled={loading}>
            Mark all as read
          </button>
          <button className="btn-primary" style={{ background: "#b91c1c" }} onClick={handleDeleteAll} disabled={loading || notifications.length === 0}>
            Delete all
          </button>
        </div>

        {/* Notification List */}
        <div className="notification-container">
          {loading && (
            <div className="notification-item skeleton"><p>Loading notifications…</p></div>
          )}
          {!loading && filtered.map((notif) => (
            <div
              key={notif.id}
              className={`notification-item ${
                notif.date > lastSeenAt ? "unread" : "read"
              }`}
              onClick={() => {
                markSeenUpTo(notif.date);
                navigate("/history", { state: { complaintId: notif.complaintId, focusTab: notif.type === 'feedback' ? 'feedback' : 'details' } });
              }}
            >
              <button
                aria-label="Delete notification"
                onClick={(e) => { e.stopPropagation(); handleDeleteOne(notif.id); }}
                style={{ position: 'absolute', top: 8, right: 8, border: 'none', background: 'transparent', cursor: 'pointer', color: '#6b7280' }}
              >
                <i className="fas fa-trash"></i>
              </button>
              <p>
                {notif.type === 'feedback' && (
                  <>New feedback on your complaint</>
                )}
                {notif.type === 'status' && (
                  <>{notif.message.replace(/\.$/, '')}</>
                )}
                {notif.category && (
                  <span style={{ marginLeft: 8, padding: '2px 8px', borderRadius: 8, background: '#eef2ff', color: '#3730a3', fontSize: 12 }}>
                    {getCategoryLabel(notif.category)}
                  </span>
                )}
              </p>
              <small>{new Date(notif.date).toLocaleString()}</small>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Notifications;
