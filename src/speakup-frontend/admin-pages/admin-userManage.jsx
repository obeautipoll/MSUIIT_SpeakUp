import React, { useEffect, useMemo, useState } from "react";
import { collection, deleteDoc, doc, getDocs, orderBy, query, setDoc, updateDoc } from "firebase/firestore";
import "../../styles/styles-admin/userManage.css";
import AdminSideBar from "./components/AdminSideBar";
import AdminNavbar from "./components/AdminNavBar";
import ApprovedAccountsTable from "./components/ApprovedTable";
import { db, firebaseConfig } from "../../firebase/firebase";
import { getAuth, createUserWithEmailAndPassword, signOut as firebaseSignOut } from "firebase/auth";
import { getApps, initializeApp } from "firebase/app";

const ROLE_OPTIONS = [
  { value: "staff", label: "Staff" },
  { value: "kasama", label: "KASAMA" },
];

const ALLOWED_ROLES = ROLE_OPTIONS.map((role) => role.value);

const getSecondaryStaffAuth = (() => {
  let cachedAuth = null;
  return () => {
    if (cachedAuth) return cachedAuth;
    const appName = "StaffCreationApp";
    const existingApp = getApps().find((application) => application.name === appName);
    const staffApp = existingApp || initializeApp(firebaseConfig, appName);
    cachedAuth = getAuth(staffApp);
    return cachedAuth;
  };
})();

const deleteAuthAccount = async (uid) => {
  if (!uid) {
    throw new Error("Missing target account.");
  }

  const apiKey = firebaseConfig?.apiKey;
  const projectId = firebaseConfig?.projectId;
  if (!apiKey || !projectId) {
    throw new Error("Authentication configuration is incomplete.");
  }

  const endpoint = `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:delete?key=${apiKey}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ localId: uid }),
  });

  if (response.ok) {
    return;
  }

  let details = null;
  try {
    details = await response.json();
  } catch {
    // ignore parse errors and fall back to generic message
  }

  if (details?.error?.message === "USER_NOT_FOUND") {
    return;
  }

  throw new Error(details?.error?.message || "Failed to remove authentication record.");
};

const formatDate = (value) => {
  if (!value) return "Not set";
  if (typeof value.toDate === "function") {
    try {
      return value.toDate().toLocaleDateString();
    } catch {
      return "Invalid date";
    }
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "Invalid date" : parsed.toLocaleDateString();
};

const AdminUserManage = () => {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    fullName: "",
    email: "",
    office: "",
    role: "staff",
    password: "",
    confirmPassword: "",
  });
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [formError, setFormError] = useState("");

  const [deletingUserId, setDeletingUserId] = useState(null);


  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersQuery = query(collection(db, "users"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(usersQuery);
        const fetched = snapshot.docs.map((document) => ({
          id: document.id,
          ...document.data(),
        }));
        setUsers(fetched);
        setError(null);
      } catch (err) {
        console.error("Error fetching users:", err);
        setError("Unable to load user list right now.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, []);

    useEffect(() => {
  if (isCreateModalOpen) {
    document.body.classList.add("modal-open");
  } else {
    document.body.classList.remove("modal-open");
  }

  return () => document.body.classList.remove("modal-open"); 
}, [isCreateModalOpen]);


  const managedUsers = useMemo(
    () => users.filter((user) => ALLOWED_ROLES.includes((user.role || "").toLowerCase())),
    [users]
  );

  const registeredStudents = useMemo(
    () => users.filter((user) => (user.role || "").toLowerCase() === "student"),
    [users]
  );

  const handleRoleChange = async (userId, newRole) => {
    try {
      setUsers((prev) =>
        prev.map((user) => (user.id === userId ? { ...user, role: newRole } : user))
      );
      await updateDoc(doc(db, "users", userId), { role: newRole });
    } catch (err) {
      console.error("Failed to update role:", err);
      setError("Unable to update role right now.");
    }
  };

  const handleDeleteUser = async (userId) => {
    const confirmed = window.confirm("Delete this staff profile? This action cannot be undone.");
    if (!confirmed) return;

    try {
      setDeletingUserId(userId);
      await deleteAuthAccount(userId);
      await deleteDoc(doc(db, "users", userId));
      setUsers((prev) => prev.filter((user) => user.id !== userId));
    } catch (err) {
      console.error("Failed to delete user:", err);
      setError("Unable to delete user right now.");
    } finally {
      setDeletingUserId(null);
    }
  };

  const openCreateModal = () => {
    setCreateForm({
      fullName: "",
      email: "",
      office: "",
      role: "staff",
      password: "",
      confirmPassword: "",
    });
    setFormError("");
    setIsCreateModalOpen(true);
  };

  const closeCreateModal = () => {
    if (isSavingUser) return;
    setIsCreateModalOpen(false);
  };

  const handleCreateInputChange = (field, value) => {
    setCreateForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateStaff = async (event) => {
    event.preventDefault();
    setFormError("");

    if (!createForm.fullName.trim() || !createForm.email.trim()) {
      setFormError("Full name and email are required.");
      return;
    }

    if (createForm.password.length < 6) {
      setFormError("Password must be at least 6 characters long.");
      return;
    }

    if (createForm.password !== createForm.confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }

    setIsSavingUser(true);
    let secondaryAuthInstance = null;
    try {
      secondaryAuthInstance = getSecondaryStaffAuth();
      const normalizedEmail = createForm.email.trim().toLowerCase();

      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuthInstance,
        normalizedEmail,
        createForm.password
      );

      const payload = {
        name: createForm.fullName.trim(),
        email: normalizedEmail,
        office: createForm.office.trim(),
        role: createForm.role,
        createdAt: new Date(),
      };

      await setDoc(doc(db, "users", userCredential.user.uid), payload);
      setUsers((prev) => [{ id: userCredential.user.uid, ...payload }, ...prev]);
      closeCreateModal();

    } catch (err) {
      console.error("Failed to create staff profile:", err);
      setFormError("Unable to create staff profile right now.");
    } finally {
      if (secondaryAuthInstance) {
        await firebaseSignOut(secondaryAuthInstance).catch(() => {});
      }
      setIsSavingUser(false);
    }
  };

  return (
    <div className="user-management-container">
      <AdminSideBar />
      <AdminNavbar />

      <div className="content-area">
        <div className="page-header">
          <p className="page-description">
          Manage staff and KASAMA user access without requiring an authentication onboarding flow.
          </p>
          <button className="btn-create" onClick={openCreateModal}>
            + Create Staff
          </button>
        </div>

        {error && <p className="inline-error">{error}</p>}

        {isLoading ? (
          <p>Loading users...</p>
        ) : managedUsers.length === 0 ? (
          <div className="no-pending-message">No staff or KASAMA accounts configured.</div>
        ) : (
          <div className="approval-table-wrapper">
            <table className="approval-table">
              <thead>
                <tr className="table-header-row">
                  <th className="table-header-cell">Name</th>
                  <th className="table-header-cell">Email</th>
                  <th className="table-header-cell">Organization/Office</th>
                  <th className="table-header-cell">Role</th>
                  <th className="table-header-cell">Date Added</th>
                  <th className="table-header-cell actions-header">Actions</th>
                </tr>
              </thead>
              <tbody>
                {managedUsers.map((user) => (
                  <tr key={user.id} className="table-row">
                    <td className="table-cell">{user.name || "No name"}</td>
                    <td className="table-cell table-cell-email">{user.email || "No email"}</td>
                    <td className="table-cell">{user.office || "—"}</td>
                    <td className="table-cell table-cell-role">
                      <select
                        value={(user.role || "staff").toLowerCase()}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        className="role-dropdown"
                      >
                        {ROLE_OPTIONS.map((role) => (
                          <option key={role.value} value={role.value}>
                            {role.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="table-cell">{formatDate(user.createdAt)}</td>
                    <td className="table-cell table-cell-actions">
                      <button
                        className="btn btn-delete"
                        onClick={() => handleDeleteUser(user.id)}
                        disabled={deletingUserId === user.id}
                      >
                        {deletingUserId === user.id ? "Deleting..." : "Delete"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        <section className="registered-students-section">
         
          <ApprovedAccountsTable
            accounts={registeredStudents}
            isLoading={isLoading}
            error={error}
          />
        </section>
      </div>

      {isCreateModalOpen && (
        <div className="modal-overlay" onClick={closeCreateModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h4>Create Staff Profile</h4>
            <p className="modal-description">
              Provide the staff member&apos;s contact information.
            </p>
            <form className="create-form" onSubmit={handleCreateStaff}>
              <label>
                Full Name
                <input
                  type="text"
                  value={createForm.fullName}
                  onChange={(e) => handleCreateInputChange("fullName", e.target.value)}
                  placeholder="e.g. Maria Santos"
                  required
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => handleCreateInputChange("email", e.target.value)}
                  placeholder="staff@example.com"
                  required
                />
              </label>
              <label>
                Organization / Office
                <input
                  type="text"
                  value={createForm.office}
                  onChange={(e) => handleCreateInputChange("office", e.target.value)}
                  placeholder="Enter organization or office"
                />
              </label>
              <label>
                Role
                <select
                  value={createForm.role}
                  onChange={(e) => handleCreateInputChange("role", e.target.value)}
                >
                  {ROLE_OPTIONS.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Password
                <input
                  type="password"
                  value={createForm.password}
                  onChange={(e) => handleCreateInputChange("password", e.target.value)}
                  placeholder="Enter at least 6 characters"
                  minLength={6}
                  autoComplete="new-password"
                  required
                />
              </label>
              <label>
                Confirm Password
                <input
                  type="password"
                  value={createForm.confirmPassword}
                  onChange={(e) => handleCreateInputChange("confirmPassword", e.target.value)}
                  placeholder="Re-enter the password"
                  minLength={6}
                  autoComplete="new-password"
                  required
                />
              </label>
              {formError && <p className="inline-error">{formError}</p>}
              <div className="modal-actions">
                <button type="submit" className="btn btn-approve" disabled={isSavingUser}>
                  {isSavingUser ? "Creating..." : "Create Staff"}
                </button>
                <button type="button" className="btn btn-cancel"
                  onClick={closeCreateModal} disabled={isSavingUser}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUserManage;
