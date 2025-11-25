import React from 'react';
import { useNavigate } from 'react-router-dom'; // Assuming you are using react-router-dom v6+
import "../../../styles/styles-student/sidebar.css"; // Optional: for component-specific styling
import { doSignOut } from "../../../firebase/auth"; // Firebase Sign-Out function

const SideBar = () => {
  const navigate = useNavigate();

  const clearSession = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  };

  // Function to handle logout
  const handleLogout = async () => {
    try {
      await doSignOut();
    } catch (err) {
      console.error("Logout failed", err);
    } finally {
      clearSession();
      navigate("/login", { replace: true });
    }
  };

  // Function to handle navigation
  const handleNavigation = (page) => {
    switch (page) {
      case "logout":
        const confirmLogout = window.confirm("Are you sure you want to log out?");
        if (confirmLogout) {
          handleLogout(); // Call the logout function
        }
        break;
      case "dashboard":
        navigate("/dashboard");
        break;
      case "file-complaint":
        navigate("/file-complaint");
        break;
      case "history":
        navigate("/history");
        break;
      case "notifications":
        navigate("/notifications");
        break;
      default:
        console.error("Unknown navigation page:", page);
    }
  };

  // Helper function to check if the current path matches
  const isActive = (path) => window.location.pathname === path ? "active" : "";

  return (
    <nav className="student-sidebar-container">
      <div className="student-sidebar-content-wrapper">
        <div className="logo">
          <h1>SpeakUp</h1>
          <p>MSU-IIT Complaint System</p>
        </div>
        
        <ul className="student-sidebar-links">
          <li 
            className={isActive("/dashboard")}
            onClick={() => handleNavigation("dashboard")}
          >
            <i className="fas fa-home"></i> Dashboard
          </li>

          <li 
            className={isActive("/file-complaint")}
            onClick={() => handleNavigation("file-complaint")}
          >
            <i className="fa-solid fa-pen-to-square"></i> File Complaint
          </li>

          <li 
            className={isActive("/history")}
            onClick={() => handleNavigation("history")}
          >
            <i className="fa-solid fa-clock-rotate-left"></i> Complaint History
          </li>
          
          <li 
            className={isActive("/notifications")}
            onClick={() => handleNavigation("notifications")}
          >
            <i className="fas fa-bell"></i> Notification
          </li>

          <li
            onClick={() => handleNavigation("logout")}
          >
            <i className="fas fa-sign-out-alt"></i> Logout
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default SideBar;
