import React from 'react';
import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/authContext';
import { useAdminNotifications } from '../../../hooks/useAdminNotifications';
import { doSignOut } from "../../../firebase/auth";
import "@fortawesome/fontawesome-free/css/all.min.css"; 
import '../../../styles/styles-admin/navbar-admin.css'

// Assuming the necessary styles (including the fixed positioning logic) 
// are correctly loaded from main-styles.css or a similar file in the parent component.

const AdminNavbar = () => {
    // Hooks for navigation and location tracking
    const { currentUser, userRole } = useAuth(); 
    const location = useLocation();
    const navigate = useNavigate();
    const userName = currentUser ? currentUser.displayName || currentUser.email.split('@')[0] : "LoL";
    const userInitials = userName
        .split(' ') // Split the string by spaces (e.g., "Marhamah Ali" -> ["Marhamah", "Ali"])
        .map(n => n[0]) // Take the first letter of each word (e.g., ["M", "A"])
        .join('') // Join the letters together (e.g., "MA")
        .toUpperCase(); // Ensure they are uppercase
    const { unreadCount: unreadNotifications } = useAdminNotifications();

    // --- State for Dropdown and Modal ---
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isAboutModalOpen, setIsAboutModalOpen] = useState(false);
    
    // Reference to the profile pill div to close the menu when clicking outside
    const menuRef = useRef(null);
    
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
        // Strip leading/trailing slashes and normalize the path
        const normalizedPath = path.toLowerCase().replace(/^\/|\/$/g, '');
        
        switch (normalizedPath) {
            case "adashboard":
                return "Dashboard";
            case "amonitorcomplaints":
                return "Monitor Student Complaints";
            case "amanageusers":
                return "User Management";
            case "aanalytics":
                return "Reports & Analytics";
            case "anotifications":
                return "Notifications";
            case "asettings":
                return "Settings";
            case "login":
            case "login":
                return "Login"; // Should typically not see the navbar here, but included for completeness
            default:
                // Handle cases like nested routes (e.g., /history/123)
                if (normalizedPath.startsWith('adashboard/')) {
                    return "Complaint Details"; 
                }
                return "";
        }
    };

    // 1. Toggle the dropdown menu
    const handleProfileClick = () => {
        setIsDropdownOpen(prev => !prev);
    };

    // 2. Handle Logout
    const handleLogout = async () => {
        try {
            await doSignOut(); // Your Firebase sign-out function
            navigate('/adminlogin'); // Redirect to login page
        } catch (error) {
            console.error("Logout failed:", error);
            // Optionally show an error message
        }
    };
    
    // 3. Handle About Modal
    const handleOpenAboutModal = () => {
        setIsDropdownOpen(false); // Close dropdown first
        setIsAboutModalOpen(true); // Open the modal
    };

    // 4. Close modal
    const handleCloseAboutModal = () => {
        setIsAboutModalOpen(false);
    };
    
    // --- Outside Click Listener Effect ---
    useEffect(() => {
        function handleClickOutside(event) {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        }
        // Bind the event listener
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            // Unbind the event listener on cleanup
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [menuRef]);

    // Handler for the primary button click
    const handleFileComplaint = () => {
        navigate("/admin-monitoring"); 
    };

    // Handler for the notification bell
    const handleNotifications = () => {
        navigate("/anotifications"); 
    };

    // --- Render ---

    return (
        // The 'main-navbar' class implements the fixed/sticky position and clean styling
        <div className="admin-main-navbar">
            
            {/* 1. PAGE TITLE GROUP (Greeting and Dynamic Title) */}
            <div className="admin-page-title-group">
                {/* Dynamically set the page title */}
                <p className="admin-welcome-greeting">{getGreeting()}, {userRole || "Admin"} {userName}!</p> 
                <h1 className="admin-page-title">{getPageTitle(location.pathname)}</h1>
            </div>

            {/* 2. HEADER ACTIONS (Button, Bell, User Info) */}
            <div className="admin-header-actions">

                {/* Notification Bell/Indicator */}
                <button 
                    className="icon-button notification-bell" 
                    onClick={handleNotifications}
                    aria-label={`You have ${unreadNotifications} unread notifications`}
                >
                    <i className="fas fa-bell"></i>
                    {unreadNotifications > 0 && (
                        <span className="admin-notification-badge">{unreadNotifications}</span>
                    )}
                </button>

               
                
                {/* --- CLICKABLE PROFILE PILL --- */}
                <div 
                    className="user-info clickable" 
                    onClick={handleProfileClick}
                >
                    <div className="user-details">
                        <span className="name">{userName}</span>
                        <span className="role">{userRole || "Admin"}</span>
                    </div>
                    {/* CSS-styled initials badge */}
                    <div className="user-avatar-badge">
                        {userInitials}
                    </div>
                    <i className={`fas fa-caret-down dropdown-arrow ${isDropdownOpen ? 'rotated' : ''}`}></i>
                </div>

                {/* --- DROPDOWN MENU --- */}
                {isDropdownOpen && (
                    <div className="profile-dropdown-menu">
                        <button onClick={handleOpenAboutModal} className="menu-item">
                            <i className="fas fa-info-circle"></i> About SpeakUp
                        </button>
                        <button onClick={handleLogout} className="menu-item logout">
                            <i className="fas fa-sign-out-alt"></i> Logout
                        </button>
                    </div>
                )}

                {/* --- ABOUT INFO MODAL --- */}
            {isAboutModalOpen && (
                <AboutInfoModal onClose={handleCloseAboutModal} />
            )}

            </div>
        </div>
    );
}

// Example component for the modal (needs separate definition)
const AboutInfoModal = ({ onClose }) => (
    <div className="modal-backdrop">
        <div className="modal-content">
            <h3>About SpeakUp</h3>
            <p>MSU-IIT Complaint System. Version 1.0. Developed by [Your Group Name].</p>
            <button onClick={onClose}>Close</button>
        </div>
    </div>
);

export default AdminNavbar;
