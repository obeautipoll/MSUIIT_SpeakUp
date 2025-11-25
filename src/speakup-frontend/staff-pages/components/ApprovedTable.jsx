import React from 'react';
import '../../../styles/styles-admin/approved-table.css';

const formatDate = (value) => {
  if (!value) return 'Not set';

  if (typeof value.toDate === 'function') {
    try {
      return value.toDate().toLocaleDateString();
    } catch (error) {
      console.error('Error formatting Firestore timestamp:', error);
      return 'Invalid date';
    }
  }

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString();
  }

  return 'Not set';
};

const ApprovedAccountsTable = ({
  accounts = [],
  isLoading = false,
  error = null,
}) => {
  const renderStatus = () => {
    if (isLoading) {
      return (
        <p className="approved-description">
          Loading registered users...
        </p>
      );
    }

    if (error) {
      return (
        <p className="approved-description error-message">
          {error}
        </p>
      );
    }

    return (
      <p className="approved-description">
        Total registered student accounts: <span className="account-count">{accounts.length}</span>
      </p>
    );
  };

  const renderTableBody = () => {
    if (isLoading) {
      return (
        <tr>
          <td colSpan="4" className="approved-cell">
            Loading...
          </td>
        </tr>
      );
    }

    if (error) {
      return (
        <tr>
          <td colSpan="4" className="approved-cell error-message">
            {error}
          </td>
        </tr>
      );
    }

    if (accounts.length === 0) {
      return (
        <tr>
          <td colSpan="4" className="approved-cell no-accounts-message">
            No registered accounts found.
          </td>
        </tr>
      );
    }

    return accounts.map((account) => (
      <tr key={account.id} className="approved-row">
        <td className="approved-cell approved-cell-email">
          {account.email || 'No email'}
        </td>
        <td className="approved-cell approved-cell-date">
          {formatDate(account.createdAt)}
        </td>
      </tr>
    ));
  };

  return (
    <div className="approved-accounts-section">
      <div className="approved-header">
        
        {renderStatus()}
      </div>

      <div className="approved-table-wrapper">
        <table className="approved-table">
          <thead>
            <tr className="approved-header-row">
              <th className="approved-header-cell">User ID</th>
              <th className="approved-header-cell">Email</th>
              <th className="approved-header-cell">Role</th>
              <th className="approved-header-cell">Date Created</th>
            </tr>
          </thead>
          <tbody>{renderTableBody()}</tbody>
        </table>
      </div>
    </div>
  );
};

export default ApprovedAccountsTable;
