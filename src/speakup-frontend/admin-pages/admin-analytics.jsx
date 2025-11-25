import React, { useEffect, useMemo, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import '../../styles/styles-admin/analytics-admin.css';
import AdminSideBar from './components/AdminSideBar';
import AdminNavbar from './components/AdminNavBar';
import { db } from '../../firebase/firebase';

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: '#f97316' },
  inProgress: { label: 'In Progress', color: '#3b82f6' },
  resolved: { label: 'Resolved', color: '#16a34a' },
  closed: { label: 'Closed', color: '#6b7280' },
};

const URGENCY_CONFIG = {
  high: { label: 'High', color: '#dc2626' },
  medium: { label: 'Medium', color: '#facc15' },
  low: { label: 'Low', color: '#22c55e' },
};

const normalizeStatus = (status = '') => {
  const value = status.toString().toLowerCase();
  if (value.includes('progress')) return 'inProgress';
  if (value.includes('pending')) return 'pending';
  if (value.includes('resolve')) return 'resolved';
  if (value.includes('close')) return 'closed';
  return 'pending';
};

const normalizeUrgency = (urgency = '') => {
  const value = urgency.toString().toLowerCase();
  if (value.includes('high')) return 'high';
  if (value.includes('medium')) return 'medium';
  if (value.includes('low')) return 'low';
  return null;
};

const normalizeCategory = (category = 'Uncategorized') =>
  category.replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim() || 'Uncategorized';

const toDateValue = (value) => {
  if (!value) return null;
  if (typeof value.toDate === 'function') {
    try {
      return value.toDate();
    } catch {
      return null;
    }
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getPeriodStart = (date, type) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  switch (type) {
    case 'week': {
      const day = start.getDay();
      start.setDate(start.getDate() - day);
      break;
    }
    case 'month':
      start.setDate(1);
      break;
    case 'year':
      start.setMonth(0, 1);
      break;
    default:
      break;
  }

  return start;
};

const formatPeriodLabel = (date, type) => {
  switch (type) {
    case 'week':
      return `Week of ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    case 'month':
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    case 'year':
      return date.getFullYear().toString();
    default:
      return date.toLocaleDateString();
  }
};

const buildTimeSeries = (complaints, type, count) => {
  const template = [];
  const lookup = {};

  for (let i = count - 1; i >= 0; i -= 1) {
    const reference = new Date();
    reference.setHours(0, 0, 0, 0);

    if (type === 'week') {
      reference.setDate(reference.getDate() - i * 7);
    } else if (type === 'month') {
      reference.setMonth(reference.getMonth() - i, 1);
    } else if (type === 'year') {
      reference.setFullYear(reference.getFullYear() - i, 0, 1);
    }

    const start = getPeriodStart(reference, type);
    const key = `${type}:${start.toISOString()}`;
    const bucket = {
      key,
      label: formatPeriodLabel(start, type),
      value: 0,
    };

    template.push(bucket);
    lookup[key] = bucket;
  }

  complaints.forEach((complaint) => {
    const date = toDateValue(complaint.submissionDate);
    if (!date) return;

    const bucketStart = getPeriodStart(date, type);
    const bucketKey = `${type}:${bucketStart.toISOString()}`;

    if (lookup[bucketKey]) {
      lookup[bucketKey].value += 1;
    }
  });

  return template;
};

const sortSeriesDesc = (series) => [...series].sort((a, b) => b.value - a.value);

const TREND_VIEWS = [
  { key: 'week', label: 'Weekly', description: 'Last 6 weeks' },
  { key: 'month', label: 'Monthly', description: 'Last 6 months' },
  { key: 'year', label: 'Yearly', description: 'Last 5 years' },
];

const AdminAnalytics = () => {
  const [complaints, setComplaints] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [trendRange, setTrendRange] = useState('week');
  const [activeTrendPeriod, setActiveTrendPeriod] = useState(null);

  useEffect(() => {
    const fetchComplaints = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'complaints'));
        const docs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setComplaints(docs);
        setError(null);
      } catch (err) {
        console.error('Error loading analytics data:', err);
        setError('Unable to load analytics right now. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchComplaints();
  }, []);

  const statusCounts = useMemo(() => {
    return complaints.reduce(
      (acc, complaint) => {
        const key = normalizeStatus(complaint.status);
        acc[key] += 1;
        return acc;
      },
      { pending: 0, inProgress: 0, resolved: 0, closed: 0 }
    );
  }, [complaints]);

  const urgencyCounts = useMemo(() => {
    return complaints.reduce(
      (acc, complaint) => {
        const key = normalizeUrgency(complaint.urgency);
        if (key) acc[key] += 1;
        return acc;
      },
      { high: 0, medium: 0, low: 0 }
    );
  }, [complaints]);

  const categoryDistribution = useMemo(() => {
    const counts = complaints.reduce((acc, complaint) => {
      const category = normalizeCategory(complaint.category);
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [complaints]);

  const weeklyVolume = useMemo(() => {
    const days = [...Array(7)].map((_, idx) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (6 - idx));
      return date;
    });

    const template = days.map((date) => ({
      key: date.toISOString().slice(0, 10),
      label: date.toLocaleDateString('en-US', { weekday: 'short' }),
      value: 0,
    }));

    const lookup = template.reduce((acc, day) => {
      acc[day.key] = day;
      return acc;
    }, {});

    complaints.forEach((complaint) => {
      const date = toDateValue(complaint.submissionDate);
      if (!date) return;
      date.setHours(0, 0, 0, 0);
      const key = date.toISOString().slice(0, 10);
      if (lookup[key]) {
        lookup[key].value += 1;
      }
    });

    return template;
  }, [complaints]);

  const weeklyTrend = useMemo(
    () => buildTimeSeries(complaints, 'week', 6),
    [complaints]
  );

  const monthlyTrend = useMemo(
    () => buildTimeSeries(complaints, 'month', 6),
    [complaints]
  );

  const yearlyTrend = useMemo(
    () => buildTimeSeries(complaints, 'year', 5),
    [complaints]
  );

  const sortedTrendData = useMemo(
    () => ({
      weekly: sortSeriesDesc(weeklyTrend),
      monthly: sortSeriesDesc(monthlyTrend),
      yearly: sortSeriesDesc(yearlyTrend),
    }),
    [weeklyTrend, monthlyTrend, yearlyTrend]
  );

  const totalComplaints = complaints.length;
  const openComplaints = statusCounts.pending + statusCounts.inProgress;
  const resolvedThisWeek = weeklyVolume.slice(-7).reduce((sum, day) => sum + day.value, 0);
  const avgPerDay = weeklyVolume.length
    ? Math.round(
        weeklyVolume.reduce((sum, day) => sum + day.value, 0) / weeklyVolume.length
      )
    : 0;

  const selectedTrendSeries = useMemo(() => {
    switch (trendRange) {
      case 'month':
        return monthlyTrend;
      case 'year':
        return yearlyTrend;
      case 'week':
      default:
        return weeklyTrend;
    }
  }, [trendRange, weeklyTrend, monthlyTrend, yearlyTrend]);

  const selectedTrendSummary = useMemo(() => {
    switch (trendRange) {
      case 'month':
        return sortedTrendData.monthly;
      case 'year':
        return sortedTrendData.yearly;
      case 'week':
      default:
        return sortedTrendData.weekly;
    }
  }, [trendRange, sortedTrendData]);

  const maxStatusValue = Math.max(...Object.values(statusCounts), 1);
  const maxCategoryValue = Math.max(
    ...categoryDistribution.map((category) => category.value),
    1
  );
  const maxUrgencyValue = Math.max(...Object.values(urgencyCounts), 1);
  const maxTrendValue = Math.max(...selectedTrendSeries.map((day) => day.value), 1);
  const totalSelectedTrend = selectedTrendSeries.reduce((sum, period) => sum + period.value, 0);

  useEffect(() => {
    setActiveTrendPeriod(null);
  }, [trendRange, selectedTrendSeries]);

  const focusedTrendPeriod = useMemo(() => {
    if (!selectedTrendSeries.length) return null;
    return (
      selectedTrendSeries.find((period) => period.key === activeTrendPeriod) ||
      selectedTrendSeries[selectedTrendSeries.length - 1]
    );
  }, [activeTrendPeriod, selectedTrendSeries]);

  return (
    <div className="admin-container">
      <AdminSideBar />
      <main className="main-content">
        <AdminNavbar />

        <div className="analytics-page">
          <header className="analytics-header">
            <div>
              <p className="page-kicker">Insights</p>
              <h1>Analytics Overview</h1>
              <p className="analytics-subtitle">
                Real-time breakdown of complaint activity across the platform.
              </p>
            </div>
            <p className="analytics-meta">
              Updated {new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
            </p>
          </header>

          {error && <div className="analytics-error">{error}</div>}

          <section className="analytics-summary-grid">
            <div className="analytics-summary-card">
              <p>Total Complaints</p>
              <h3>{isLoading ? '...' : totalComplaints}</h3>
              <span>All time</span>
            </div>
            <div className="analytics-summary-card">
              <p>Active Queue</p>
              <h3>{isLoading ? '...' : openComplaints}</h3>
              <span>Pending + In Progress</span>
            </div>
            <div className="analytics-summary-card">
              <p>Weekly Volume</p>
              <h3>{isLoading ? '...' : resolvedThisWeek}</h3>
              <span>Submissions (last 7 days)</span>
            </div>
            <div className="analytics-summary-card">
              <p>Avg. per Day</p>
              <h3>{isLoading ? '...' : avgPerDay}</h3>
              <span>Based on the last 7 days</span>
            </div>
          </section>

          <section className="analytics-panel">
            <header>
              <div>
                <h2>Status Overview</h2>
                <p>Workload split across lifecycle stages</p>
              </div>
            </header>
            <div className="status-chart">
              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <div className="status-bar-wrapper" key={key}>
                  <div
                    className="status-bar"
                    style={{
                      height: `${(statusCounts[key] / maxStatusValue) * 100}%`,
                      background: config.color,
                    }}
                  />
                  <span className="status-value">{statusCounts[key]}</span>
                  <span className="status-label">{config.label}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="analytics-panel two-column">
            <div className="panel-column">
              <header>
                <div>
                  <h3>Top Categories</h3>
                  <p>Most frequent themes</p>
                </div>
              </header>
              <div className="category-list">
                {categoryDistribution.map((category) => (
                  <div className="category-row" key={category.label}>
                    <span className="category-label">{category.label}</span>
                    <span className="category-value">{category.value}</span>
                    <div className="category-bar-track">
                      <div
                        className="category-bar-fill"
                        style={{
                          width: `${(category.value / maxCategoryValue) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
                {!categoryDistribution.length && (
                  <p className="empty-state-text">Not enough data to show categories yet.</p>
                )}
              </div>
            </div>
            <div className="panel-column">
              <header>
                <div>
                  <h3>Urgency Mix</h3>
                  <p>Prioritization snapshot</p>
                </div>
              </header>
              <div className="urgency-list">
                {Object.entries(URGENCY_CONFIG).map(([key, config]) => (
                  <div className="category-row" key={key}>
                    <span className="category-label">{config.label}</span>
                    <span className="category-value">{urgencyCounts[key]}</span>
                    <div className="category-bar-track">
                      <div
                        className="category-bar-fill"
                        style={{
                          width: `${(urgencyCounts[key] / maxUrgencyValue) * 100}%`,
                          background: config.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="analytics-panel trend-breakdown" id="submission-trend">
            <header>
              <div>
                <h2>Submission Trend</h2>
                <p>Compare activity over time—switch between weekly, monthly, or yearly totals.</p>
              </div>
            </header>
            <div className="trend-controls">
              {TREND_VIEWS.map((view) => (
                <button
                  key={view.key}
                  type="button"
                  className={`trend-toggle ${trendRange === view.key ? 'active' : ''}`}
                  onClick={() => setTrendRange(view.key)}
                >
                  <span>{view.label}</span>
                  <small>{view.description}</small>
                </button>
              ))}
            </div>
            <div className="trend-chart" role="list" aria-live="polite">
              {selectedTrendSeries.map((period) => {
                const isActive = focusedTrendPeriod?.key === period.key;
                return (
                  <div
                    key={period.key}
                    role="button"
                    tabIndex={0}
                    aria-label={`${period.label}: ${period.value} submissions`}
                    className={`trend-column ${isActive ? 'active' : ''}`}
                    onMouseEnter={() => setActiveTrendPeriod(period.key)}
                    onFocus={() => setActiveTrendPeriod(period.key)}
                    onMouseLeave={() => setActiveTrendPeriod(null)}
                    onBlur={() => setActiveTrendPeriod(null)}
                  >
                    <div
                      className="trend-bar"
                      style={{
                        height: `${(period.value / maxTrendValue) * 100}%`,
                      }}
                    />
                    <span className="trend-value">{period.value}</span>
                    <span className="trend-label">{period.label}</span>
                  </div>
                );
              })}
              {!selectedTrendSeries.length && (
                <p className="empty-state-text">Not enough data to render this view yet.</p>
              )}
            </div>
            {focusedTrendPeriod && (
              <div className="trend-detail-card" aria-live="polite">
                <p className="trend-summary-label">Focused period</p>
                <h4>
                  {focusedTrendPeriod?.label || 'N/A'} · {focusedTrendPeriod?.value ?? 0}{' '}
                  submissions
                </h4>
              </div>
            )}
            <div className="trend-summary">
              <div>
                <p className="trend-summary-label">Total submissions</p>
                <h4>
                  {totalSelectedTrend}
                </h4>
              </div>
              <div>
                <p className="trend-summary-label">Busiest period</p>
                <h4>
                  {selectedTrendSummary[0]?.label || 'N/A'} ·{' '}
                  {selectedTrendSummary[0]?.value ?? 0}
                </h4>
              </div>
              <div>
                <p className="trend-summary-label">Average per period</p>
                <h4>
                  {selectedTrendSeries.length
                    ? Math.round(
                        selectedTrendSeries.reduce((sum, period) => sum + period.value, 0) /
                          selectedTrendSeries.length
                      )
                    : 0}
                </h4>
              </div>
            </div>
            <div className="trend-breakdown-grid">
              {selectedTrendSummary.slice(0, 4).map((item) => (
                <div className="trend-breakdown-card" key={item.key}>
                  <h4>{item.label}</h4>
                  <p>Submissions</p>
                  <strong>{item.value}</strong>
                </div>
              ))}
              {selectedTrendSummary.slice(0, 4).length === 0 && (
                <p className="empty-state-text">No submissions recorded for this period.</p>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default AdminAnalytics;
