import React from 'react'; 
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/authContext';
import "@fortawesome/fontawesome-free/css/all.min.css"; 
import "../../../styles/styles-student/navbar-student.css"
import { useNotifications } from '../../../contexts/notificationsContext';

const MainNavbar = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { currentUser, userRole } = useAuth();

    // Extract first name for greeting message
    const firstName = currentUser?.displayName?.split(" ")[0] || 
                      currentUser?.email?.split("@")[0] || 
                      "User";

    // Extract full name or default to email prefix
    const userName = currentUser ? currentUser.displayName || currentUser.email.split('@')[0] : "Guest";
    
    const getUserInitials = () => {
        if (!currentUser) return "GU";
        
        if (currentUser.displayName) {
            const nameParts = currentUser.displayName.trim().split(" ");
            
            if (nameParts.length === 1) {
                return nameParts[0].charAt(0).toUpperCase();
            }
            
            const firstInitial = nameParts[0].charAt(0).toUpperCase();
            const lastInitial = nameParts[nameParts.length - 1].charAt(0).toUpperCase();
            
            return firstInitial + lastInitial;
        }
        
        const emailPrefix = currentUser.email.split('@')[0];
        return emailPrefix.substring(0, 2).toUpperCase();
    };
    
    const { unreadCount } = useNotifications();

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good Morning";
        if (hour < 18) return "Good Afternoon";
        return "Good Evening";
    };

    const getPageTitle = (path) => {
        const normalizedPath = path.toLowerCase().replace(/^\/|\/$/g, '');
        
        switch (normalizedPath) {
            case "dashboard":
                return "Dashboard";
            case "file-complaint":
                return "File Complaint";
            case "history":
                return "Complaint History";
            case "notifications":
                return "Notifications";
            case "student/login":
            case "login":
                return "Login";
            default:
                if (normalizedPath.startsWith('history/')) {
                    return "Complaint Details"; 
                }
                return "";
        }
    };

    const handleFileComplaint = () => navigate("/file-complaint"); 
    const handleNotifications = () => navigate("/notifications"); 

    return (
        <div className="student-main-navbar">
            <div className="page-title-group">

                {/* MAIN GREETING */}
                <p className="welcome-greeting">
                    {getGreeting()}, {firstName}. <span className="welcome-subtext-inline">It’s great to see you back on SpeakUp.</span>
                </p>
                <h1 className="page-title">{getPageTitle(location.pathname)}</h1>
            </div>

            <div className="header-actions">
                <button 
                    className="icon-button notification-bell" 
                    onClick={handleNotifications}
                    aria-label={`You have ${unreadCount} unread notifications`}
                >
                    <i className="fas fa-bell"></i>
                    {unreadCount > 0 && (
                        <span className="notification-badge">{unreadCount}</span>
                    )}
                </button>

                <button 
                    className="btn-primary" 
                    onClick={handleFileComplaint}
                >
                    <i className="fas fa-plus-circle"></i> File New Complaint
                </button>
                
                <div className="user-info">
                    <div className="user-details">
                        <span className="name">{userName}</span>
                        <span className="role">{userRole || ""}</span>
                    </div>
                    <div className="user-avatar-badge">
                        {getUserInitials()}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default MainNavbar;
