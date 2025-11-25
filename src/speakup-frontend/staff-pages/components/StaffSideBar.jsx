import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../../../styles/styles-staff/sidebar-staff.css';
import { doSignOut } from "../../../firebase/auth";

const StaffSideBar = () => {
  const navigate = useNavigate();

  const clearSession = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  };

  const handleLogout = async () => {
    try {
      await doSignOut();
    } catch (error) {
      console.error("Logout failed", error);
    } finally {
      clearSession();
      navigate("/adminlogin", { replace: true });
    }
  };

  const handleNavigation = (page) => {
    switch (page) {
      case "logout":
        handleLogout();
        break;
      case "dashboard":
        navigate("/sdashboard");
        break;
      case "monitor":
        navigate("/smonitorcomplaints");
        break;
      case "analytics":
        navigate("/sanalytics");
        break;
      case "notifications":
        navigate("/snotifications");
        break;
      default:
        console.error("Unknown navigation page:", page);
    }
  };

  return (
    <nav className="staff-sidebar-container">
      <div className="sidebar-content-wrapper">
        <div className="logo">
          <h1>SpeakUp</h1>
          <p>MSU-IIT Complaint System Admin</p>
        </div>
        
        <ul className="sidebar-links">
          <li 
            className={window.location.pathname === "/sdashboard" ? "active" : ""}
            onClick={() => handleNavigation("dashboard")}
          >
            <i className="fa-solid fa-gauge"></i> Dashboard
          </li>

          <li 
            className={window.location.pathname === "/smonitorcomplaints" ? "active" : ""}
            onClick={() => handleNavigation("monitor")}
          >
            <i className="fa-solid fa-file-lines"></i> Monitor Complaints
          </li>

         

          <li 
            className={window.location.pathname === "/sanalytics" ? "active" : ""}
            onClick={() => handleNavigation("analytics")}
          >
            <i className="fa-solid fa-chart-bar"></i> Reports & Analytics
          </li>

          <li 
            className={window.location.pathname === "/snotifications" ? "active" : ""}
            onClick={() => handleNavigation("notifications")}
          >
            <i className="fa-solid fa-bell"></i> Notifications
          </li>


          <li
            onClick={() => {
              const confirmLogout = window.confirm("Are you sure you want to log out?");
              if (confirmLogout) {
                handleNavigation("logout");
              }
            }}
          >
            <i className="fa-solid fa-right-from-bracket"></i> Logout
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default StaffSideBar;
