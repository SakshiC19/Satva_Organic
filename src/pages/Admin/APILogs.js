import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { FiActivity, FiCheckCircle, FiXCircle, FiRefreshCw, FiDownload, FiFilter } from 'react-icons/fi';
import './APILogs.css';

const APILogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterAPI, setFilterAPI] = useState('all');
  const [selectedLog, setSelectedLog] = useState(null);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const logsRef = collection(db, 'courier_api_logs');
      const q = query(logsRef, orderBy('created_at', 'desc'), limit(100));
      const snapshot = await getDocs(q);
      
      const logsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setLogs(logsData);
    } catch (error) {
      console.error('Error fetching logs:', error);
      alert('Failed to load API logs');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const exportLogs = () => {
    const csvContent = [
      ['Timestamp', 'API Name', 'Status', 'Request', 'Response'],
      ...filteredLogs.map(log => [
        formatDate(log.created_at),
        log.api_name,
        log.status,
        log.request_payload,
        log.response_payload
      ])
    ].map(e => e.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `api_logs_${new Date().toISOString().slice(0,10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredLogs = logs.filter(log => {
    if (filterStatus !== 'all' && log.status !== filterStatus) return false;
    if (filterAPI !== 'all' && log.api_name !== filterAPI) return false;
    return true;
  });

  const stats = {
    total: logs.length,
    success: logs.filter(l => l.status === 'success').length,
    failed: logs.filter(l => l.status === 'failed').length,
    pincode: logs.filter(l => l.api_name === 'PINcodeService').length,
    citySearch: logs.filter(l => l.api_name === 'PINcodeCitysearch').length,
    cnRequest: logs.filter(l => l.api_name === 'CNoteRequest').length
  };

  return (
    <div className="api-logs-container">
      <div className="logs-header">
        <div className="header-content">
          <h1 className="logs-title">
            <FiActivity /> API Logs Monitor
          </h1>
          <p className="logs-subtitle">Monitor TPC courier API calls and responses</p>
        </div>
        <div className="header-actions">
          <button className="btn-refresh" onClick={fetchLogs} disabled={loading}>
            <FiRefreshCw className={loading ? 'spinning' : ''} />
            Refresh
          </button>
          <button className="btn-export" onClick={exportLogs}>
            <FiDownload />
            Export CSV
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="logs-stats">
        <div className="stat-card">
          <div className="stat-icon total">
            <FiActivity />
          </div>
          <div className="stat-content">
            <p className="stat-label">Total Calls</p>
            <h3 className="stat-value">{stats.total}</h3>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon success">
            <FiCheckCircle />
          </div>
          <div className="stat-content">
            <p className="stat-label">Successful</p>
            <h3 className="stat-value">{stats.success}</h3>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon failed">
            <FiXCircle />
          </div>
          <div className="stat-content">
            <p className="stat-label">Failed</p>
            <h3 className="stat-value">{stats.failed}</h3>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-content">
            <p className="stat-label">PIN Code Checks</p>
            <h3 className="stat-value">{stats.pincode}</h3>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-content">
            <p className="stat-label">City Searches</p>
            <h3 className="stat-value">{stats.citySearch}</h3>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-content">
            <p className="stat-label">CN Requests</p>
            <h3 className="stat-value">{stats.cnRequest}</h3>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="logs-filters">
        <div className="filter-group">
          <FiFilter />
          <label>Status:</label>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">All Status</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        <div className="filter-group">
          <label>API:</label>
          <select value={filterAPI} onChange={(e) => setFilterAPI(e.target.value)}>
            <option value="all">All APIs</option>
            <option value="PINcodeService">PIN Code Service</option>
            <option value="PINcodeCitysearch">City Search</option>
            <option value="CNoteRequest">CN Request</option>
          </select>
        </div>

        <div className="filter-info">
          Showing {filteredLogs.length} of {logs.length} logs
        </div>
      </div>

      {/* Logs Table */}
      <div className="logs-table-container">
        {loading ? (
          <div className="loading-state">
            <FiRefreshCw className="spinner" />
            <p>Loading logs...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="empty-state">
            <FiActivity />
            <p>No API logs found</p>
            <small>Logs will appear here as API calls are made</small>
          </div>
        ) : (
          <table className="logs-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>API Name</th>
                <th>Status</th>
                <th>Request</th>
                <th>Response</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => (
                <tr key={log.id}>
                  <td className="timestamp-cell">
                    {formatDate(log.created_at)}
                  </td>
                  <td className="api-name-cell">
                    <span className="api-badge">{log.api_name}</span>
                  </td>
                  <td>
                    <span className={`status-badge ${log.status}`}>
                      {log.status === 'success' ? (
                        <><FiCheckCircle /> Success</>
                      ) : (
                        <><FiXCircle /> Failed</>
                      )}
                    </span>
                  </td>
                  <td className="payload-cell">
                    <code className="payload-preview">
                      {log.request_payload?.substring(0, 50)}...
                    </code>
                  </td>
                  <td className="payload-cell">
                    <code className="payload-preview">
                      {log.response_payload?.substring(0, 50)}...
                    </code>
                  </td>
                  <td>
                    <button
                      className="btn-view-details"
                      onClick={() => setSelectedLog(log)}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Log Details Modal */}
      {selectedLog && (
        <div className="modal-overlay" onClick={() => setSelectedLog(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>API Log Details</h2>
              <button className="modal-close" onClick={() => setSelectedLog(null)}>
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-section">
                <h3>General Information</h3>
                <div className="detail-row">
                  <span className="detail-label">Timestamp:</span>
                  <span className="detail-value">{formatDate(selectedLog.created_at)}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">API Name:</span>
                  <span className="detail-value">{selectedLog.api_name}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Status:</span>
                  <span className={`status-badge ${selectedLog.status}`}>
                    {selectedLog.status}
                  </span>
                </div>
              </div>

              <div className="detail-section">
                <h3>Request Payload</h3>
                <pre className="json-display">
                  {JSON.stringify(JSON.parse(selectedLog.request_payload || '{}'), null, 2)}
                </pre>
              </div>

              <div className="detail-section">
                <h3>Response Payload</h3>
                <pre className="json-display">
                  {JSON.stringify(JSON.parse(selectedLog.response_payload || '{}'), null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default APILogs;
