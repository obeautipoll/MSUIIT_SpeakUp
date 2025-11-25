import React, { useEffect, useMemo, useRef, useState } from "react";
import "../../styles/styles-admin/notifs-admin.css";
import SideBar from "./components/AdminSideBar";
import AdminNavbar from "./components/AdminNavBar";
import { useAdminNotifications } from "../../hooks/useAdminNotifications";
import { useNavigate } from "react-router-dom";

const AdminNotifications = () => {
  const [activeTab, setActiveTab] = useState("all");
  const navigate = useNavigate();
  const { notifications, loading, lastSeenAt, markAllSeen, markSeenUpTo } = useAdminNotifications();

  // Persistently dismissed list
  const DISMISSED_KEY = "admin_notifications_dismissed";
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
  const [lastDeleted, setLastDeleted] = useState([]);
  const undoTimerRef = useRef(null);
  const handleUndoDelete = () => {
    if (!lastDeleted.length) return;
    if (undoTimerRef.current) { try { clearTimeout(undoTimerRef.current); } catch {} undoTimerRef.current = null; }
    setDismissed((prev) => prev.filter((id) => !lastDeleted.includes(id)));
    setLastDeleted([]);
  };
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

  const filtered = useMemo(() => (activeTab === "unread" ? notifications.filter((n) => n.date > lastSeenAt) : notifications), [notifications, activeTab, lastSeenAt]);
  const shown = useMemo(() => filtered.filter((n)=> !dismissedSet.has(n.id)), [filtered, dismissedSet]);

  const handleDeleteOne = (id) => {
    if (!window.confirm("Delete this notification?")) return;
    setDismissed((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setLastDeleted([id]);
  };
  const handleDeleteAll = () => {
    if (!window.confirm("Delete all notifications? This cannot be undone.")) return;
    const allIds = notifications.map((n)=> n.id);
    const toAdd = allIds.filter((id) => !dismissedSet.has(id));
    setDismissed((prev) => Array.from(new Set([...prev, ...allIds])));
    setLastDeleted(toAdd);
  };

  return (
    <div id="notificationsPage" className="container">
      <SideBar />

      <div className="main-content">
        <AdminNavbar />

        <div className="tabs">
          <div className={`tab ${activeTab === "all" ? "active" : ""}`} onClick={() => setActiveTab("all")}>All</div>
          <div className={`tab ${activeTab === "unread" ? "active" : ""}`} onClick={() => setActiveTab("unread")}>Unread</div>
        </div>

        <div className="actions" style={{ display: "flex", gap: 8, justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={{ color: '#374151', fontSize: 14 }}>
            {lastDeleted.length > 0 && (
              <>
                Deleted {lastDeleted.length} notification{lastDeleted.length > 1 ? 's' : ''}.
                <button onClick={handleUndoDelete} style={{ marginLeft: 8, color: '#1d4ed8', background: 'transparent', border: 'none', cursor: 'pointer' }}>Undo</button>
              </>
            )}
          </div>
          <div>
            <button className="btn-primary" onClick={markAllSeen} disabled={loading} style={{ marginRight: 8 }}>Mark all as read</button>
            <button className="btn-primary" style={{ background: "#b91c1c" }} onClick={handleDeleteAll} disabled={loading || notifications.length===0}>Delete all</button>
          </div>
        </div>

        <div className="notification-container">
          {loading && (<div className="notification-item skeleton"><p>Loading notifications…</p></div>)}
          {!loading && shown.map((n) => (
            <div
              key={n.id}
              className={`notification-item ${n.date > lastSeenAt ? "unread" : "read"}`}
              onClick={() => {
                markSeenUpTo(n.date);
                const focusTab = n.type === 'feedback' ? 'feedback' : (n.type === 'status' ? 'status' : 'details');
                navigate('/amonitorcomplaints', { state: { complaintId: n.complaintId, focusTab } });
              }}
            >
              <button
                aria-label="Delete notification"
                onClick={(e) => { e.stopPropagation(); handleDeleteOne(n.id); }}
                style={{ position: 'absolute', top: 8, right: 8, border: 'none', background: 'transparent', cursor: 'pointer', color: '#6b7280' }}
              >
                <i className="fas fa-trash"></i>
              </button>
              <p>
                {n.title}
                {n.category && (
                  <span style={{ marginLeft: 8, padding: '2px 8px', borderRadius: 8, background: '#eef2ff', color: '#3730a3', fontSize: 12 }}>
                    {n.category}
                  </span>
                )}
              </p>
              <small>{new Date(n.date).toLocaleString()}</small>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminNotifications;
