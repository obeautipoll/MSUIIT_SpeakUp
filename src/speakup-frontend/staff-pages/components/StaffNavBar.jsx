import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import "@fortawesome/fontawesome-free/css/all.min.css"; 
import { useAuth } from '../../../contexts/authContext';
import "../../../styles/styles-staff/navbar-staff.css";
import { useStaffNotifications } from '../../../hooks/useStaffNotifications';


const StaffNavBar = () => {
    // Hooks for navigation and location tracking
    const { currentUser, userRole } = useAuth();
    const [roleLabel, setRoleLabel] = useState('Staff Role');
    const [staffRole, setStaffRole] = useState(null);
    const location = useLocation();
    const navigate = useNavigate();
    const userName = currentUser ? currentUser.displayName || currentUser.email.split('@')[0] : "User"; // Changed default from LoL to User
    const userInitials = userName.split(' ').map(n => n[0]).join('').toUpperCase();
    const { unreadCount: unreadNotifications } = useStaffNotifications(); // Assuming useAuth provides unreadCount for staff

    useEffect(() => {
        try {
          const storedUser = JSON.parse(localStorage.getItem('user'));
          if (storedUser?.role) {
            setRoleLabel(storedUser.role);
            setStaffRole(storedUser.role.toLowerCase());
          } else {
            setStaffRole('');
          }
        } catch (error) {
          console.error('Failed to parse stored user for role:', error);
          setStaffRole('');
        }
      }, []);
    
    // --- Helper Functions ---

    // Determine the greeting based on time of day (Mock for display)
    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good Morning";
        if (hour < 18) return "Good Afternoon";
        return "Good Evening";
    };

    // Determine the page title based on the current URL path
    const getPageTitle = (path) => {
        const normalizedPath = path.toLowerCase().replace(/^\/|\/$/g, '');
        
        switch (normalizedPath) {
            case "sdashboard":
                return "Dashboard";
            case "smonitorcomplaints":
                return "Monitor Complaints";
            case "sanalytics":
                return "Reports & Analytics";
            case "snotifications": 
                return "Notifications";
            case "/adminlogin":
            case "login":
                return "Login";
            default:
                // FIX A: Changed dashboard/ to sdashboard/
                if (normalizedPath.startsWith('sdashboard/')) { 
                    return "Complaint Details"; 
                }
                return "";
        }
    };

    // FIX B: Handler for the primary button click - Updated navigation route
    const handleFileComplaint = () => {
        navigate("/smonitorcomplaints"); 
    };

    // FIX B: Handler for the notification bell - Updated navigation route
    const handleNotifications = () => {
        navigate("/snotifications"); 
    };

    // --- Render ---

    return (
        <div className="staff-main-navbar">
            
            {/* 1. PAGE TITLE GROUP (Greeting and Dynamic Title) */}
            <div className="page-title-group">
                {/* FIX 1: Default to STAFF (or KASAMA) if role is missing, and uppercase it */}
                <p className="welcome-greeting">{getGreeting()}, {userName}!</p> 
                <h1 className="staff-page-title">{getPageTitle(location.pathname)}</h1>
            </div>

            {/* 2. HEADER ACTIONS (Button, Bell, User Info) */}
            <div className="staff-header-actions">

                {/* Notification Bell/Indicator */}
                <button 
                    className="staff-icon-button notification-bell" 
                    onClick={handleNotifications}
                    aria-label={`You have ${unreadNotifications} unread notifications`}
                >
                    <i className="fas fa-bell"></i>
                    {unreadNotifications > 0 && (
                        <span className="staff-notification-badge">{unreadNotifications}</span>
                    )}
                </button>
                
                {/* User Info (Profile Pill) */}
                <div className="staff-user-info">
                    <div className="staff-user-details">
                        <span className="name">{userName}</span>
                        <span className="role">{roleLabel || 'Staff Role'}</span> 
                    </div>
                    <div className="staff-user-avatar-badge">
                        {userInitials}
                    </div>
                </div>
            </div>
        </div>
    );
}
export default StaffNavBar;