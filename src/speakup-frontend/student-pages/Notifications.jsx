import React, { useEffect, useMemo, useRef, useState } from "react";
import SideBar from "./components/SideBar";
import MainNavbar from "./components/MainNavbar";
import { useNotifications } from "../../contexts/notificationsContext";
import { useNavigate } from "react-router-dom";

const Notifications = () => {
  const [activeTab, setActiveTab] = useState("all");
  const navigate = useNavigate();
  const { notifications, loading, lastSeenAt, markAllSeen, markSeenUpTo } = useNotifications();

  // --- Logic Section ---
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
  // --- End Logic Section ---

  return (
    <div className="flex min-h-screen font-sans overflow-x-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap');
        body { font-family: 'Poppins', sans-serif; }
      `}</style>
      
      {/* Sidebar - Fixed Position with High Z-Index */}
      <div className="min-h-screen bg-gray-50 flex">
        <SideBar />

      {/* Main Content Area */}
      <div className="flex-1 w-full md:ml-[280px] transition-all duration-300 relative z-0">
        {/* Adjusted padding: md:pt-32 ensures content starts below the Navbar */}
        <div className="p-4 pt-18 md:p-10 md:pt-24">
          
          <MainNavbar />

          {/* Added mt-10 to push the controls down further from the Navbar */}
          <div className="max-w-7xl mx-auto mt-16 relative z-0">
            
            {/* --- CONTROLS SECTION --- */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                
                {/* 1. Filter Buttons (All / Unread) */}
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <span className="text-gray-500 text-sm font-medium mr-2 hidden md:inline">Filter:</span>
                  <button
                    onClick={() => setActiveTab("all")}
                    className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                      activeTab === "all"
                        ? "bg-[#8B0000] text-white shadow-md"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setActiveTab("unread")}
                    className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                      activeTab === "unread"
                        ? "bg-[#8B0000] text-white shadow-md"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    Unread
                  </button>
                </div>

                {/* 2. Undo Action (Conditional) */}
                {lastDeleted.length > 0 && (
                  <div className="text-sm text-gray-600 bg-red-50 px-3 py-1.5 rounded-lg border border-red-100 flex items-center gap-2">
                    <span>Deleted {lastDeleted.length} item(s)</span>
                    <button onClick={handleUndoDelete} className="text-blue-600 font-bold hover:underline">Undo</button>
                  </div>
                )}

                {/* 3. Global Actions (Mark Read / Delete All) */}
                <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                   <button 
                    onClick={markAllSeen} 
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 hover:text-[#8B0000] transition-colors whitespace-nowrap"
                  >
                    <i className="fas fa-check-double"></i>
                    Mark all as read
                  </button>
                  
                  <button 
                    onClick={handleDeleteAll} 
                    disabled={loading || notifications.length === 0}
                    className="
                      flex items-center gap-2 px-4 py-2 bg-[#991b1b] text-white rounded-lg text-sm font-medium shadow-sm 
                      hover:bg-[#991b1b] transition-all whitespace-nowrap
                      
                      // --- MODIFIED DISABLED STYLES ---
                      disabled:opacity-100 disabled:bg-red-100 disabled:text-gray-400 disabled:border disabled:border-red-300
                      disabled:cursor-not-allowed
    "
                  >
                    <i className="fas fa-trash-alt"></i>
                    Delete all
                  </button>
                </div>

              </div>
            </div>

            {/* --- NOTIFICATIONS TABLE --- */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden relative z-0">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Notification Message
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-4 text-center text-xs font-bold text-gray-500 uppercase tracking-wider w-24">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {loading && (
                      <tr>
                        <td colSpan="4" className="px-6 py-12 text-center text-gray-400">
                          <div className="animate-pulse">Loading notifications...</div>
                        </td>
                      </tr>
                    )}
                    
                    {!loading && filtered.length === 0 && (
                      <tr>
                        <td colSpan="4" className="px-6 py-16 text-center text-gray-400">
                          <i className="fas fa-inbox text-4xl mb-3 opacity-20 block"></i>
                          No notifications found
                        </td>
                      </tr>
                    )}

                    {!loading && filtered.map((notif) => {
                      const isUnread = notif.date > lastSeenAt;
                      
                      return (
                        <tr 
                          key={notif.id}
                          onClick={() => {
                            markSeenUpTo(notif.date);
                            navigate("/history", { state: { complaintId: notif.complaintId, focusTab: notif.type === 'feedback' ? 'feedback' : 'details' } });
                          }}
                          className={`
                            group transition-colors duration-150 cursor-pointer
                            ${isUnread ? 'bg-red-50/60 hover:bg-red-50' : 'hover:bg-gray-50'}
                          `}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {isUnread && (
                                <span className="flex-shrink-0 w-2.5 h-2.5 rounded-full bg-[#DC143C] shadow-sm" title="Unread"></span>
                              )}
                              <p className={`text-sm ${isUnread ? 'font-bold text-[#8B0000]' : 'font-medium text-gray-800'}`}>
                                {notif.type === 'feedback' && "New feedback on your complaint"}
                                {notif.type === 'status' && notif.message.replace(/\.$/, '')}
                              </p>
                            </div>
                          </td>
                          
                          <td className="px-6 py-4 whitespace-nowrap">
                            {notif.category ? (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                                {getCategoryLabel(notif.category)}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-xs">-</span>
                            )}
                          </td>
                          
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(notif.date).toLocaleString()}
                          </td>
                          
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteOne(notif.id); }}
                              className="text-gray-400 hover:text-[#b91c1c] w-8 h-8 rounded-full hover:bg-red-50 flex items-center justify-center transition-all"
                              title="Delete"
                            >
                              <i className="fas fa-trash"></i>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
           </div> 
          </div>
        </div>
      </div>
    </div>
  );
};

export default Notifications;