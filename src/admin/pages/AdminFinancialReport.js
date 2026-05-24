import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import useSWR from 'swr';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Label
} from 'recharts';

import '../styles/AdminFinancialReport.css';
import API from '../../utils/api';
import { FileText, Printer, RefreshCw, Sparkles, Calendar, ChevronDown, Download, MapPin, AlertCircle, X } from 'lucide-react';

const renderSliceLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const fmt = (n) => `₱${(Number(n) || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const PIE_COLORS = ['#0D1F45', '#1e3a8a', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'];

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const LOAN_STATUS_COLORS = {
  active: '#10B981', completed: '#0D1F45', pending: '#2563EB',
  rejected: '#EF4444', cancelled: '#F59E0B', approved: '#60A5FA',
  'awaiting approval': '#BFDBFE'
};

const getStatusColor = (status) => {
  return LOAN_STATUS_COLORS[(status || '').toLowerCase()] || PIE_COLORS[0];
};

const SESSION_KEY = 'faithly_financial_report';

export default function AdminFinancialReport() {
  const navigate = useNavigate();
  const now = new Date();
  const reportRef = useRef(null);

  const [periodMode, setPeriodMode] = useState('full');
  const [reportMonth, setReportMonth] = useState('');
  const [startMonth, setStartMonth] = useState(0);
  const [endMonth, setEndMonth] = useState(11);
  const [reportYear, setReportYear] = useState(now.getFullYear());
  const [reportType, setReportType] = useState('all');
  const [locationType, setLocationType] = useState('all'); // 'all', 'province', 'specific'
  const [selectedProvinces, setSelectedProvinces] = useState([]);
  const [selectedCommunities, setSelectedCommunities] = useState([]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [provinceSearch, setProvinceSearch] = useState('');
  const [showProvinceDropdown, setShowProvinceDropdown] = useState(false);
  const provinceDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (provinceDropdownRef.current && !provinceDropdownRef.current.contains(event.target)) {
        setShowProvinceDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const adminRole = localStorage.getItem('adminRole'); // 'admin', 'loanAdmin', 'secretaryAdmin'

  // Load cached report from sessionStorage on mount
  useEffect(() => {
    try {
      const cached = sessionStorage.getItem(`${SESSION_KEY}_${adminRole}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        setReport(parsed.report);
        setPeriodMode(parsed.periodMode ?? 'full');
        setReportMonth(parsed.month ?? '');
        setStartMonth(parsed.startMonth ?? 0);
        setEndMonth(parsed.endMonth ?? 11);
        setReportYear(parsed.year ?? now.getFullYear());
        setReportType(parsed.type ?? 'all');
        setLocationType(parsed.locationType ?? 'all');
        setSelectedProvinces(parsed.selectedProvinces ?? []);
        setSelectedCommunities(parsed.selectedCommunities ?? []);
      }
    } catch { /* ignore parse errors */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminRole]);

  // Fetch communities on mount (admin only)
  const fetcherSingle = (url) => fetch(url, { headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` } }).then(res => res.json());
  
  const { data: branchesResp } = useSWR(
    localStorage.getItem('adminToken') ? `${API}/api/admin/branches?limit=1000` : null,
    fetcherSingle,
    { 
      revalidateOnFocus: false,
      dedupingInterval: 30000,
      keepPreviousData: true
    }
  );

  const branchesData = useMemo(() => branchesResp?.branches || [], [branchesResp]);

  // Save report to sessionStorage whenever it changes
  useEffect(() => {
    if (report) {
      try {
        sessionStorage.setItem(`${SESSION_KEY}_${adminRole}`, JSON.stringify({
          report,
          periodMode,
          month: reportMonth,
          startMonth,
          endMonth,
          year: reportYear,
          type: reportType,
          locationType,
          selectedProvinces,
          selectedCommunities,
        }));
      } catch { /* quota exceeded — ignore */ }
    }
  }, [report, periodMode, reportMonth, startMonth, endMonth, reportYear, reportType, locationType, selectedProvinces, selectedCommunities, adminRole]);

  const generateReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) { navigate('/'); return; }

      const params = new URLSearchParams();
      params.set('year', reportYear);
      if (periodMode === 'month' && reportMonth !== '') params.set('month', reportMonth);
      if (periodMode === 'range') {
        params.set('startMonth', startMonth);
        params.set('endMonth', endMonth);
      }
      params.set('type', reportType);
      
      if (locationType === 'specific' && selectedCommunities.length > 0) {
        params.set('community', selectedCommunities.join(','));
      } else if (locationType === 'province' && selectedProvinces.length > 0) {
        params.set('province', selectedProvinces.join(','));
      }

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
  }, [periodMode, reportMonth, startMonth, endMonth, reportYear, reportType, locationType, selectedProvinces, selectedCommunities, navigate]);

  const toggleCommunity = (c) => {
    setSelectedCommunities(prev => 
      prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]
    );
  };

  const toggleProvince = (p) => {
    setSelectedProvinces(prev => 
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    );
  };

  const handleGenerateClick = () => {
    setShowConfirm(true);
  };

  const handleConfirmGenerate = () => {
    setShowConfirm(false);
    generateReport();
  };

  const getReportTypeName = () => {
    if (reportType === 'donations') return 'Donations Only';
    if (reportType === 'attendance') return 'Attendance Only';
    return 'Comprehensive';
  };

  const getPeriodName = () => {
    if (periodMode === 'range') return `${MONTH_SHORT[startMonth]} - ${MONTH_SHORT[endMonth]} ${reportYear}`;
    if (periodMode === 'month' && reportMonth !== '') return `${MONTHS[parseInt(reportMonth)]} ${reportYear}`;
    return `Full Year ${reportYear}`;
  };

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

      const html2pdf = (await import('html2pdf.js')).default;
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
  for (let y = Math.max(2026, now.getFullYear()); y >= 2026; y--) {
    yearOptions.push(y);
  }

  const availableProvinces = Array.from(new Set(branchesData.map(b => b.province).filter(Boolean))).sort();
  const filteredProvinces = availableProvinces.filter(p => p.toLowerCase().includes(provinceSearch.toLowerCase()));

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
          {adminRole === 'admin' && (
            <div className="fin-report-filter">
              <FileText size={14} />
              <select value={reportType} onChange={e => setReportType(e.target.value)} className="fin-report-select">
                <option value="all">Comprehensive</option>
                <option value="donations">Donations Only</option>
                <option value="attendance">Attendance Only</option>
              </select>
              <ChevronDown size={12} className="fin-report-select-arrow" />
            </div>
          )}

          {branchesData.length > 0 && (
            <>
              <div className="fin-report-filter">
                <MapPin size={14} />
                <select value={locationType} onChange={e => setLocationType(e.target.value)} className="fin-report-select">
                  <option value="all">All Locations</option>
                  <option value="province">By Province</option>
                  <option value="specific">Specific Communities</option>
                </select>
                <ChevronDown size={12} className="fin-report-select-arrow" />
              </div>

              {locationType === 'province' && (
                <div className="fin-report-filter" ref={provinceDropdownRef} style={{ position: 'relative' }}>
                  <div 
                    className="fin-report-select" 
                    style={{ minWidth: '180px', display: 'flex', alignItems: 'center', padding: '0 8px 0 0', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  >
                    <input
                      type="text"
                      placeholder={selectedProvinces.length > 0 ? `${selectedProvinces.length} selected` : 'Search Province...'}
                      value={provinceSearch}
                      onChange={e => {
                         setProvinceSearch(e.target.value);
                         setShowProvinceDropdown(true);
                      }}
                      onFocus={() => setShowProvinceDropdown(true)}
                      style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', padding: '8px 10px', fontSize: '13px', color: '#374151' }}
                    />
                    <ChevronDown size={12} className="fin-report-select-arrow" style={{ position: 'static', cursor: 'pointer' }} onClick={() => setShowProvinceDropdown(!showProvinceDropdown)} />
                  </div>
                  
                  {showProvinceDropdown && (
                    <div className="fin-report-dropdown-menu" style={{ position: 'absolute', top: '100%', left: 0, width: '100%', background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', zIndex: 50, maxHeight: '250px', overflowY: 'auto', marginTop: '4px' }}>
                      {filteredProvinces.map(p => (
                        <label key={p} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', cursor: 'pointer', fontSize: '13px', borderBottom: '1px solid #f3f4f6', margin: 0 }}>
                          <input 
                            type="checkbox"
                            checked={selectedProvinces.includes(p)}
                            onChange={() => toggleProvince(p)}
                          />
                          {p}
                        </label>
                      ))}
                      {filteredProvinces.length === 0 && (
                        <div style={{ padding: '8px 12px', fontSize: '13px', color: '#6b7280' }}>No provinces found</div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          <div className="fin-report-filter">
            <Calendar size={14} />
            <select 
              value={periodMode === 'full' ? 'full' : periodMode === 'range' ? 'range' : `month-${reportMonth}`} 
              onChange={e => {
                const val = e.target.value;
                if (val === 'full') setPeriodMode('full');
                else if (val === 'range') setPeriodMode('range');
                else {
                  setPeriodMode('month');
                  setReportMonth(val.replace('month-', ''));
                }
              }} 
              className="fin-report-select"
            >
              <option value="full">Full Year</option>
              {MONTHS.map((m, i) => (
                <option key={i} value={`month-${i}`}>{m}</option>
              ))}
              <option value="range">Custom Range...</option>
            </select>
            <ChevronDown size={12} className="fin-report-select-arrow" />
          </div>

          {periodMode === 'range' && (
            <>
              <div className="fin-report-filter">
                <span style={{fontSize: '13px', color: '#6b7280', paddingRight: '4px'}}>From</span>
                <select value={startMonth} onChange={e => setStartMonth(Number(e.target.value))} className="fin-report-select" style={{ minWidth: '70px', paddingLeft: 0 }}>
                  {MONTHS.map((m, i) => (
                    <option key={i} value={i}>{MONTH_SHORT[i]}</option>
                  ))}
                </select>
                <ChevronDown size={12} className="fin-report-select-arrow" />
              </div>
              <div className="fin-report-filter">
                <span style={{fontSize: '13px', color: '#6b7280', paddingRight: '4px'}}>To</span>
                <select value={endMonth} onChange={e => setEndMonth(Number(e.target.value))} className="fin-report-select" style={{ minWidth: '70px', paddingLeft: 0 }}>
                  {MONTHS.map((m, i) => (
                    <option key={i} value={i}>{MONTH_SHORT[i]}</option>
                  ))}
                </select>
                <ChevronDown size={12} className="fin-report-select-arrow" />
              </div>
            </>
          )}

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
          onClick={handleGenerateClick}
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

      {/* ── Specific Communities Selector ── */}
      {locationType === 'specific' && branchesData.length > 0 && (
        <div className="fin-report-specific-communities no-print">
          <p className="fin-report-specific-label">Select Communities (Multiple allowed):</p>
          <div className="fin-report-branch-list">
            {[...branchesData].sort((a, b) => a.name.localeCompare(b.name)).map(b => (
              <label key={b.name} className={`fin-report-branch-chip${selectedCommunities.includes(b.name) ? ' selected' : ''}`}>
                <input 
                  type="checkbox" 
                  checked={selectedCommunities.includes(b.name)} 
                  onChange={() => toggleCommunity(b.name)} 
                />
                <MapPin size={11} />
                <span>{b.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}

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
            {report.community && <p>Location: {report.community}</p>}
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
              {report.executiveSummary?.split('\n').filter(Boolean).map((line, i) => {
                const isBullet = line.trim().startsWith('-') || line.trim().startsWith('•') || /^\d+\./.test(line.trim());
                return (
                  <p 
                    key={i} 
                    className={`fin-report-executive-para ${isBullet ? 'bullet' : ''}`}
                    style={isBullet ? { paddingLeft: '1.5rem', textIndent: '-1.2rem' } : {}}
                  >
                    {line}
                  </p>
                );
              })}
            </div>
          </div>

          {/* Donations Section - Only for Super Admin */}
          {report.donations && adminRole === 'admin' && (report.reportType === 'all' || report.reportType === 'donations') && (
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
                        <Pie data={report.donations.byCategory} cx="50%" cy="42%" innerRadius={35} outerRadius={75} paddingAngle={2} dataKey="value" nameKey="name" label={renderSliceLabel} labelLine={false}>
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
                    <p style={{textAlign: 'center', fontSize: '11px', color: '#6B7280', marginTop: '12px', marginBottom: 0}}>Period: {report.period}</p>
                  </div>
                )}

                {/* By Month */}
                {(() => {
                  // Build full 12-month data for the selected year
                  const byMonthMap = {};
                  (report.donations.byMonth || []).forEach(d => { byMonthMap[d.month] = d.value; });
                  const fullMonthData = MONTH_SHORT.map((label, i) => {
                    const key = `${reportYear}-${String(i + 1).padStart(2, '0')}`;
                    return { month: label, value: byMonthMap[key] || 0 };
                  });
                  return (
                    <div className="fin-report-chart-card">
                      <h3 className="fin-report-chart-title">Monthly Trend</h3>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={fullMonthData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₱${(v/1000).toFixed(0)}k`} allowDecimals={false} />
                          <Tooltip formatter={v => fmt(v)} />
                      <Bar dataKey="value" fill="#0D1F45" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                      <p style={{textAlign: 'center', fontSize: '11px', color: '#6B7280', marginTop: '12px', marginBottom: 0}}>Period: {report.period}</p>
                    </div>
                  );
                })()}
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

              {/* Loan Charts Row */}
              <div className="fin-report-charts-row">
                {/* Loan Status Donut */}
                {report.loans.byStatus?.length > 0 && (
                  <div className="fin-report-chart-card">
                    <h3 className="fin-report-chart-title">Loan Status Distribution</h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={report.loans.byStatus.map(s => ({ name: s.status, value: s.count }))}
                          cx="50%" cy="42%"
                          innerRadius={35} outerRadius={75}
                          paddingAngle={2}
                          dataKey="value"
                          label={renderSliceLabel}
                          labelLine={false}
                        >
                          {report.loans.byStatus.map((s, i) => (
                            <Cell key={i} fill={getStatusColor(s.status)} />
                          ))}
                          <Label value={report.loans.totalApplications} position="center" fill="#1e3a5f" style={{ fontSize: '18px', fontWeight: 'bold' }} />
                          <Label value="Total" position="center" dy={16} fill="#6B7280" style={{ fontSize: '10px' }} />
                        </Pie>
                        <Tooltip formatter={(v, name) => [v + ' loans', name]} />
                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <p style={{textAlign: 'center', fontSize: '11px', color: '#6B7280', marginTop: '12px', marginBottom: 0}}>Period: {report.period}</p>
                  </div>
                )}

                {/* Monthly Trend Bar */}
                {report.loans.byMonth?.length > 0 && (
                  <div className="fin-report-chart-card">
                    <h3 className="fin-report-chart-title">Monthly Trend</h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={report.loans.byMonth} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="month" tick={{ fontSize: 10 }} tickFormatter={v => MONTH_SHORT[parseInt(v.split('-')[1])-1]} />
                        <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `₱${(v/1000).toFixed(0)}k`} allowDecimals={false} />
                        <Tooltip formatter={v => fmt(v)} labelFormatter={v => {
                          const [y, m] = v.split('-');
                          return `${MONTHS[parseInt(m)-1]} ${y}`;
                        }} />
                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                        <Bar name="Disbursed" dataKey="disbursed" fill="#0D1F45" radius={[4, 4, 0, 0]} barSize={20} />
                        <Bar name="Collected" dataKey="received" fill="#10B981" radius={[4, 4, 0, 0]} barSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                    <p style={{textAlign: 'center', fontSize: '11px', color: '#6B7280', marginTop: '12px', marginBottom: 0}}>Period: {report.period}</p>
                  </div>
                )}
              </div>

              {/* Financial Overview Bar Chart */}
              <div className="fin-report-chart-card">
                <h3 className="fin-report-chart-title">Financial Overview</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={[
                      { name: 'Applied', value: report.loans.totalAmountApplied || 0 },
                      { name: 'Disbursed', value: report.loans.totalDisbursed || 0 },
                      { name: 'Received', value: report.loans.totalPaymentsReceived || 0 },
                      { name: 'Interest', value: report.loans.totalInterestEarned || 0 },
                    ]}
                    margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₱${(v/1000).toFixed(0)}k`} allowDecimals={false} />
                    <Tooltip formatter={v => fmt(v)} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={40}>
                      <Cell fill="#2563EB" />
                      <Cell fill="#0D1F45" />
                      <Cell fill="#10B981" />
                      <Cell fill="#8B5CF6" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <p style={{textAlign: 'center', fontSize: '11px', color: '#6B7280', marginTop: '12px', marginBottom: 0}}>Period: {report.period}</p>
              </div>
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

              {/* Savings Charts Row */}
              <div className="fin-report-charts-row">
                {/* Savings Goals Donut */}
                {(report.savings.activeGoals > 0 || report.savings.completedGoals > 0) && (
                  <div className="fin-report-chart-card">
                    <h3 className="fin-report-chart-title">Savings Goals</h3>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Active', value: report.savings.activeGoals },
                            { name: 'Completed', value: report.savings.completedGoals },
                          ]}
                          cx="50%" cy="42%"
                          innerRadius={35} outerRadius={70}
                          paddingAngle={3}
                          dataKey="value"
                          label={renderSliceLabel}
                          labelLine={false}
                        >
                          <Cell fill="#2563EB" />
                          <Cell fill="#10B981" />
                          <Label value={report.savings.activeGoals + report.savings.completedGoals} position="center" fill="#1e3a5f" style={{ fontSize: '18px', fontWeight: 'bold' }} />
                          <Label value="Goals" position="center" dy={16} fill="#6B7280" style={{ fontSize: '10px' }} />
                        </Pie>
                        <Tooltip formatter={(v, name) => [v + ' goals', name]} />
                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <p style={{textAlign: 'center', fontSize: '11px', color: '#6B7280', marginTop: '12px', marginBottom: 0}}>Period: {report.period}</p>
                  </div>
                )}

                {/* Savings vs Target Bar */}
                <div className="fin-report-chart-card">
                  <h3 className="fin-report-chart-title">Savings vs Target</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart
                      data={[
                        { name: 'Total Saved', value: report.savings.totalSaved || 0 },
                        { name: 'Total Target', value: report.savings.totalTargets || 0 },
                        { name: 'Period Deposits', value: report.savings.periodDeposits || 0 },
                      ]}
                      margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₱${(v/1000).toFixed(0)}k`} allowDecimals={false} />
                      <Tooltip formatter={v => fmt(v)} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={40}>
                        <Cell fill="#10B981" />
                        <Cell fill="#0D1F45" />
                        <Cell fill="#2563EB" />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                  <p style={{textAlign: 'center', fontSize: '11px', color: '#6B7280', marginTop: '12px', marginBottom: 0}}>Period: {report.period}</p>
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
          {(report.memberGrowth || report.attendance) && adminRole === 'admin' && (report.reportType === 'all' || report.reportType === 'attendance') && (
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
                    <Bar dataKey="value" fill="#0D1F45" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  <p style={{textAlign: 'center', fontSize: '11px', color: '#6B7280', marginTop: '12px', marginBottom: 0}}>Period: {report.period}</p>
                </div>
              )}

              {/* Attendee Names Table */}
              {report.attendance?.attendees?.length > 0 && (
                <div className="fin-report-table-wrap">
                  <h3 className="fin-report-chart-title">Attendee List ({report.attendance.attendees.length} records)</h3>
                  <table className="fin-report-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Member</th>
                        <th>Community</th>
                        <th>Service</th>
                        <th>Date</th>
                        <th>Time In</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.attendance.attendees.map((a, i) => (
                        <tr key={i}>
                          <td>{i + 1}</td>
                          <td style={{ fontWeight: 600 }}>{a.name}</td>
                          <td>{a.branch}</td>
                          <td>{a.service}</td>
                          <td>{a.date}</td>
                          <td>{a.time}</td>
                          <td>
                            <span className={`status-badge ${a.status.toLowerCase()}`} style={{ fontSize: '11px', padding: '2px 8px' }}>
                              {a.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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

              {/* Secretary Charts Row */}
              <div className="fin-report-charts-row">
                {/* Monthly Disbursements */}
                {report.secretary.disbursements.byMonth?.length > 0 && (
                  <div className="fin-report-chart-card">
                    <h3 className="fin-report-chart-title">Monthly Disbursements</h3>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={report.secretary.disbursements.byMonth} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="month" tick={{ fontSize: 10 }} tickFormatter={v => MONTH_SHORT[parseInt(v.split('-')[1])-1]} />
                        <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `₱${(v/1000).toFixed(0)}k`} allowDecimals={false} />
                        <Tooltip formatter={v => fmt(v)} labelFormatter={v => {
                          const [y, m] = v.split('-');
                          return `${MONTHS[parseInt(m)-1]} ${y}`;
                        }} />
                        <Bar dataKey="value" fill="#0D1F45" radius={[4, 4, 0, 0]} barSize={30} />
                      </BarChart>
                    </ResponsiveContainer>
                    <p style={{textAlign: 'center', fontSize: '11px', color: '#6B7280', marginTop: '12px', marginBottom: 0}}>Period: {report.period}</p>
                  </div>
                )}

                {/* Payment Method Distribution */}
                {report.secretary.disbursements.byMethod?.length > 0 && (
                  <div className="fin-report-chart-card">
                    <h3 className="fin-report-chart-title">Payment Method</h3>
                    <p style={{fontSize: '11px', color: '#6B7280', margin: '0 0 4px'}}>Disbursement distribution</p>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie
                          data={report.secretary.disbursements.byMethod.map(m => ({ name: m.method, value: m.value }))}
                          cx="50%" cy="45%"
                          innerRadius={35} outerRadius={68}
                          paddingAngle={2}
                          dataKey="value"
                          label={renderSliceLabel}
                          labelLine={false}
                        >
                          {report.secretary.disbursements.byMethod.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                          <Label value={fmt(report.secretary.disbursements.totalAmount)} position="center" fill="#1e3a5f" style={{ fontSize: '13px', fontWeight: 'bold' }} />
                          <Label value="Total" position="center" dy={16} fill="#6B7280" style={{ fontSize: '10px' }} />
                        </Pie>
                        <Tooltip formatter={v => fmt(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="fin-report-legend">
                      {report.secretary.disbursements.byMethod.map((m, i) => (
                        <div key={i} className="fin-report-legend-item">
                          <span className="fin-report-legend-dot" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                          <span className="fin-report-legend-label">{m.method}</span>
                          <span className="fin-report-legend-val">{fmt(m.value)} ({report.secretary.disbursements.totalAmount > 0 ? ((m.value / report.secretary.disbursements.totalAmount) * 100).toFixed(0) : 0}%)</span>
                        </div>
                      ))}
                    </div>
                    <p style={{textAlign: 'center', fontSize: '11px', color: '#6B7280', marginTop: '12px', marginBottom: 0}}>Period: {report.period}</p>
                  </div>
                )}
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

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fin-confirm-overlay" onClick={() => setShowConfirm(false)}>
          <div className="fin-confirm-modal" onClick={e => e.stopPropagation()}>
            <button className="fin-confirm-close" onClick={() => setShowConfirm(false)}>
              <X size={18} />
            </button>
            <div className="fin-confirm-icon">
              <AlertCircle size={28} />
            </div>
            <h3 className="fin-confirm-title">Confirm Report Generation</h3>
            <p className="fin-confirm-desc">Please review the details below before proceeding. AI report generation may take 10–15 seconds.</p>
            <div className="fin-confirm-details">
              <div className="fin-confirm-row">
                <span className="fin-confirm-label">Report Type</span>
                <span className="fin-confirm-value">{getReportTypeName()}</span>
              </div>
              <div className="fin-confirm-row">
                <span className="fin-confirm-label">Period</span>
                <span className="fin-confirm-value">{getPeriodName()}</span>
              </div>
              <div className="fin-confirm-row">
                <span className="fin-confirm-label">Location</span>
                <span className="fin-confirm-value">
                  {locationType === 'all' ? 'All Locations' : 
                   locationType === 'province' ? `${selectedProvinces.length} Provinces Selected` : 
                   `${selectedCommunities.length} Communities Selected`}
                </span>
              </div>
            </div>
            <div className="fin-confirm-actions">
              <button className="fin-report-btn secondary" onClick={() => setShowConfirm(false)}>Cancel</button>
              <button className="fin-report-btn primary" onClick={handleConfirmGenerate}>
                <Sparkles size={16} />
                Generate Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
