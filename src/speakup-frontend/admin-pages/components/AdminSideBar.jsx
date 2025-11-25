import React from 'react';
import { useNavigate } from 'react-router-dom';
import "../../../styles/styles-admin/sidebar-admin.css";
import { doSignOut } from "../../../firebase/auth";

const AdminSideBar = () => {
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
        navigate("/adashboard");
        break;
      case "monitor":
        navigate("/amonitorcomplaints");
        break;
      case "users":
        navigate("/amanageusers");
        break;
      case "analytics":
        navigate("/aanalytics");
        break;
      case "notifications":
        navigate("/anotifications");
        break;
      default:
        console.error("Unknown navigation page:", page);
    }
  };

  return (
    <nav className="admin-sidebar-container">
      <div className="sidebar-content-wrapper">
        <div className="logo">
          <h1>SpeakUp</h1>
          <p>MSU-IIT Complaint System Admin</p>
        </div>
        
        <ul className="sidebar-links">
          <li 
            className={window.location.pathname === "/adashboard" ? "active" : ""}
            onClick={() => handleNavigation("dashboard")}
          >
            <i className="fa-solid fa-gauge"></i> Dashboard
          </li>

          <li 
            className={window.location.pathname === "/amonitorcomplaints" ? "active" : ""}
            onClick={() => handleNavigation("monitor")}
          >
            <i className="fa-solid fa-file-lines"></i> Monitor Complaints
          </li>

          <li 
            className={window.location.pathname === "/amanageusers" ? "active" : ""}
            onClick={() => handleNavigation("users")}
          >
            <i className="fa-solid fa-users"></i> User Management
          </li>

          <li 
            className={window.location.pathname === "/aanalytics" ? "active" : ""}
            onClick={() => handleNavigation("analytics")}
          >
            <i className="fa-solid fa-chart-bar"></i> Reports & Analytics
          </li>

          <li 
            className={window.location.pathname === "/anotifications" ? "active" : ""}
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

export default AdminSideBar;
