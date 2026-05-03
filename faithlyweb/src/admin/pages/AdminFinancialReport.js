import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import html2pdf from 'html2pdf.js';
import '../styles/AdminFinancialReport.css';
import API from '../../utils/api';
import { FileText, Printer, RefreshCw, Sparkles, Calendar, ChevronDown, Download } from 'lucide-react';

const fmt = (n) => `₱${(Number(n) || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const PIE_COLORS = ['#2563eb', '#8b5cf6', '#06b6d4', '#f59e0b', '#ef4444', '#10b981', '#ec4899'];

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const SESSION_KEY = 'faithly_financial_report';

export default function AdminFinancialReport() {
  const navigate = useNavigate();
  const now = new Date();
  const reportRef = useRef(null);

  const [reportMonth, setReportMonth] = useState('');
  const [reportYear, setReportYear] = useState(now.getFullYear());
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);

  const adminRole = localStorage.getItem('adminRole'); // 'admin', 'loanAdmin', 'secretaryAdmin'

  // Load cached report from sessionStorage on mount
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem(SESSION_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        setReport(parsed.report);
        setReportMonth(parsed.month ?? '');
        setReportYear(parsed.year ?? now.getFullYear());
      }
    } catch { /* ignore parse errors */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save report to sessionStorage whenever it changes
  useEffect(() => {
    if (report) {
      try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({
          report,
          month: reportMonth,
          year: reportYear,
        }));
      } catch { /* quota exceeded — ignore */ }
    }
  }, [report, reportMonth, reportYear]);

  const generateReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) { navigate('/'); return; }

      const params = new URLSearchParams();
      params.set('year', reportYear);
      if (reportMonth !== '') params.set('month', reportMonth);

      const res = await fetch(`${API}/api/admin/financial-report?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) { navigate('/'); return; }
        throw new Error(data.message || 'Failed to generate report');
      }

      setReport(data.report);
      toast.success('Financial report generated successfully');
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [reportMonth, reportYear, navigate]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = async () => {
    if (!reportRef.current) return;
    setExporting(true);
    try {
      const element = reportRef.current;
      const periodName = report?.period?.replace(/\s+/g, '_') || 'Report';
      const filename = `FaithLy_Financial_Report_${periodName}.pdf`;

      const opt = {
        margin:       [10, 10, 10, 10],
        filename,
        image:        { type: 'jpeg', quality: 0.95 },
        html2canvas:  { scale: 2, useCORS: true, logging: false },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] },
      };

      await html2pdf().set(opt).from(element).save();
      toast.success('PDF exported successfully');
    } catch (err) {
      console.error('[PDF Export Error]:', err);
      toast.error('Failed to export PDF');
    } finally {
      setExporting(false);
    }
  };

  const yearOptions = [];
  for (let y = now.getFullYear(); y >= now.getFullYear() - 5; y--) {
    yearOptions.push(y);
  }

  return (
    <div className="fin-report-page">

      {/* ── Header ── */}
      <div className="fin-report-header">
        <div className="fin-report-header-left">
          <div className="fin-report-icon-wrap">
            <FileText size={20} />
          </div>
          <div>
            <h1 className="fin-report-title">Automated Report</h1>
            <p className="fin-report-subtitle">AI-generated operational analysis with detailed breakdowns</p>
          </div>
        </div>
        <div className="fin-report-header-actions no-print">
          {report && (
            <>
              <button
                className="fin-report-btn secondary"
                onClick={handleExportPDF}
                disabled={exporting}
              >
                {exporting ? <RefreshCw size={16} className="spinning" /> : <Download size={16} />}
                {exporting ? 'Exporting...' : 'Export PDF'}
              </button>
              <button className="fin-report-btn secondary" onClick={handlePrint}>
                <Printer size={16} />
                Print
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Filter Bar ── */}
      <div className="fin-report-filter-bar no-print">
        <div className="fin-report-filter-group">
          <div className="fin-report-filter">
            <Calendar size={14} />
            <select value={reportMonth} onChange={e => setReportMonth(e.target.value)} className="fin-report-select">
              <option value="">Full Year</option>
              {MONTHS.map((m, i) => (
                <option key={i} value={i}>{m}</option>
              ))}
            </select>
            <ChevronDown size={12} className="fin-report-select-arrow" />
          </div>

          <div className="fin-report-filter">
            <select value={reportYear} onChange={e => setReportYear(Number(e.target.value))} className="fin-report-select">
              {yearOptions.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <ChevronDown size={12} className="fin-report-select-arrow" />
          </div>
        </div>

        <button
          className="fin-report-btn primary"
          onClick={generateReport}
          disabled={loading}
        >
          {loading ? (
            <>
              <RefreshCw size={16} className="spinning" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles size={16} />
              Generate Report
            </>
          )}
        </button>
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div className="fin-report-loading">
          <div className="fin-report-loading-spinner" />
          <p className="fin-report-loading-text">Analyzing financial data with AI...</p>
          <p className="fin-report-loading-sub">This may take 10-15 seconds</p>
        </div>
      )}

      {/* ── Error ── */}
      {error && !loading && (
        <div className="fin-report-error">
          <p>⚠️ {error}</p>
          <button onClick={generateReport}>Try Again</button>
        </div>
      )}

      {/* ── Report Content ── */}
      {report && !loading && (
        <div className="fin-report-content" ref={reportRef}>

          {/* Report Header (print/PDF) */}
          <div className="fin-report-print-header print-only">
            <h1>FaithLy Financial Report</h1>
            <p>Period: {report.period}</p>
            <p>Generated: {new Date(report.generatedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
          </div>

          {/* Executive Summary */}
          <div className="fin-report-section fin-report-executive">
            <div className="fin-report-section-header">
              <div className="fin-report-section-badge ai">
                <Sparkles size={14} />
                AI Executive Summary
              </div>
              <span className="fin-report-period-label">{report.period}</span>
            </div>
            <div className="fin-report-executive-body">
              {report.executiveSummary?.split('\n').filter(Boolean).map((para, i) => (
                <p key={i} className="fin-report-executive-para">{para}</p>
              ))}
            </div>
          </div>

          {/* Donations Section - Only for Super Admin */}
          {report.donations && adminRole === 'admin' && (
            <div className="fin-report-section">
              <div className="fin-report-section-header">
                <h2 className="fin-report-section-title">💝 Donations Overview</h2>
              </div>

              {/* Donation Stats */}
              <div className="fin-report-stat-grid">
                <div className="fin-report-stat">
                  <span className="fin-report-stat-label">Total Donations</span>
                  <span className="fin-report-stat-value blue">{fmt(report.donations.total)}</span>
                </div>
                <div className="fin-report-stat">
                  <span className="fin-report-stat-label">Transaction Count</span>
                  <span className="fin-report-stat-value">{report.donations.count}</span>
                </div>
                <div className="fin-report-stat">
                  <span className="fin-report-stat-label">Avg per Transaction</span>
                  <span className="fin-report-stat-value green">
                    {fmt(report.donations.count > 0 ? report.donations.total / report.donations.count : 0)}
                  </span>
                </div>
              </div>

              {/* Charts Row */}
              <div className="fin-report-charts-row">
                {/* By Category */}
                {report.donations.byCategory?.length > 0 && (
                  <div className="fin-report-chart-card">
                    <h3 className="fin-report-chart-title">By Category</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={report.donations.byCategory} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2} dataKey="value" nameKey="name">
                          {report.donations.byCategory.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={v => fmt(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="fin-report-legend">
                      {report.donations.byCategory.map((cat, i) => (
                        <div key={i} className="fin-report-legend-item">
                          <span className="fin-report-legend-dot" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                          <span className="fin-report-legend-label">{cat.name}</span>
                          <span className="fin-report-legend-val">{fmt(cat.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* By Month */}
                {report.donations.byMonth?.length > 0 && (
                  <div className="fin-report-chart-card">
                    <h3 className="fin-report-chart-title">Monthly Trend</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={report.donations.byMonth}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₱${(v/1000).toFixed(0)}k`} allowDecimals={false} />
                        <Tooltip formatter={v => fmt(v)} />
                        <Bar dataKey="value" fill="#2563eb" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* By Branch Table */}
              {report.donations.byBranch?.length > 0 && (
                <div className="fin-report-table-wrap">
                  <h3 className="fin-report-chart-title">By Community</h3>
                  <table className="fin-report-table">
                    <thead>
                      <tr>
                        <th>Community</th>
                        <th>Amount</th>
                        <th>% Share</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.donations.byBranch.map((b, i) => (
                        <tr key={i}>
                          <td>{b.branch}</td>
                          <td className="amount">{fmt(b.value)}</td>
                          <td>{report.donations.total > 0 ? ((b.value / report.donations.total) * 100).toFixed(1) : 0}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Loans Section - Only for Loan Admin */}
          {report.loans && adminRole === 'loanAdmin' && (
            <div className="fin-report-section">
              <div className="fin-report-section-header">
                <h2 className="fin-report-section-title">💳 Loans Portfolio</h2>
              </div>

              <div className="fin-report-stat-grid">
                <div className="fin-report-stat">
                  <span className="fin-report-stat-label">Total Applications</span>
                  <span className="fin-report-stat-value">{report.loans.totalApplications}</span>
                </div>
                <div className="fin-report-stat">
                  <span className="fin-report-stat-label">Amount Applied</span>
                  <span className="fin-report-stat-value blue">{fmt(report.loans.totalAmountApplied)}</span>
                </div>
                <div className="fin-report-stat">
                  <span className="fin-report-stat-label">Total Disbursed</span>
                  <span className="fin-report-stat-value">{fmt(report.loans.totalDisbursed)}</span>
                </div>
                <div className="fin-report-stat">
                  <span className="fin-report-stat-label">Payments Received</span>
                  <span className="fin-report-stat-value green">{fmt(report.loans.totalPaymentsReceived)}</span>
                </div>
                <div className="fin-report-stat">
                  <span className="fin-report-stat-label">Interest Earned</span>
                  <span className="fin-report-stat-value purple">{fmt(report.loans.totalInterestEarned)}</span>
                </div>
              </div>

              {/* Loan Status Breakdown */}
              {report.loans.byStatus?.length > 0 && (
                <div className="fin-report-chart-card">
                  <h3 className="fin-report-chart-title">Application Status</h3>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={report.loans.byStatus} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                      <YAxis type="category" dataKey="status" tick={{ fontSize: 11 }} width={80} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* Savings Section - Only for Loan Admin */}
          {report.savings && adminRole === 'loanAdmin' && (
            <div className="fin-report-section">
              <div className="fin-report-section-header">
                <h2 className="fin-report-section-title">🏦 Savings Overview</h2>
              </div>

              <div className="fin-report-stat-grid">
                <div className="fin-report-stat">
                  <span className="fin-report-stat-label">Total Saved</span>
                  <span className="fin-report-stat-value green">{fmt(report.savings.totalSaved)}</span>
                </div>
                <div className="fin-report-stat">
                  <span className="fin-report-stat-label">Total Targets</span>
                  <span className="fin-report-stat-value">{fmt(report.savings.totalTargets)}</span>
                </div>
                <div className="fin-report-stat">
                  <span className="fin-report-stat-label">Overall Progress</span>
                  <span className="fin-report-stat-value blue">{report.savings.overallProgress}%</span>
                </div>
                <div className="fin-report-stat">
                  <span className="fin-report-stat-label">Period Deposits</span>
                  <span className="fin-report-stat-value">{fmt(report.savings.periodDeposits)}</span>
                  <span className="fin-report-stat-sub">{report.savings.periodDepositCount} transactions</span>
                </div>
                <div className="fin-report-stat">
                  <span className="fin-report-stat-label">Active Goals</span>
                  <span className="fin-report-stat-value">{report.savings.activeGoals}</span>
                </div>
                <div className="fin-report-stat">
                  <span className="fin-report-stat-label">Completed Goals</span>
                  <span className="fin-report-stat-value green">{report.savings.completedGoals}</span>
                </div>
              </div>

              {/* Savings Progress Bar */}
              <div className="fin-report-progress-section">
                <div className="fin-report-progress-header">
                  <span>Overall Savings Progress</span>
                  <span className="fin-report-progress-pct">{report.savings.overallProgress}%</span>
                </div>
                <div className="fin-report-progress-track">
                  <div className="fin-report-progress-fill" style={{ width: `${Math.min(100, report.savings.overallProgress)}%` }} />
                </div>
              </div>
            </div>
          )}

          {/* Member Growth & Attendance - Only for Super Admin */}
          {(report.memberGrowth || report.attendance) && adminRole === 'admin' && (
            <div className="fin-report-section">
              <div className="fin-report-section-header">
                <h2 className="fin-report-section-title">👥 Membership & Engagement</h2>
              </div>
              <div className="fin-report-stat-grid">
                {report.memberGrowth && (
                  <>
                    <div className="fin-report-stat">
                      <span className="fin-report-stat-label">New Members</span>
                      <span className="fin-report-stat-value blue">{report.memberGrowth.newMembers}</span>
                    </div>
                    <div className="fin-report-stat">
                      <span className="fin-report-stat-label">Total Members</span>
                      <span className="fin-report-stat-value">{report.memberGrowth.totalMembers}</span>
                    </div>
                  </>
                )}
                {report.attendance && (
                  <div className="fin-report-stat">
                    <span className="fin-report-stat-label">Attendance Records</span>
                    <span className="fin-report-stat-value green">{report.attendance.totalRecords}</span>
                  </div>
                )}
              </div>

              {/* Attendance Chart */}
              {report.attendance?.byBranch?.length > 0 && (
                <div className="fin-report-chart-card">
                  <h3 className="fin-report-chart-title">Attendance by Community</h3>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={report.attendance.byBranch}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* Secretary Section - Only for Super Admin and Secretary Admin */}
          {report.secretary && (adminRole === 'admin' || adminRole === 'secretaryAdmin') && (
            <div className="fin-report-section">
              <div className="fin-report-section-header">
                <h2 className="fin-report-section-title">📋 Disbursement Report</h2>
              </div>
              
              <div className="fin-report-stat-grid">
                <div className="fin-report-stat">
                  <span className="fin-report-stat-label">Total Amount Disbursed</span>
                  <span className="fin-report-stat-value purple">{fmt(report.secretary.disbursements.totalAmount)}</span>
                  <span className="fin-report-stat-sub">{report.secretary.disbursements.count} releases processed</span>
                </div>
              </div>

              {/* Disbursement List */}
              {report.secretary.disbursements.loans?.length > 0 && (
                <div className="fin-report-table-wrap">
                  <h3 className="fin-report-chart-title">Detailed Disbursement Log</h3>
                  <table className="fin-report-table">
                    <thead>
                      <tr>
                        <th>Loan ID</th>
                        <th>Member</th>
                        <th>Amount</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.secretary.disbursements.loans.map((l, i) => (
                        <tr key={i}>
                          <td className="id">{l.id}</td>
                          <td>{l.member}</td>
                          <td className="amount">{fmt(l.amount)}</td>
                          <td>{new Date(l.date).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="fin-report-footer">
            <p>Generated by FaithLy AI • {new Date(report.generatedAt).toLocaleString('en-US')}</p>
            <p>This report was generated using artificial intelligence. Please verify critical data points before making decisions.</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!report && !loading && !error && (
        <div className="fin-report-empty">
          <div className="fin-report-empty-icon">
            <FileText size={40} />
          </div>
          <h2>Generate an Automated Report</h2>
          <p>Select a time period and click "Generate Report" to create an AI-powered operational analysis.</p>
        </div>
      )}
    </div>
  );
}
