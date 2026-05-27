import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import useSWR from 'swr';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Label, LabelList
} from 'recharts';

import '../styles/AdminFinancialReport.css';
import API from '../../utils/api';
import { FileText, Printer, RefreshCw, Sparkles, Calendar, ChevronDown, Download, MapPin, AlertCircle, X } from 'lucide-react';

// Color palette for per-community comparison lines
const COMMUNITY_COLORS = ['#2563eb', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16'];

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
const fmtShort = (n) => { const v = Number(n) || 0; return v >= 1000 ? `₱${(v/1000).toFixed(1)}k` : `₱${v.toLocaleString()}`; };
const PIE_COLORS = ['#0D1F45', '#1e3a8a', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'];

const METHOD_MAP = { 'bank': 'Bank Transfer', 'bank transfer': 'Bank Transfer', 'gcash': 'E-Wallet', 'maya': 'E-Wallet', 'grab_pay': 'E-Wallet', 'e-wallet': 'E-Wallet', 'ewallet': 'E-Wallet', 'cash': 'Cash', 'check': 'Check', 'cheque': 'Check', 'manual': 'Manual' };
const normalizeMethod = (m) => METHOD_MAP[(m || '').toLowerCase()] || m;

const ChartFooter = ({ period, location }) => (
  <div className="fin-chart-footer">
    <p className="fin-chart-footer-source">Source: IsangDiwa · {period} · {location}</p>
  </div>
);

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
  const currentMonthIndex = now.getMonth(); // 0=Jan, 4=May, etc.

  const [periodMode, setPeriodMode] = useState('full');
  const [reportMonth, setReportMonth] = useState('');
  const [startMonth, setStartMonth] = useState(0);
  const [endMonth, setEndMonth] = useState(currentMonthIndex);
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
  const [compareYoY, setCompareYoY] = useState(false);

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
      if (compareYoY) params.set('compare', 'true');

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
  }, [periodMode, reportMonth, startMonth, endMonth, reportYear, reportType, locationType, selectedProvinces, selectedCommunities, compareYoY, navigate]);

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

  // Max selectable month: if selected year is current year, cap at current month; otherwise allow all 12
  const maxSelectableMonth = reportYear === now.getFullYear() ? currentMonthIndex : 11;

  // Build location label from report data
  const getLocationLabel = () => {
    if (!report) return '';
    if (locationType === 'province' && selectedProvinces.length > 0) {
      if (selectedProvinces.length <= 3) return selectedProvinces.join(' and ');
      return `${selectedProvinces.slice(0, 3).join(', ')} (+${selectedProvinces.length - 3} more)`;
    }
    if (locationType === 'specific' && selectedCommunities.length > 0) {
      if (selectedCommunities.length <= 5) return selectedCommunities.join(', ');
      return `${selectedCommunities.slice(0, 4).join(', ')} (+${selectedCommunities.length - 4} more)`;
    }
    return 'All Locations';
  };



  // Get the month range to display on charts based on selected period
  const getChartMonthRange = () => {
    const maxMonth = reportYear === now.getFullYear() ? currentMonthIndex : 11;
    if (periodMode === 'range') return { from: startMonth, to: endMonth };
    if (periodMode === 'month' && reportMonth !== '') return { from: parseInt(reportMonth), to: parseInt(reportMonth) };
    return { from: 0, to: maxMonth }; // full year
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
      const reportTypeName = (() => {
        if (adminRole === 'loanAdmin') return 'Loan_Staff';
        if (adminRole === 'secretaryAdmin') return 'Secretary';
        return getReportTypeName().replace(/\s+/g, '_');
      })();
      const locationName = (() => {
        if (locationType === 'province' && selectedProvinces.length > 0) {
          return '_' + selectedProvinces.join('_').replace(/\s+/g, '_');
        }
        if (locationType === 'specific' && selectedCommunities.length > 0) {
          const names = selectedCommunities.length <= 3 ? selectedCommunities : selectedCommunities.slice(0, 3);
          return '_' + names.join('_').replace(/\s+/g, '_') + (selectedCommunities.length > 3 ? `_+${selectedCommunities.length - 3}more` : '');
        }
        return '_All_Locations';
      })();
      const filename = `IsangDiwa_${reportTypeName}_Report_${periodName}${locationName}.pdf`;

      const opt = {
        margin:       [10, 10, 10, 10],
        filename,
        image:        { type: 'jpeg', quality: 0.95 },
        html2canvas:  { scale: 2, useCORS: true, logging: false },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] },
      };

      const html2pdf = (await import('html2pdf.js')).default;
      element.classList.add('exporting-pdf');
      await html2pdf().set(opt).from(element).save();
      element.classList.remove('exporting-pdf');
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
                i <= maxSelectableMonth ? <option key={i} value={`month-${i}`}>{m}</option> : null
              ))}
              <option value="range">Custom Range...</option>
            </select>
            <ChevronDown size={12} className="fin-report-select-arrow" />
          </div>

          {periodMode === 'range' && (
            <>
              <div className="fin-report-filter">
                <span style={{fontSize: '13px', color: '#6b7280', paddingRight: '4px'}}>From</span>
                <select value={startMonth} onChange={e => { const v = Number(e.target.value); setStartMonth(v); if (v >= endMonth) setEndMonth(Math.min(v + 1, maxSelectableMonth)); }} className="fin-report-select" style={{ minWidth: '70px', paddingLeft: 0 }}>
                  {MONTHS.map((m, i) => (
                    i < maxSelectableMonth ? <option key={i} value={i}>{MONTH_SHORT[i]}</option> : null
                  ))}
                </select>
                <ChevronDown size={12} className="fin-report-select-arrow" />
              </div>
              <div className="fin-report-filter">
                <span style={{fontSize: '13px', color: '#6b7280', paddingRight: '4px'}}>To</span>
                <select value={endMonth} onChange={e => setEndMonth(Number(e.target.value))} className="fin-report-select" style={{ minWidth: '70px', paddingLeft: 0 }}>
                  {MONTHS.map((m, i) => (
                    i > startMonth && i <= maxSelectableMonth ? <option key={i} value={i}>{MONTH_SHORT[i]}</option> : null
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

          <label className="fin-report-compare-label">
            <input type="checkbox" checked={compareYoY} onChange={e => setCompareYoY(e.target.checked)} className="fin-report-compare-checkbox" />
            Compare YoY
          </label>
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
            <h1>IsangDiwa Financial Report</h1>
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

          {/* === Year-over-Year Comparative Analysis === */}
          {report.comparison && (
            <div className="fin-report-section">
              <div className="fin-report-section-header">
                <h2 className="fin-report-section-title">📊 Year-over-Year Comparison</h2>
              </div>
              <p className="fin-chart-summary compare-vs"><strong>{report.comparison.currentPeriod}</strong> vs <strong>{report.comparison.prevPeriod}</strong></p>

              <div className="fin-report-charts-row">
                {/* Donations Comparison */}
                {report.comparison.donations && (() => {
                  const d = report.comparison.donations;
                  const barData = [
                    { label: 'Total Amount', current: d.current, previous: d.previous },
                    { label: 'Transactions', current: d.currentCount, previous: d.previousCount },
                  ];
                  return (
                    <div className="fin-report-chart-card">
                      <h3 className="fin-report-chart-title">Donations — Period Over Period</h3>
                      <p className="fin-chart-summary">
                        Current: <strong>{fmt(d.current)}</strong> · Previous: <strong>{fmt(d.previous)}</strong>
                        {d.change !== null && <> · Change: <strong className={d.change >= 0 ? 'fin-change-positive' : 'fin-change-negative'}>{d.change >= 0 ? '+' : ''}{d.change}%</strong></>}
                      </p>
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={barData} margin={{ top: 15, right: 10, left: -10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                          <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} allowDecimals={false} />
                          <Tooltip formatter={v => typeof v === 'number' && v >= 100 ? fmt(v) : v} />
                          <Bar name={report.comparison.currentPeriod} dataKey="current" fill="#0D1F45" radius={[4, 4, 0, 0]} barSize={28}>
                            <LabelList dataKey="current" position="top" formatter={v => v >= 1000 ? fmtShort(v) : v} style={{ fontSize: 10, fill: '#0D1F45', fontWeight: 700 }} />
                          </Bar>
                          <Bar name={report.comparison.prevPeriod} dataKey="previous" fill="#93c5fd" radius={[4, 4, 0, 0]} barSize={28}>
                            <LabelList dataKey="previous" position="top" formatter={v => v >= 1000 ? fmtShort(v) : v} style={{ fontSize: 10, fill: '#93c5fd' }} />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                      <div className="fin-report-legend fin-report-legend-center">
                        <div className="fin-report-legend-item fin-report-legend-gap">
                          <span className="fin-report-legend-dot" style={{ background: '#0D1F45' }} />
                          <span className="fin-report-legend-label">{report.comparison.currentPeriod}</span>
                          <span style={{ fontSize: '10px', color: '#4B5563', marginLeft: '6px' }}>({fmt(report.comparison.donations.current)})</span>
                        </div>
                        <div className="fin-report-legend-item fin-report-legend-gap">
                          <span className="fin-report-legend-dot" style={{ background: '#93c5fd' }} />
                          <span className="fin-report-legend-label">{report.comparison.prevPeriod}</span>
                          <span style={{ fontSize: '10px', color: '#4B5563', marginLeft: '6px' }}>({fmt(report.comparison.donations.previous)})</span>
                        </div>
                      </div>
                      <ChartFooter period={`${report.comparison.currentPeriod} vs ${report.comparison.prevPeriod}`} location={getLocationLabel()} />
                    </div>
                  );
                })()}

                {/* Attendance Comparison */}
                {report.comparison.attendance && (() => {
                  const a = report.comparison.attendance;
                  const barData = [{ label: 'Total Attendance', current: a.current, previous: a.previous }];
                  return (
                    <div className="fin-report-chart-card">
                      <h3 className="fin-report-chart-title">Attendance — Period Over Period</h3>
                      <p className="fin-chart-summary">
                        Current: <strong>{a.current} attendees</strong> · Previous: <strong>{a.previous} attendees</strong>
                        {a.change !== null && <> · Change: <strong className={a.change >= 0 ? 'fin-change-positive' : 'fin-change-negative'}>{a.change >= 0 ? '+' : ''}{a.change}%</strong></>}
                      </p>
                      <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={barData} margin={{ top: 15, right: 10, left: -10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                          <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                          <Tooltip />
                          <Bar name={report.comparison.currentPeriod} dataKey="current" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={36}>
                            <LabelList dataKey="current" position="top" style={{ fontSize: 11, fill: '#2563eb', fontWeight: 700 }} />
                          </Bar>
                          <Bar name={report.comparison.prevPeriod} dataKey="previous" fill="#bfdbfe" radius={[4, 4, 0, 0]} barSize={36}>
                            <LabelList dataKey="previous" position="top" style={{ fontSize: 11, fill: '#93c5fd' }} />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                      <div className="fin-report-legend fin-report-legend-center">
                        <div className="fin-report-legend-item fin-report-legend-gap">
                          <span className="fin-report-legend-dot" style={{ background: '#2563eb' }} />
                          <span className="fin-report-legend-label">{report.comparison.currentPeriod}</span>
                          <span style={{ fontSize: '10px', color: '#4B5563', marginLeft: '6px' }}>({a.current} attendees)</span>
                        </div>
                        <div className="fin-report-legend-item fin-report-legend-gap">
                          <span className="fin-report-legend-dot" style={{ background: '#bfdbfe' }} />
                          <span className="fin-report-legend-label">{report.comparison.prevPeriod}</span>
                          <span style={{ fontSize: '10px', color: '#4B5563', marginLeft: '6px' }}>({a.previous} attendees)</span>
                        </div>
                      </div>
                      <ChartFooter period={`${report.comparison.currentPeriod} vs ${report.comparison.prevPeriod}`} location={getLocationLabel()} />
                    </div>
                  );
                })()}
              </div>

              {/* Loans Comparison */}
              {report.comparison.loans && (
                <div className="fin-report-charts-row" style={{marginTop: '16px'}}>
                  <div className="fin-report-chart-card">
                    <h3 className="fin-report-chart-title">Loans — Period Over Period</h3>
                    <p className="fin-chart-summary">
                      Applications: <strong>{report.comparison.loans.currentApps}</strong> vs <strong>{report.comparison.loans.previousApps}</strong>
                      {report.comparison.loans.changeApps !== null && <> (<strong className={report.comparison.loans.changeApps >= 0 ? 'fin-change-positive' : 'fin-change-negative'}>{report.comparison.loans.changeApps >= 0 ? '+' : ''}{report.comparison.loans.changeApps}%</strong>)</>}
                    </p>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={[
                        { label: 'Applications', current: report.comparison.loans.currentApps, previous: report.comparison.loans.previousApps },
                        { label: 'Disbursed', current: report.comparison.loans.currentDisbursed, previous: report.comparison.loans.previousDisbursed },
                        { label: 'Collected', current: report.comparison.loans.currentCollected, previous: report.comparison.loans.previousCollected },
                      ]} margin={{ top: 15, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} allowDecimals={false} />
                        <Tooltip formatter={v => typeof v === 'number' && v >= 100 ? fmt(v) : v} />
                        <Bar name={report.comparison.currentPeriod} dataKey="current" fill="#0D1F45" radius={[4, 4, 0, 0]} barSize={24}>
                          <LabelList dataKey="current" position="top" formatter={v => v >= 1000 ? fmtShort(v) : v} style={{ fontSize: 9, fill: '#0D1F45', fontWeight: 700 }} />
                        </Bar>
                        <Bar name={report.comparison.prevPeriod} dataKey="previous" fill="#93c5fd" radius={[4, 4, 0, 0]} barSize={24}>
                          <LabelList dataKey="previous" position="top" formatter={v => v >= 1000 ? fmtShort(v) : v} style={{ fontSize: 9, fill: '#93c5fd' }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="fin-report-legend fin-report-legend-center">
                      <div className="fin-report-legend-item fin-report-legend-gap">
                        <span className="fin-report-legend-dot" style={{ background: '#0D1F45' }} />
                        <span className="fin-report-legend-label">{report.comparison.currentPeriod}</span>
                      </div>
                      <div className="fin-report-legend-item fin-report-legend-gap">
                        <span className="fin-report-legend-dot" style={{ background: '#93c5fd' }} />
                        <span className="fin-report-legend-label">{report.comparison.prevPeriod}</span>
                      </div>
                    </div>
                    <ChartFooter period={`${report.comparison.currentPeriod} vs ${report.comparison.prevPeriod}`} location={getLocationLabel()} />
                  </div>
                </div>
              )}

              {/* Disbursements Comparison */}
              {report.comparison.disbursements && (
                <div className="fin-report-charts-row" style={{marginTop: '16px'}}>
                  <div className="fin-report-chart-card">
                    <h3 className="fin-report-chart-title">Disbursements — Period Over Period</h3>
                    <p className="fin-chart-summary">
                      Current: <strong>{fmt(report.comparison.disbursements.current)}</strong> · Previous: <strong>{fmt(report.comparison.disbursements.previous)}</strong>
                      {report.comparison.disbursements.change !== null && <> · Change: <strong className={report.comparison.disbursements.change >= 0 ? 'fin-change-positive' : 'fin-change-negative'}>{report.comparison.disbursements.change >= 0 ? '+' : ''}{report.comparison.disbursements.change}%</strong></>}
                    </p>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={[
                        { label: 'Amount', current: report.comparison.disbursements.current, previous: report.comparison.disbursements.previous },
                        { label: 'Count', current: report.comparison.disbursements.currentCount, previous: report.comparison.disbursements.previousCount },
                      ]} margin={{ top: 15, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} allowDecimals={false} />
                        <Tooltip formatter={v => typeof v === 'number' && v >= 100 ? fmt(v) : v} />
                        <Bar name={report.comparison.currentPeriod} dataKey="current" fill="#0D1F45" radius={[4, 4, 0, 0]} barSize={36}>
                          <LabelList dataKey="current" position="top" formatter={v => v >= 1000 ? fmtShort(v) : v} style={{ fontSize: 10, fill: '#0D1F45', fontWeight: 700 }} />
                        </Bar>
                        <Bar name={report.comparison.prevPeriod} dataKey="previous" fill="#93c5fd" radius={[4, 4, 0, 0]} barSize={36}>
                          <LabelList dataKey="previous" position="top" formatter={v => v >= 1000 ? fmtShort(v) : v} style={{ fontSize: 10, fill: '#93c5fd' }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="fin-report-legend fin-report-legend-center">
                      <div className="fin-report-legend-item fin-report-legend-gap">
                        <span className="fin-report-legend-dot" style={{ background: '#0D1F45' }} />
                        <span className="fin-report-legend-label">{report.comparison.currentPeriod}</span>
                        <span style={{ fontSize: '10px', color: '#4B5563', marginLeft: '6px' }}>({fmt(report.comparison.disbursements.current)})</span>
                      </div>
                      <div className="fin-report-legend-item fin-report-legend-gap">
                        <span className="fin-report-legend-dot" style={{ background: '#93c5fd' }} />
                        <span className="fin-report-legend-label">{report.comparison.prevPeriod}</span>
                        <span style={{ fontSize: '10px', color: '#4B5563', marginLeft: '6px' }}>({fmt(report.comparison.disbursements.previous)})</span>
                      </div>
                    </div>
                    <ChartFooter period={`${report.comparison.currentPeriod} vs ${report.comparison.prevPeriod}`} location={getLocationLabel()} />
                  </div>
                </div>
              )}
            </div>
          )}

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
              <div className="fin-report-charts-row" style={{ gridTemplateColumns: report.donations.byCategory?.length > 0 ? '4fr 6fr' : '1fr' }}>
                {/* By Category */}
                {report.donations.byCategory?.length > 0 && (
                  <div className="fin-report-chart-card">
                    <h3 className="fin-report-chart-title">Donations By Category</h3>
                    <p className="fin-chart-summary">Total: <strong>{fmt(report.donations.total)}</strong> · {report.donations.byCategory.length} categories</p>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={report.donations.byCategory} cx="50%" cy="42%" innerRadius={35} outerRadius={75} paddingAngle={2} dataKey="value" nameKey="name" label={renderSliceLabel} labelLine={false}>
                          {report.donations.byCategory.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v, name) => [fmt(v), name === 'value' ? 'Amount' : name]} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="fin-report-legend">
                      {report.donations.byCategory.map((cat, i) => (
                        <div key={i} className="fin-report-legend-item">
                          <span className="fin-report-legend-dot" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                          <span className="fin-report-legend-label">{cat.name}</span>
                          <span className="fin-report-legend-val">{fmt(cat.value)} · {report.donations.total > 0 ? ((cat.value / report.donations.total) * 100).toFixed(0) : 0}%</span>
                        </div>
                      ))}
                    </div>
                    <ChartFooter period={report.period} location={getLocationLabel()} />
                  </div>
                )}

                {/* Monthly Donation Trend (Row 1) */}
                {(() => {
                  const byMonthMap = {};
                  (report.donations.byMonth || []).forEach(d => { byMonthMap[d.month] = d.value; });
                  const { from, to } = getChartMonthRange();

                  const bmp = report.donations.byMonthByProvince || {};
                  const availableProvinces = [...new Set(Object.values(bmp).flatMap(obj => Object.keys(obj)))].sort();
                  const showProvinceTrend = availableProvinces.length >= 2;

                  let allSeries = [];
                  let dataMap = {};
                  let chartTitle = 'Monthly Donation Trend';

                  if (showProvinceTrend) {
                    allSeries = availableProvinces;
                    dataMap = bmp;
                    chartTitle = `Monthly Donation Trend (By Province)`;
                  } else {
                    allSeries = [];
                    dataMap = {};
                    chartTitle = `Monthly Donation Trend`;
                  }

                  const isMulti = allSeries.length >= 2;

                  const seriesWithData = allSeries.filter(s => Object.values(dataMap).some(monthObj => (monthObj[s] || 0) > 0));

                  const fullMonthData = MONTH_SHORT.slice(from, to + 1).map((label, idx) => {
                    const i = from + idx;
                    const key = `${reportYear}-${String(i + 1).padStart(2, '0')}`;
                    const row = { month: label, value: byMonthMap[key] || 0 };
                    if (isMulti && dataMap[key]) {
                      allSeries.forEach(s => { row[s] = dataMap[key][s] || 0; });
                    }
                    return row;
                  });

                  const totalDon = fullMonthData.reduce((s, d) => s + d.value, 0);
                  const highestMon = fullMonthData.reduce((a, b) => b.value > a.value ? b : a, fullMonthData[0]);
                  
                  return (
                    <div className="fin-report-chart-card">
                      <h3 className="fin-report-chart-title">{chartTitle}</h3>
                      <p className="fin-chart-summary">Total: <strong>{fmt(totalDon)}</strong> · Highest: <strong>{highestMon?.month}</strong> ({fmt(highestMon?.value)})</p>
                      <ResponsiveContainer width="100%" height={isMulti ? 280 : 220}>
                        {isMulti ? (
                          <BarChart data={fullMonthData} margin={{ top: 15, right: 10, left: -10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `₱${(v/1000).toFixed(0)}k`} allowDecimals={false}>
                              <Label value="Amount (₱)" angle={-90} position="insideLeft" offset={20} style={{ fontSize: 9, fill: '#9CA3AF' }} />
                            </YAxis>
                            <Tooltip formatter={(v, name) => [fmt(v), name === 'value' ? 'Amount' : name]} />
                            {allSeries.map((s, i) => (
                              <Bar key={s} dataKey={s} fill={COMMUNITY_COLORS[i % COMMUNITY_COLORS.length]} />
                            ))}
                          </BarChart>
                        ) : (
                          <BarChart data={fullMonthData} margin={{ top: 15, right: 10, left: -10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `₱${(v/1000).toFixed(0)}k`} allowDecimals={false}>
                              <Label value="Amount (₱)" angle={-90} position="insideLeft" offset={20} style={{ fontSize: 9, fill: '#9CA3AF' }} />
                            </YAxis>
                            <Tooltip formatter={(v, name) => [fmt(v), name === 'value' ? 'Amount' : name]} />
                            <Bar dataKey="value" fill="#0D1F45" radius={[4, 4, 0, 0]}>
                              <LabelList dataKey="value" position="top" formatter={v => v > 0 ? fmtShort(v) : ''} style={{ fontSize: 10, fill: '#6B7280' }} />
                            </Bar>
                          </BarChart>
                        )}
                      </ResponsiveContainer>
                      {isMulti && (() => {
                        const branchToProv = {};
                        branchesData.forEach(b => {
                          branchToProv[b.name] = b.province || (b.address ? b.address.split(',')[0].trim() : 'Unknown');
                        });
                        const seriesByProv = {};
                        allSeries.forEach((s, i) => {
                          const prov = showProvinceTrend ? s : (branchToProv[s] || 'Unknown');
                          if (!seriesByProv[prov]) seriesByProv[prov] = [];
                          seriesByProv[prov].push({ name: s, index: i });
                        });
                        
                        return (
                          <div className="fin-report-grouped-legend" style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', marginTop: '16px' }}>
                            {Object.entries(seriesByProv).map(([prov, seriesList]) => {
                              const activeSeries = seriesList.filter(s => seriesWithData.includes(s.name));
                              if (activeSeries.length === 0) return null;
                              return (
                                <div key={prov} className="fin-report-legend-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '120px' }}>
                                  {!showProvinceTrend && (
                                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase', borderBottom: '1px solid #e5e7eb', paddingBottom: '4px', marginBottom: '2px' }}>
                                      {prov}
                                    </div>
                                  )}
                                  {activeSeries.map((s) => {
                                    const totalVal = fullMonthData.reduce((sum, row) => sum + (row[s.name] || 0), 0);
                                    return (
                                      <div key={s.name} className="fin-report-legend-item" style={{ margin: 0, flexDirection: 'column', alignItems: 'flex-start' }}>
                                        <div style={{ display: 'flex', alignItems: 'center' }}>
                                          <span className="fin-report-legend-dot" style={{ background: COMMUNITY_COLORS[s.index % COMMUNITY_COLORS.length] }} />
                                          <span className="fin-report-legend-label">{s.name}</span>
                                          <span style={{ fontSize: '10px', color: '#4B5563', marginLeft: '6px' }}>({fmt(totalVal)})</span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })}
                            {allSeries.some(s => !seriesWithData.includes(s)) && (
                              <div style={{ width: '100%', fontSize: '11px', color: '#9CA3AF', marginTop: '8px', fontStyle: 'italic' }}>
                                No donations: {allSeries.filter(s => !seriesWithData.includes(s)).join(', ')}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                      <ChartFooter period={report.period} location={getLocationLabel()} />
                    </div>
                  );
                })()}
              </div>

              {/* Monthly Donation Trend (Row 2 - By Community) */}
              {(() => {
                const bmc = report.donations.byMonthByCommunity || {};
                let allSeries = [...new Set(Object.values(bmc).flatMap(obj => Object.keys(obj)))].sort();
                const shouldShowRow2 = allSeries.length >= 1;
                if (!shouldShowRow2) return null;
                return (
                <div className="fin-report-charts-row" style={{ gridTemplateColumns: '1fr', marginTop: '16px' }}>
                  {(() => {
                    const byMonthMap = {};
                    (report.donations.byMonth || []).forEach(d => { byMonthMap[d.month] = d.value; });
                    const { from, to } = getChartMonthRange();
                    const isMulti = allSeries.length >= 2;

                    // Separate communities with data vs without
                    const seriesWithData = allSeries.filter(s => {
                      return Object.values(bmc).some(monthObj => (monthObj[s] || 0) > 0);
                    });

                    const fullMonthData = MONTH_SHORT.slice(from, to + 1).map((label, idx) => {
                      const i = from + idx;
                      const key = `${reportYear}-${String(i + 1).padStart(2, '0')}`;
                      const row = { month: label, value: byMonthMap[key] || 0 };
                      if (isMulti && bmc[key]) {
                        seriesWithData.forEach(s => { row[s] = bmc[key][s] || 0; });
                      }
                      return row;
                    });

                    const totalDon = fullMonthData.reduce((s, d) => s + d.value, 0);
                    const highestMon = fullMonthData.reduce((a, b) => b.value > a.value ? b : a, fullMonthData[0]);
                    
                    return (
                      <div className="fin-report-chart-card" style={{ width: '100%' }}>
                        <h3 className="fin-report-chart-title">Monthly Donation Trend (By Community)</h3>
                        <p className="fin-chart-summary">Detailed Community Breakdown · Total: <strong>{fmt(totalDon)}</strong> · Highest: <strong>{highestMon?.month}</strong></p>
                        <ResponsiveContainer width="100%" height={isMulti ? 320 : 220}>
                          {isMulti ? (
                            <BarChart data={fullMonthData} margin={{ top: 15, right: 10, left: -10, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `₱${(v/1000).toFixed(0)}k`} allowDecimals={false}>
                                <Label value="Amount (₱)" angle={-90} position="insideLeft" offset={20} style={{ fontSize: 9, fill: '#9CA3AF' }} />
                              </YAxis>
                              <Tooltip formatter={(v, name) => [fmt(v), name === 'value' ? 'Amount' : name]} />
                              {seriesWithData.map((s, i) => {
                                const origIdx = allSeries.indexOf(s);
                                return <Bar key={s} dataKey={s} fill={COMMUNITY_COLORS[origIdx % COMMUNITY_COLORS.length]} />;
                              })}
                            </BarChart>
                          ) : (
                            <BarChart data={fullMonthData} margin={{ top: 15, right: 10, left: -10, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `₱${(v/1000).toFixed(0)}k`} allowDecimals={false}>
                                <Label value="Amount (₱)" angle={-90} position="insideLeft" offset={20} style={{ fontSize: 9, fill: '#9CA3AF' }} />
                              </YAxis>
                              <Tooltip formatter={(v, name) => [fmt(v), name === 'value' ? 'Amount' : name]} />
                              <Bar dataKey="value" fill="#0D1F45" radius={[4, 4, 0, 0]}>
                                <LabelList dataKey="value" position="top" formatter={v => v > 0 ? fmtShort(v) : ''} style={{ fontSize: 10, fill: '#6B7280' }} />
                              </Bar>
                            </BarChart>
                          )}
                        </ResponsiveContainer>
                        {isMulti && (() => {
                          const branchToProv = {};
                          branchesData.forEach(b => {
                            branchToProv[b.name] = b.province || (b.address ? b.address.split(',')[0].trim() : 'Unknown');
                          });
                          const seriesByProv = {};
                          allSeries.forEach((s, i) => {
                            const prov = branchToProv[s] || 'Unknown';
                            if (!seriesByProv[prov]) seriesByProv[prov] = [];
                            const hasData = seriesWithData.includes(s);
                            seriesByProv[prov].push({ name: s, index: i, hasData });
                          });
                          
                          return (
                            <div className="fin-report-grouped-legend" style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', marginTop: '16px' }}>
                              {Object.entries(seriesByProv).map(([prov, seriesList]) => {
                                const activeSeries = seriesList.filter(s => s.hasData);
                                if (activeSeries.length === 0) return null;
                                return (
                                  <div key={prov} className="fin-report-legend-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '120px' }}>
                                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase', borderBottom: '1px solid #e5e7eb', paddingBottom: '4px', marginBottom: '2px' }}>
                                      {prov}
                                    </div>
                                    {activeSeries.map((s) => {
                                      const totalVal = fullMonthData.reduce((sum, row) => sum + (row[s.name] || 0), 0);
                                      return (
                                        <div key={s.name} className="fin-report-legend-item" style={{ margin: 0, flexDirection: 'column', alignItems: 'flex-start' }}>
                                          <div style={{ display: 'flex', alignItems: 'center' }}>
                                            <span className="fin-report-legend-dot" style={{ background: COMMUNITY_COLORS[s.index % COMMUNITY_COLORS.length] }} />
                                            <span className="fin-report-legend-label">{s.name}</span>
                                            <span style={{ fontSize: '10px', color: '#4B5563', marginLeft: '6px' }}>({fmt(totalVal)})</span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                );
                              })}
                              {allSeries.some(s => !seriesWithData.includes(s)) && (
                                <div style={{ width: '100%', fontSize: '11px', color: '#9CA3AF', marginTop: '8px', fontStyle: 'italic' }}>
                                  No donations: {allSeries.filter(s => !seriesWithData.includes(s)).join(', ')}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                        <ChartFooter period={report.period} location={getLocationLabel()} />
                      </div>
                    );
                  })()}
                </div>
                );
              })()}

              {/* Top Communities & Top 8 Donators Side-by-Side */}
              <div className="fin-report-charts-row">
                {/* Top Donor Communities Bar Chart */}
                {report.donations.byBranch?.length > 0 && (
                  <div className="fin-report-chart-card">
                    <h3 className="fin-report-chart-title">Top Donor Communities</h3>
                    <p className="fin-chart-summary">Top: <strong>{report.donations.byBranch[0]?.branch}</strong> · {fmt(report.donations.byBranch[0]?.value)} ({report.donations.total > 0 ? ((report.donations.byBranch[0]?.value / report.donations.total) * 100).toFixed(1) : 0}%)</p>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={report.donations.byBranch.slice(0, 8)} margin={{ top: 15, right: 10, left: -10, bottom: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="branch" tick={{ fontSize: 9, angle: -35, textAnchor: 'end' }} interval={0} height={60} />
                        <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `₱${(v/1000).toFixed(0)}k`} allowDecimals={false}>
                          <Label value="Amount (₱)" angle={-90} position="insideLeft" offset={20} style={{ fontSize: 9, fill: '#9CA3AF' }} />
                        </YAxis>
                        <Tooltip formatter={(v, name) => [fmt(v), name === 'value' ? 'Amount' : name]} />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={28}>
                          {report.donations.byBranch.slice(0, 8).map((_, i) => (
                            <Cell key={i} fill={i === 0 ? '#3b82f6' : '#0D1F45'} />
                          ))}
                          <LabelList dataKey="value" position="top" formatter={v => fmtShort(v)} style={{ fontSize: 10, fill: '#6B7280' }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <ChartFooter period={report.period} location={getLocationLabel()} />
                  </div>
                )}

                {/* Top 8 Donators */}
                {report.donations?.byDonor?.length > 0 && (() => {
                  const topDonors = report.donations.byDonor.slice(0, 8);
                  return (
                  <div className="fin-report-chart-card">
                    <h3 className="fin-report-chart-title">Top {topDonors.length} Donators</h3>
                    <p className="fin-chart-summary">#1: <strong>{topDonors[0]?.donor}</strong> · {fmt(topDonors[0]?.value)} ({report.donations.total > 0 ? ((topDonors[0]?.value / report.donations.total) * 100).toFixed(0) : 0}%)</p>
                    <ResponsiveContainer width="100%" height={Math.max(220, topDonors.length * 32)}>
                      <BarChart data={topDonors} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `₱${(v/1000).toFixed(0)}k`}>
                          <Label value="Amount (₱)" position="bottom" offset={-5} style={{ fontSize: 9, fill: '#9CA3AF' }} />
                        </XAxis>
                        <YAxis type="category" dataKey="donor" tick={{ fontSize: 10 }} width={120} />
                        <Tooltip formatter={(v, name) => [fmt(v), name === 'value' ? 'Amount' : name]} />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={18}>
                          {topDonors.map((_, i) => (
                            <Cell key={i} fill={i === 0 ? '#2563eb' : '#0D1F45'} />
                          ))}
                          <LabelList dataKey="value" position="right" formatter={v => fmtShort(v)} style={{ fontSize: 10, fill: '#6B7280' }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="fin-report-legend">
                      {topDonors.slice(0, 5).map((d, i) => (
                        <div key={i} className="fin-report-legend-item">
                          <span className="fin-report-legend-dot" style={{ background: i === 0 ? '#2563eb' : '#0D1F45' }} />
                          <span className="fin-report-legend-label">{d.donor}</span>
                          <span className="fin-report-legend-val">{fmt(d.value)} · {report.donations.total > 0 ? ((d.value / report.donations.total) * 100).toFixed(0) : 0}%</span>
                        </div>
                      ))}
                    </div>
                    <ChartFooter period={report.period} location={getLocationLabel()} />
                  </div>
                  );
                })()}
              </div>

              {/* Full Width Community Table */}
              {report.donations.byBranch?.length > 0 && (
                <div className="fin-report-charts-row" style={{ gridTemplateColumns: '1fr', marginTop: '16px' }}>
                  <div className="fin-report-table-wrap fin-report-chart-card" style={{ marginTop: 0 }}>
                    <h3 className="fin-report-chart-title">Donations Breakdown By Community</h3>
                    <div className="fin-report-table-scroll" style={{ maxHeight: '400px' }}>
                      <table className="fin-report-table">
                        <thead>
                          <tr>
                            <th>Community</th>
                            <th>Amount</th>
                            <th>% of Total</th>
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
                  </div>
                </div>
              )}

              {/* Attendance Trends */}
              {report.attendance?.byMonth?.length > 0 && (() => {
                const { from, to } = getChartMonthRange();
                const attMap = {};
                report.attendance.byMonth.forEach(d => { attMap[d.month] = d.count; });
                const bmc = report.attendance.byMonthByCommunity || {};
                const allCommunities = [...new Set(Object.values(bmc).flatMap(obj => Object.keys(obj)))].sort();
                const isMulti = allCommunities.length >= 2;

                // Filter communities with actual data
                const commsWithData = allCommunities.filter(c => Object.values(bmc).some(monthObj => (monthObj[c] || 0) > 0));

                const trendData = MONTH_SHORT.slice(from, to + 1).map((label, idx) => {
                  const i = from + idx;
                  const key = `${reportYear}-${String(i + 1).padStart(2, '0')}`;
                  const row = { month: key, label, count: attMap[key] || 0 };
                  if (isMulti && bmc[key]) {
                    commsWithData.forEach(c => { row[c] = bmc[key][c] || 0; });
                  }
                  return row;
                });
                const totalAtt = trendData.reduce((s, d) => s + d.count, 0);
                return (
                  <div className="fin-report-charts-row" style={{ gridTemplateColumns: '1fr', marginTop: '16px' }}>
                    <div className="fin-report-chart-card">
                      <h3 className="fin-report-chart-title">Monthly Attendance Trend {isMulti ? '(By Community)' : ''}</h3>
                      <p className="fin-chart-summary">Total: <strong>{totalAtt} attendees</strong> · Peak: <strong>{trendData.reduce((a, b) => b.count > a.count ? b : a, trendData[0])?.label}</strong></p>
                      <ResponsiveContainer width="100%" height={isMulti ? 280 : 220}>
                        {isMulti ? (
                          <LineChart data={trendData} margin={{ top: 15, right: 10, left: -10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} allowDecimals={false}>
                              <Label value="Attendance Count" angle={-90} position="insideLeft" offset={20} style={{ fontSize: 9, fill: '#9CA3AF' }} />
                            </YAxis>
                            <Tooltip formatter={(v, name) => [v + ' attendees', name === 'count' ? 'Count' : name]} />
                            {commsWithData.map((c) => {
                              const origIdx = allCommunities.indexOf(c);
                              return <Line key={c} type="monotone" dataKey={c} stroke={COMMUNITY_COLORS[origIdx % COMMUNITY_COLORS.length]} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />;
                            })}
                          </LineChart>
                        ) : (
                          <BarChart data={trendData} margin={{ top: 15, right: 10, left: -10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} allowDecimals={false}>
                              <Label value="Attendance Count" angle={-90} position="insideLeft" offset={20} style={{ fontSize: 9, fill: '#9CA3AF' }} />
                            </YAxis>
                            <Tooltip formatter={(v) => [v + ' attendees']} labelFormatter={(v, payload) => payload?.[0]?.payload?.label || v} />
                            <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={24}>
                              <LabelList dataKey="count" position="top" formatter={v => v > 0 ? v : ''} style={{ fontSize: 10, fill: '#6B7280' }} />
                            </Bar>
                          </BarChart>
                        )}
                      </ResponsiveContainer>
                      {isMulti && (() => {
                        const branchToProv = {};
                        branchesData.forEach(b => {
                          branchToProv[b.name] = b.province || (b.address ? b.address.split(',')[0].trim() : 'Unknown');
                        });
                        const commsByProv = {};
                        allCommunities.forEach((c, i) => {
                          const prov = branchToProv[c] || 'Unknown';
                          if (!commsByProv[prov]) commsByProv[prov] = [];
                          const hasData = commsWithData.includes(c);
                          commsByProv[prov].push({ name: c, index: i, hasData });
                        });
                        
                        return (
                          <div className="fin-report-grouped-legend" style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', marginTop: '16px' }}>
                            {Object.entries(commsByProv).map(([prov, comms]) => (
                              <div key={prov} className="fin-report-legend-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '120px' }}>
                                <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase', borderBottom: '1px solid #e5e7eb', paddingBottom: '4px', marginBottom: '2px' }}>
                                  {prov}
                                </div>
                                {comms.map((c) => {
                                  const totalVal = trendData.reduce((sum, row) => sum + (row[c.name] || 0), 0);
                                  return (
                                    <div key={c.name} className="fin-report-legend-item" style={{ margin: 0, flexDirection: 'column', alignItems: 'flex-start', opacity: c.hasData ? 1 : 0.5 }}>
                                      <div style={{ display: 'flex', alignItems: 'center' }}>
                                        <span className="fin-report-legend-dot" style={{ background: c.hasData ? COMMUNITY_COLORS[c.index % COMMUNITY_COLORS.length] : '#d1d5db' }} />
                                        <span className="fin-report-legend-label">{c.name}</span>
                                        {c.hasData && <span style={{ fontSize: '10px', color: '#4B5563', marginLeft: '6px' }}>({totalVal} attendees)</span>}
                                        {!c.hasData && <span style={{ fontSize: '9px', color: '#9CA3AF', marginLeft: '4px', fontStyle: 'italic' }}>No data</span>}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                      {!isMulti && (
                        <div className="fin-report-legend">
                          <div className="fin-report-legend-item">
                            <span className="fin-report-legend-dot" style={{ background: '#2563eb' }} />
                            <span className="fin-report-legend-label">Attendance</span>
                            <span className="fin-report-legend-val">{totalAtt} total</span>
                          </div>
                        </div>
                      )}
                      <ChartFooter period={report.period} location={getLocationLabel()} />
                    </div>
                  </div>
                );
              })()}
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
              <div className="fin-report-charts-row" style={{ gridTemplateColumns: '3fr 7fr' }}>
                {/* Loan Status Donut */}
                {report.loans.byStatus?.length > 0 && (
                  <div className="fin-report-chart-card">
                    <h3 className="fin-report-chart-title">Loan Status Distribution</h3>
                    <p className="fin-chart-summary">Total: <strong>{report.loans.totalApplications} applications</strong> · {report.loans.byStatus.length} statuses</p>
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
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="fin-report-legend">
                      {report.loans.byStatus.map((s, i) => {
                        const total = report.loans.totalApplications || 1;
                        const pct = ((s.count / total) * 100).toFixed(0);
                        return (
                          <div key={i} className="fin-report-legend-item">
                            <span className="fin-report-legend-dot" style={{ background: getStatusColor(s.status) }} />
                            <span className="fin-report-legend-label">{s.status}</span>
                            <span className="fin-report-legend-val">{s.count} loans · {pct}%</span>
                          </div>
                        );
                      })}
                    </div>
                    <ChartFooter period={report.period} location={getLocationLabel()} />
                  </div>
                )}

                {/* Monthly Disbursement vs Collection (Row 1) */}
                {(() => {
                  const { from, to } = getChartMonthRange();
                  const byMonthMap = {};
                  (report.loans.byMonth || []).forEach(d => { byMonthMap[d.month] = d; });
                  
                  const provDisbMap = report.loans.byMonthByProvince?.disbursed || {};
                  const provCollMap = report.loans.byMonthByProvince?.collected || {};
                  const availableProvinces = [...new Set([...Object.values(provDisbMap), ...Object.values(provCollMap)].flatMap(obj => Object.keys(obj)))].sort();
                  const showProvinceTrend = availableProvinces.length >= 2;
                  const disbMap = showProvinceTrend ? provDisbMap : (report.loans.byMonthByCommunity?.disbursed || {});
                  const collMap = showProvinceTrend ? provCollMap : (report.loans.byMonthByCommunity?.collected || {});
                  
                  let allSeries = [...new Set([...Object.values(disbMap), ...Object.values(collMap)].flatMap(obj => Object.keys(obj)))].sort();
                  const isMulti = allSeries.length >= 2;

                  // Filter communities/provinces with actual data
                  const seriesWithData = allSeries.filter(s => {
                    return Object.values(disbMap).some(monthObj => (monthObj[s] || 0) > 0) || Object.values(collMap).some(monthObj => (monthObj[s] || 0) > 0);
                  });

                  const chartTitle = `Monthly Disbursement vs Collection ${allSeries.length >= 2 ? (showProvinceTrend ? '(By Province)' : '(By Community)') : ''}`;

                  const trendData = MONTH_SHORT.slice(from, to + 1).map((label, idx) => {
                    const i = from + idx;
                    const key = `${reportYear}-${String(i + 1).padStart(2, '0')}`;
                    const existing = byMonthMap[key];
                    const row = { month: key, label, disbursed: existing?.disbursed || 0, received: existing?.received || 0 };
                    if (isMulti) {
                      allSeries.forEach(s => {
                        row[`disb_${s}`] = disbMap[key]?.[s] || 0;
                        row[`coll_${s}`] = collMap[key]?.[s] || 0;
                      });
                    }
                    return row;
                  });

                  return trendData.length > 0 ? (
                    <div className="fin-report-chart-card" style={{ width: '100%' }}>
                      <h3 className="fin-report-chart-title">{chartTitle}</h3>
                      <p className="fin-chart-summary">Disbursed: <strong>{fmt(trendData.reduce((s, d) => s + d.disbursed, 0))}</strong> · Collected: <strong>{fmt(trendData.reduce((s, d) => s + d.received, 0))}</strong></p>
                      <ResponsiveContainer width="100%" height={isMulti ? 300 : 250}>
                        {isMulti ? (
                          <BarChart data={trendData} margin={{ top: 15, right: 10, left: -10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `₱${(v/1000).toFixed(0)}k`} allowDecimals={false}>
                              <Label value="Amount (₱)" angle={-90} position="insideLeft" offset={20} style={{ fontSize: 9, fill: '#9CA3AF' }} />
                            </YAxis>
                            <Tooltip formatter={(v, name) => [fmt(v), name === 'value' ? 'Amount' : name]} />
                            {seriesWithData.map((s) => {
                              const origIdx = allSeries.indexOf(s);
                              return <Bar key={`disb_${s}`} dataKey={`disb_${s}`} name={`${s} (Disbursed)`} fill={COMMUNITY_COLORS[origIdx % COMMUNITY_COLORS.length]} />;
                            })}
                            {seriesWithData.map((s) => {
                              const origIdx = allSeries.indexOf(s);
                              return <Bar key={`coll_${s}`} dataKey={`coll_${s}`} name={`${s} (Collected)`} fill={COMMUNITY_COLORS[origIdx % COMMUNITY_COLORS.length]} fillOpacity={0.6} />;
                            })}
                          </BarChart>
                        ) : (
                          <BarChart data={trendData} margin={{ top: 15, right: 10, left: -10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `₱${(v/1000).toFixed(0)}k`} allowDecimals={false}>
                              <Label value="Amount (₱)" angle={-90} position="insideLeft" offset={20} style={{ fontSize: 9, fill: '#9CA3AF' }} />
                            </YAxis>
                            <Tooltip formatter={v => fmt(v)} labelFormatter={(v, payload) => payload?.[0]?.payload?.label || v} />
                            <Bar name="Disbursed" dataKey="disbursed" fill="#0D1F45" radius={[4, 4, 0, 0]} barSize={20}>
                              <LabelList dataKey="disbursed" position="top" formatter={v => v > 0 ? fmtShort(v) : ''} style={{ fontSize: 9, fill: '#6B7280' }} />
                            </Bar>
                            <Bar name="Collected" dataKey="received" fill="#10B981" radius={[4, 4, 0, 0]} barSize={20}>
                              <LabelList dataKey="received" position="top" formatter={v => v > 0 ? fmtShort(v) : ''} style={{ fontSize: 9, fill: '#6B7280' }} />
                            </Bar>
                          </BarChart>
                        )}
                      </ResponsiveContainer>
                      {isMulti && (() => {
                        const branchToProv = {};
                        branchesData.forEach(b => {
                          branchToProv[b.name] = b.province || (b.address ? b.address.split(',')[0].trim() : 'Unknown');
                        });
                        const seriesByProv = {};
                        allSeries.forEach((s, i) => {
                          const prov = showProvinceTrend ? s : (branchToProv[s] || 'Unknown');
                          if (!seriesByProv[prov]) seriesByProv[prov] = [];
                          const hasData = seriesWithData.includes(s);
                          seriesByProv[prov].push({ name: s, index: i, hasData });
                        });
                        
                        return (
                          <div className="fin-report-grouped-legend" style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', marginTop: '16px' }}>
                            {Object.entries(seriesByProv).map(([prov, seriesList]) => {
                              const activeSeries = seriesList.filter(s => s.hasData);
                              if (activeSeries.length === 0) return null;
                              return (
                                <div key={prov} className="fin-report-legend-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '120px' }}>
                                  {!showProvinceTrend && (
                                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase', borderBottom: '1px solid #e5e7eb', paddingBottom: '4px', marginBottom: '2px' }}>
                                      {prov}
                                    </div>
                                  )}
                                  {activeSeries.map((s) => {
                                    const totalDisb = trendData.reduce((sum, row) => sum + (row['disb_' + s.name] || 0), 0);
                                    const totalColl = trendData.reduce((sum, row) => sum + (row['coll_' + s.name] || 0), 0);
                                    return (
                                      <div key={s.name} className="fin-report-legend-item" style={{ margin: 0, flexDirection: 'column', alignItems: 'flex-start' }}>
                                        <div style={{ display: 'flex', alignItems: 'center' }}>
                                          <span className="fin-report-legend-dot" style={{ background: COMMUNITY_COLORS[s.index % COMMUNITY_COLORS.length] }} />
                                          <span className="fin-report-legend-label">{s.name}</span>
                                          <span style={{ fontSize: '9px', color: '#4b5563', marginLeft: '6px' }}>(Disb: {fmt(totalDisb)} · Coll: {fmt(totalColl)})</span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })}
                            {allSeries.some(s => !seriesWithData.includes(s)) && (
                              <div style={{ width: '100%', fontSize: '11px', color: '#9CA3AF', marginTop: '8px', fontStyle: 'italic' }}>
                                No loans: {allSeries.filter(s => !seriesWithData.includes(s)).join(', ')}
                              </div>
                            )}
                            <div style={{ width: '100%', fontSize: '11px', color: '#6b7280', marginTop: '8px' }}>
                              <em>Note: For each month, the left bar is Disbursed (solid) and the right bar is Collected (lighter color).</em>
                            </div>
                          </div>
                        );
                      })()}
                      <ChartFooter period={report.period} location={getLocationLabel()} />
                    </div>
                  ) : null;
                })()}
              </div>

              {/* Monthly Disbursement vs Collection (Row 2 - By Community) */}
              {(() => {
                const provDisbMap2 = report.loans.byMonthByProvince?.disbursed || {};
                const provCollMap2 = report.loans.byMonthByProvince?.collected || {};
                const availProv2 = [...new Set([...Object.values(provDisbMap2), ...Object.values(provCollMap2)].flatMap(obj => Object.keys(obj)))].sort();
                const shouldShowRow2 = availProv2.length >= 2;
                if (!shouldShowRow2) return null;
                return (
                <div className="fin-report-charts-row" style={{ gridTemplateColumns: '1fr' }}>
                  {(() => {
                    const { from, to } = getChartMonthRange();
                    const byMonthMap = {};
                    (report.loans.byMonth || []).forEach(d => { byMonthMap[d.month] = d; });
                    
                    const disbMap = report.loans.byMonthByCommunity?.disbursed || {};
                    const collMap = report.loans.byMonthByCommunity?.collected || {};
                    
                    let allSeries = [...new Set([...Object.values(disbMap), ...Object.values(collMap)].flatMap(obj => Object.keys(obj)))].sort();
                    const chartTitle = `Monthly Disbursement vs Collection (By Community)`;
                    const isMulti = allSeries.length >= 2;

                    // Filter communities with actual data
                    const seriesWithData = allSeries.filter(s => {
                      return Object.values(disbMap).some(monthObj => (monthObj[s] || 0) > 0) || Object.values(collMap).some(monthObj => (monthObj[s] || 0) > 0);
                    });

                    const trendData = MONTH_SHORT.slice(from, to + 1).map((label, idx) => {
                      const i = from + idx;
                      const key = `${reportYear}-${String(i + 1).padStart(2, '0')}`;
                      const existing = byMonthMap[key];
                      const row = { month: key, label, disbursed: existing?.disbursed || 0, received: existing?.received || 0 };
                      if (isMulti) {
                        seriesWithData.forEach(s => {
                          row[`disb_${s}`] = disbMap[key]?.[s] || 0;
                          row[`coll_${s}`] = collMap[key]?.[s] || 0;
                        });
                      }
                      return row;
                    });

                    return trendData.length > 0 ? (
                      <div className="fin-report-chart-card" style={{ width: '100%' }}>
                        <h3 className="fin-report-chart-title">{chartTitle}</h3>
                        <p className="fin-chart-summary">Detailed Community Breakdown · Disbursed: <strong>{fmt(trendData.reduce((s, d) => s + d.disbursed, 0))}</strong> · Collected: <strong>{fmt(trendData.reduce((s, d) => s + d.received, 0))}</strong></p>
                        <ResponsiveContainer width="100%" height={isMulti ? 300 : 250}>
                          {isMulti ? (
                            <BarChart data={trendData} margin={{ top: 15, right: 10, left: -10, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `₱${(v/1000).toFixed(0)}k`} allowDecimals={false}>
                                <Label value="Amount (₱)" angle={-90} position="insideLeft" offset={20} style={{ fontSize: 9, fill: '#9CA3AF' }} />
                              </YAxis>
                              <Tooltip formatter={(v, name) => [fmt(v), name === 'value' ? 'Amount' : name]} />
                              {seriesWithData.map((s) => {
                                const origIdx = allSeries.indexOf(s);
                                return <Bar key={`disb_${s}`} dataKey={`disb_${s}`} name={`${s} (Disbursed)`} fill={COMMUNITY_COLORS[origIdx % COMMUNITY_COLORS.length]} />;
                              })}
                              {seriesWithData.map((s) => {
                                const origIdx = allSeries.indexOf(s);
                                return <Bar key={`coll_${s}`} dataKey={`coll_${s}`} name={`${s} (Collected)`} fill={COMMUNITY_COLORS[origIdx % COMMUNITY_COLORS.length]} fillOpacity={0.6} />;
                              })}
                            </BarChart>
                          ) : (
                            <BarChart data={trendData} margin={{ top: 15, right: 10, left: -10, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `₱${(v/1000).toFixed(0)}k`} allowDecimals={false}>
                                <Label value="Amount (₱)" angle={-90} position="insideLeft" offset={20} style={{ fontSize: 9, fill: '#9CA3AF' }} />
                              </YAxis>
                              <Tooltip formatter={v => fmt(v)} labelFormatter={(v, payload) => payload?.[0]?.payload?.label || v} />
                              <Bar name="Disbursed" dataKey="disbursed" fill="#0D1F45" radius={[4, 4, 0, 0]} barSize={20}>
                                <LabelList dataKey="disbursed" position="top" formatter={v => v > 0 ? fmtShort(v) : ''} style={{ fontSize: 9, fill: '#6B7280' }} />
                              </Bar>
                              <Bar name="Collected" dataKey="received" fill="#10B981" radius={[4, 4, 0, 0]} barSize={20}>
                                <LabelList dataKey="received" position="top" formatter={v => v > 0 ? fmtShort(v) : ''} style={{ fontSize: 9, fill: '#6B7280' }} />
                              </Bar>
                            </BarChart>
                          )}
                        </ResponsiveContainer>
                        {isMulti && (() => {
                          const branchToProv = {};
                          branchesData.forEach(b => {
                            branchToProv[b.name] = b.province || (b.address ? b.address.split(',')[0].trim() : 'Unknown');
                          });
                          const seriesByProv = {};
                          allSeries.forEach((s, i) => {
                            const prov = branchToProv[s] || 'Unknown';
                            if (!seriesByProv[prov]) seriesByProv[prov] = [];
                            const hasData = seriesWithData.includes(s);
                            seriesByProv[prov].push({ name: s, index: i, hasData });
                          });
                          
                          return (
                            <div className="fin-report-grouped-legend" style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', marginTop: '16px' }}>
                              {Object.entries(seriesByProv).map(([prov, seriesList]) => {
                                const activeSeries = seriesList.filter(s => s.hasData);
                                if (activeSeries.length === 0) return null;
                                return (
                                  <div key={prov} className="fin-report-legend-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '120px' }}>
                                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase', borderBottom: '1px solid #e5e7eb', paddingBottom: '4px', marginBottom: '2px' }}>
                                      {prov}
                                    </div>
                                    {activeSeries.map((s) => {
                                      const totalDisb = trendData.reduce((sum, row) => sum + (row['disb_' + s.name] || 0), 0);
                                      const totalColl = trendData.reduce((sum, row) => sum + (row['coll_' + s.name] || 0), 0);
                                      return (
                                        <div key={s.name} className="fin-report-legend-item" style={{ margin: 0, flexDirection: 'column', alignItems: 'flex-start' }}>
                                          <div style={{ display: 'flex', alignItems: 'center' }}>
                                            <span className="fin-report-legend-dot" style={{ background: COMMUNITY_COLORS[s.index % COMMUNITY_COLORS.length] }} />
                                            <span className="fin-report-legend-label">{s.name}</span>
                                            <span style={{ fontSize: '9px', color: '#4b5563', marginLeft: '6px' }}>(Disb: {fmt(totalDisb)} · Coll: {fmt(totalColl)})</span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                );
                              })}
                              {allSeries.some(s => !seriesWithData.includes(s)) && (
                                <div style={{ width: '100%', fontSize: '11px', color: '#9CA3AF', marginTop: '8px', fontStyle: 'italic' }}>
                                  No loans: {allSeries.filter(s => !seriesWithData.includes(s)).join(', ')}
                                </div>
                              )}
                              <div style={{ width: '100%', fontSize: '11px', color: '#6b7280', marginTop: '8px' }}>
                                <em>Note: For each month, the left bar is Disbursed (solid) and the right bar is Collected (lighter color).</em>
                              </div>
                            </div>
                          );
                        })()}
                        <ChartFooter period={report.period} location={getLocationLabel()} />
                      </div>
                    ) : null;
                  })()}
                </div>
              );
              })()}

              {/* Application Trend + Repayment Performance Row */}
              <div className="fin-report-charts-row" style={{ gridTemplateColumns: '1fr' }}>
                {/* === Loan Application Trend (Row 1) === */}
                {(() => {
                  const { from, to } = getChartMonthRange();
                  const appsMap = {};
                  (report.loans.applicationsByMonth || []).forEach(d => { appsMap[d.month] = d.count; });
                  
                  const provAppMap = report.loans.applicationsByMonthByProvince || {};
                  const availableProvApps = [...new Set(Object.values(provAppMap).flatMap(obj => Object.keys(obj)))].sort();
                  const showProvinceTrend = availableProvApps.length >= 2;
                  const dataMap = showProvinceTrend ? provAppMap : (report.loans.applicationsByMonthByCommunity || {});
                  let allSeries = [...new Set(Object.values(dataMap).flatMap(obj => Object.keys(obj)))].sort();
                  const chartTitle = `Loan Application Trend ${allSeries.length >= 2 ? (showProvinceTrend ? '(By Province)' : '(By Community)') : ''}`;
                  const isMulti = allSeries.length >= 2;

                  const trendData = MONTH_SHORT.slice(from, to + 1).map((label, idx) => {
                    const i = from + idx;
                    const key = `${reportYear}-${String(i + 1).padStart(2, '0')}`;
                    const row = { month: key, label, applications: appsMap[key] || 0 };
                    if (isMulti && dataMap[key]) {
                      allSeries.forEach(s => { row[s] = dataMap[key][s] || 0; });
                    }
                    return row;
                  });
                  const totalApps = trendData.reduce((s, d) => s + d.applications, 0);
                  const peakIdx = trendData.reduce((maxI, d, i, arr) => d.applications > arr[maxI].applications ? i : maxI, 0);
                  return trendData.length > 0 ? (
                    <div className="fin-report-chart-card" style={{ width: '100%' }}>
                      <h3 className="fin-report-chart-title">{chartTitle}</h3>
                      <p className="fin-chart-summary">Total: <strong>{totalApps} applications</strong> · Peak: <strong>{trendData[peakIdx]?.label}</strong> ({trendData[peakIdx]?.applications})</p>
                      <ResponsiveContainer width="100%" height={isMulti ? 300 : 250}>
                        {isMulti ? (
                          <BarChart data={trendData} margin={{ top: 15, right: 10, left: -10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} allowDecimals={false}>
                              <Label value="No. of Applications" angle={-90} position="insideLeft" offset={20} style={{ fontSize: 9, fill: '#9CA3AF' }} />
                            </YAxis>
                            <Tooltip formatter={(v, name) => [v + ' applications', name === 'applications' ? 'Count' : name]} />
                            {allSeries.map((s, i) => (
                              <Bar key={s} dataKey={s} name={s} fill={COMMUNITY_COLORS[i % COMMUNITY_COLORS.length]} />
                            ))}
                          </BarChart>
                        ) : (
                          <BarChart data={trendData} margin={{ top: 15, right: 10, left: -10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} allowDecimals={false}>
                              <Label value="No. of Applications" angle={-90} position="insideLeft" offset={20} style={{ fontSize: 9, fill: '#9CA3AF' }} />
                            </YAxis>
                            <Tooltip formatter={(v) => [v + ' applications']} labelFormatter={(v, payload) => payload?.[0]?.payload?.label || v} />
                            <Bar name="Applications" dataKey="applications" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={20}>
                              <LabelList dataKey="applications" position="top" style={{ fontSize: 9, fill: '#6B7280' }} />
                            </Bar>
                          </BarChart>
                        )}
                      </ResponsiveContainer>
                      {isMulti && (() => {
                        const branchToProv = {};
                        branchesData.forEach(b => {
                          branchToProv[b.name] = b.province || (b.address ? b.address.split(',')[0].trim() : 'Unknown');
                        });
                        const seriesByProv = {};
                        allSeries.forEach((s, i) => {
                          const prov = showProvinceTrend ? s : (branchToProv[s] || 'Unknown');
                          if (!seriesByProv[prov]) seriesByProv[prov] = [];
                          seriesByProv[prov].push({ name: s, index: i });
                        });
                        
                        return (
                          <div className="fin-report-grouped-legend" style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', marginTop: '16px' }}>
                            {Object.entries(seriesByProv).map(([prov, seriesList]) => (
                              <div key={prov} className="fin-report-legend-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '120px' }}>
                                {!showProvinceTrend && (
                                  <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase', borderBottom: '1px solid #e5e7eb', paddingBottom: '4px', marginBottom: '2px' }}>
                                    {prov}
                                  </div>
                                )}
                                {seriesList.map((s) => (
                                  <div key={s.name} className="fin-report-legend-item" style={{ margin: 0, flexDirection: 'column', alignItems: 'flex-start' }}>
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                      <span className="fin-report-legend-dot" style={{ background: COMMUNITY_COLORS[s.index % COMMUNITY_COLORS.length] }} />
                                      <span className="fin-report-legend-label">{s.name}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                      <ChartFooter period={report.period} location={getLocationLabel()} />
                    </div>
                  ) : null;
                })()}
              </div>

              {(() => {
                const provAppMap2 = report.loans.applicationsByMonthByProvince || {};
                const availProvApps2 = [...new Set(Object.values(provAppMap2).flatMap(obj => Object.keys(obj)))].sort();
                const shouldShowRow2 = availProvApps2.length >= 2;
                if (!shouldShowRow2) return null;
                return (
                <div className="fin-report-charts-row" style={{ gridTemplateColumns: '1fr' }}>
                  {(() => {
                    const { from, to } = getChartMonthRange();
                    const appsMap = {};
                    (report.loans.applicationsByMonth || []).forEach(d => { appsMap[d.month] = d.count; });
                    
                    const dataMap = report.loans.applicationsByMonthByCommunity || {};
                    let allSeries = [...new Set(Object.values(dataMap).flatMap(obj => Object.keys(obj)))].sort();
                    const chartTitle = `Loan Application Trend (By Community)`;
                    const isMulti = allSeries.length >= 2;

                    // Filter communities with actual data
                    const seriesWithData = allSeries.filter(s => Object.values(dataMap).some(monthObj => (monthObj[s] || 0) > 0));

                    const trendData = MONTH_SHORT.slice(from, to + 1).map((label, idx) => {
                      const i = from + idx;
                      const key = `${reportYear}-${String(i + 1).padStart(2, '0')}`;
                      const row = { month: key, label, applications: appsMap[key] || 0 };
                      if (isMulti && dataMap[key]) {
                        seriesWithData.forEach(s => { row[s] = dataMap[key][s] || 0; });
                      }
                      return row;
                    });
                    const totalApps = trendData.reduce((s, d) => s + d.applications, 0);
                    const peakIdx = trendData.reduce((maxI, d, i, arr) => d.applications > arr[maxI].applications ? i : maxI, 0);

                    return trendData.length > 0 ? (
                      <div className="fin-report-chart-card" style={{ width: '100%' }}>
                        <h3 className="fin-report-chart-title">{chartTitle}</h3>
                        <p className="fin-chart-summary">Detailed Community Breakdown · Total: <strong>{totalApps} applications</strong> · Peak: <strong>{trendData[peakIdx]?.label}</strong> ({trendData[peakIdx]?.applications})</p>
                        <ResponsiveContainer width="100%" height={isMulti ? 300 : 250}>
                          {isMulti ? (
                            <BarChart data={trendData} margin={{ top: 15, right: 10, left: -10, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                              <YAxis tick={{ fontSize: 10 }} allowDecimals={false}>
                                <Label value="No. of Applications" angle={-90} position="insideLeft" offset={20} style={{ fontSize: 9, fill: '#9CA3AF' }} />
                              </YAxis>
                              <Tooltip formatter={(v, name) => [v + ' applications', name === 'applications' ? 'Count' : name]} />
                              {seriesWithData.map((s) => {
                                const origIdx = allSeries.indexOf(s);
                                return <Bar key={s} dataKey={s} name={s} fill={COMMUNITY_COLORS[origIdx % COMMUNITY_COLORS.length]} />;
                              })}
                            </BarChart>
                          ) : (
                            <BarChart data={trendData} margin={{ top: 15, right: 10, left: -10, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                              <YAxis tick={{ fontSize: 10 }} allowDecimals={false}>
                                <Label value="No. of Applications" angle={-90} position="insideLeft" offset={20} style={{ fontSize: 9, fill: '#9CA3AF' }} />
                              </YAxis>
                              <Tooltip formatter={(v) => [v + ' applications']} labelFormatter={(v, payload) => payload?.[0]?.payload?.label || v} />
                              <Bar name="Applications" dataKey="applications" fill="#2563eb" radius={[4, 4, 0, 0]} barSize={20}>
                                <LabelList dataKey="applications" position="top" style={{ fontSize: 9, fill: '#6B7280' }} />
                              </Bar>
                            </BarChart>
                          )}
                        </ResponsiveContainer>
                        {isMulti && (() => {
                          const branchToProv = {};
                          branchesData.forEach(b => {
                            branchToProv[b.name] = b.province || (b.address ? b.address.split(',')[0].trim() : 'Unknown');
                          });
                          const seriesByProv = {};
                          allSeries.forEach((s, i) => {
                            const prov = branchToProv[s] || 'Unknown';
                            if (!seriesByProv[prov]) seriesByProv[prov] = [];
                            const hasData = seriesWithData.includes(s);
                            seriesByProv[prov].push({ name: s, index: i, hasData });
                          });
                          
                          return (
                            <div className="fin-report-grouped-legend" style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', marginTop: '16px' }}>
                              {Object.entries(seriesByProv).map(([prov, seriesList]) => {
                                const activeSeries = seriesList.filter(s => s.hasData);
                                if (activeSeries.length === 0) return null;
                                return (
                                  <div key={prov} className="fin-report-legend-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '120px' }}>
                                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase', borderBottom: '1px solid #e5e7eb', paddingBottom: '4px', marginBottom: '2px' }}>
                                      {prov}
                                    </div>
                                    {activeSeries.map((s) => {
                                      const totalVal = trendData.reduce((sum, row) => sum + (row[s.name] || 0), 0);
                                      return (
                                        <div key={s.name} className="fin-report-legend-item" style={{ margin: 0, flexDirection: 'column', alignItems: 'flex-start' }}>
                                          <div style={{ display: 'flex', alignItems: 'center' }}>
                                            <span className="fin-report-legend-dot" style={{ background: COMMUNITY_COLORS[s.index % COMMUNITY_COLORS.length] }} />
                                            <span className="fin-report-legend-label">{s.name}</span>
                                            <span style={{ fontSize: '10px', color: '#4B5563', marginLeft: '6px' }}>({totalVal} apps)</span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                );
                              })}
                              {allSeries.some(s => !seriesWithData.includes(s)) && (
                                <div style={{ width: '100%', fontSize: '11px', color: '#9CA3AF', marginTop: '8px', fontStyle: 'italic' }}>
                                  No applications: {allSeries.filter(s => !seriesWithData.includes(s)).join(', ')}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                        <ChartFooter period={report.period} location={getLocationLabel()} />
                      </div>
                    ) : null;
                   })()}
                </div>
              );
              })()}

              {/* Approval Rate + Repayment Row */}
              <div className="fin-report-charts-row" style={{ gridTemplateColumns: '1fr' }}>
                {/* Approval Rate Per Month */}
                {(() => {
                  const { from, to } = getChartMonthRange();
                  const approvalMap = {};
                  (report.loans.approvalByMonth || []).forEach(d => { approvalMap[d.month] = d; });
                  const rateData = MONTH_SHORT.slice(from, to + 1).map((label, idx) => {
                    const i = from + idx;
                    const key = `${reportYear}-${String(i + 1).padStart(2, '0')}`;
                    const existing = approvalMap[key];
                    return { month: key, label, approvalRate: existing?.approvalRate || 0, rejectionRate: existing?.rejectionRate || 0, total: existing?.total || 0 };
                  });
                  const totalLoans = rateData.reduce((s, d) => s + d.total, 0);
                  const avgApproval = totalLoans > 0 ? Math.round(rateData.reduce((s, d) => s + d.approvalRate * d.total, 0) / totalLoans) : 0;
                  return (
                    <div className="fin-report-chart-card">
                      <h3 className="fin-report-chart-title">Approval Rate Per Month (%)</h3>
                      <p className="fin-chart-summary">Avg: <strong style={{color: '#10B981'}}>{avgApproval}%</strong> approval · <strong style={{color: '#EF4444'}}>{100 - avgApproval}%</strong> rejection</p>
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={rateData} margin={{ top: 15, right: 10, left: -10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                          <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${v}%`} domain={[0, 100]}>
                            <Label value="%" angle={-90} position="insideLeft" offset={20} style={{ fontSize: 9, fill: '#9CA3AF' }} />
                          </YAxis>
                          <Tooltip formatter={(v) => `${v}%`} labelFormatter={(v, payload) => payload?.[0]?.payload?.label || v} />
                          <Bar name="Approval %" dataKey="approvalRate" fill="#10B981" radius={[4, 4, 0, 0]} barSize={16} />
                          <Bar name="Rejection %" dataKey="rejectionRate" fill="#EF4444" radius={[4, 4, 0, 0]} barSize={16} />
                        </BarChart>
                      </ResponsiveContainer>
                      <div className="fin-report-legend" style={{ justifyContent: 'center', display: 'flex', gap: '16px' }}>
                        <div className="fin-report-legend-item" style={{ gap: '4px' }}>
                          <span className="fin-report-legend-dot" style={{ background: '#10B981' }} />
                          <span className="fin-report-legend-label">Approval %</span>
                          <span className="fin-report-legend-val">{avgApproval}% avg</span>
                        </div>
                        <div className="fin-report-legend-item" style={{ gap: '4px' }}>
                          <span className="fin-report-legend-dot" style={{ background: '#EF4444' }} />
                          <span className="fin-report-legend-label">Rejection %</span>
                          <span className="fin-report-legend-val">{100 - avgApproval}% avg</span>
                        </div>
                      </div>
                      <ChartFooter period={report.period} location={getLocationLabel()} />
                    </div>
                  );
                })()}
              </div>


            </div>
          )}

          {/* Savings Section - Only for Loan Admin */}
          {report.savings && adminRole === 'loanAdmin' && (
            <div className="fin-report-section">
              <div className="fin-report-section-header">
                <h2 className="fin-report-section-title">🏦 Savings Overview</h2>
              </div>

              <div className="fin-report-stat-grid savings-grid">
                <div className="fin-report-stat">
                  <span className="fin-report-stat-label">Total Saved</span>
                  <span className="fin-report-stat-value green fin-stat-shrink">{fmt(report.savings.totalSaved)}</span>
                </div>
                <div className="fin-report-stat">
                  <span className="fin-report-stat-label">Total Targets</span>
                  <span className="fin-report-stat-value fin-stat-shrink">{fmt(report.savings.totalTargets)}</span>
                </div>
                <div className="fin-report-stat">
                  <span className="fin-report-stat-label">Overall Progress</span>
                  <span className="fin-report-stat-value blue">
                    {report.savings.overallProgress > 0 && report.savings.overallProgress < 1
                      ? `<1%`
                      : `${report.savings.overallProgress}%`}
                  </span>
                </div>
                <div className="fin-report-stat">
                  <span className="fin-report-stat-label">Period Deposits</span>
                  <span className="fin-report-stat-value fin-stat-shrink">{fmt(report.savings.periodDeposits)}</span>
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
              <div className="fin-report-charts-row" style={{ gridTemplateColumns: '3fr 7fr' }}>
                {/* Savings Goals Donut */}
                {(report.savings.activeGoals > 0 || report.savings.completedGoals > 0) && (
                  <div className="fin-report-chart-card">
                    <h3 className="fin-report-chart-title">Savings Goals Status</h3>
                    <p className="fin-chart-summary">Total: <strong>{report.savings.activeGoals + report.savings.completedGoals} goals</strong> · Progress: <strong>{report.savings.overallProgress}%</strong></p>
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
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="fin-report-legend">
                      {[
                        { name: 'Active', value: report.savings.activeGoals, color: '#2563EB' },
                        { name: 'Completed', value: report.savings.completedGoals, color: '#10B981' },
                      ].map((item, i) => {
                        const total = report.savings.activeGoals + report.savings.completedGoals || 1;
                        const pct = ((item.value / total) * 100).toFixed(0);
                        return (
                          <div key={i} className="fin-report-legend-item">
                            <span className="fin-report-legend-dot" style={{ background: item.color }} />
                            <span className="fin-report-legend-label">{item.name}</span>
                            <span className="fin-report-legend-val">{item.value} goals · {pct}%</span>
                          </div>
                        );
                      })}
                    </div>
                    <ChartFooter period={report.period} location={getLocationLabel()} />
                  </div>
                )}

                {/* Savings Breakdown by Month */}
                {(() => {
                  const { from, to } = getChartMonthRange();
                  const byMonthMap = {};
                  (report.savings.byMonth || []).forEach(d => { byMonthMap[d.month] = d; });
                  
                  const savingsData = MONTH_SHORT.slice(from, to + 1).map((label, idx) => {
                    const i = from + idx;
                    const key = `${reportYear}-${String(i + 1).padStart(2, '0')}`;
                    const existing = byMonthMap[key];
                    return { month: key, label, deposits: existing?.deposits || 0, withdrawals: existing?.withdrawals || 0 };
                  });
                  
                  return (
                    <div className="fin-report-chart-card">
                      <h3 className="fin-report-chart-title">Savings Trend (Deposits vs Withdrawals)</h3>
                      <p className="fin-chart-summary">Total Saved: <strong>{fmt(report.savings.totalSaved)}</strong> · Deposits: <strong style={{color: '#10B981'}}>{fmt(report.savings.periodDeposits)}</strong> · Withdrawals: <strong style={{color: '#EF4444'}}>{fmt(report.savings.periodWithdrawals)}</strong></p>
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={savingsData} margin={{ top: 15, right: 10, left: -10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                          <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `₱${(v/1000).toFixed(0)}k`} allowDecimals={false}>
                            <Label value="Amount (₱)" angle={-90} position="insideLeft" offset={20} style={{ fontSize: 9, fill: '#9CA3AF' }} />
                          </YAxis>
                          <Tooltip formatter={v => fmt(v)} labelFormatter={(v, payload) => payload?.[0]?.payload?.label || v} />
                          <Bar name="Deposits" dataKey="deposits" fill="#10B981" radius={[4, 4, 0, 0]} barSize={16}>
                            <LabelList dataKey="deposits" position="top" formatter={v => v > 0 ? fmtShort(v) : ''} style={{ fontSize: 9, fill: '#6B7280' }} />
                          </Bar>
                          <Bar name="Withdrawals" dataKey="withdrawals" fill="#EF4444" radius={[4, 4, 0, 0]} barSize={16}>
                            <LabelList dataKey="withdrawals" position="top" formatter={v => v > 0 ? fmtShort(v) : ''} style={{ fontSize: 9, fill: '#6B7280' }} />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                      <div className="fin-report-legend" style={{ justifyContent: 'center', display: 'flex', gap: '16px' }}>
                        <div className="fin-report-legend-item" style={{ gap: '4px' }}>
                          <span className="fin-report-legend-dot" style={{ background: '#10B981' }} />
                          <span className="fin-report-legend-label">Deposits</span>
                        </div>
                        <div className="fin-report-legend-item" style={{ gap: '4px' }}>
                          <span className="fin-report-legend-dot" style={{ background: '#EF4444' }} />
                          <span className="fin-report-legend-label">Withdrawals</span>
                        </div>
                      </div>
                      <ChartFooter period={report.period} location={getLocationLabel()} />
                    </div>
                  );
                })()}
              </div>

              {/* Savings Progress Bar */}
              <div className="fin-report-progress-section">
                <div className="fin-report-progress-header">
                  <span>Overall Savings Progress</span>
                  <span className="fin-report-progress-pct">
                    {report.savings.overallProgress > 0 && report.savings.overallProgress < 1
                      ? '<1%'
                      : `${report.savings.overallProgress}%`}
                  </span>
                </div>
                <div className="fin-report-progress-track">
                  <div className="fin-report-progress-fill" style={{ width: `${Math.max(report.savings.overallProgress > 0 ? 1 : 0, Math.min(100, report.savings.overallProgress))}%` }} />
                </div>
                <p style={{fontSize: '10px', color: '#9ca3af', marginTop: '6px', marginBottom: 0}}>
                  {fmt(report.savings.totalSaved)} saved out of {fmt(report.savings.totalTargets)} target
                  {report.savings.totalTargets > 0 && report.savings.overallProgress < 1 && report.savings.totalSaved > 0
                    ? ` — Progress is less than 1% because the total target (${fmt(report.savings.totalTargets)}) is significantly larger than the amount saved so far.`
                    : ''}
                </p>
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

              {/* Attendance Charts Row */}
              <div className="fin-report-charts-row">
                {/* Attendance By Community Chart */}
                {report.attendance?.byBranch?.length > 0 && (
                  <div className="fin-report-chart-card">
                    <h3 className="fin-report-chart-title">Attendance By Community</h3>
                    <p className="fin-chart-summary">Top: <strong>{report.attendance.byBranch[0]?.name}</strong> · {report.attendance.byBranch[0]?.value} attendees</p>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={report.attendance.byBranch.slice(0, 8)} margin={{ top: 15, right: 10, left: -10, bottom: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={{ fontSize: 9, angle: -35, textAnchor: 'end' }} interval={0} height={50} />
                        <YAxis tick={{ fontSize: 10 }} allowDecimals={false}>
                          <Label value="Attendance Count" angle={-90} position="insideLeft" offset={20} style={{ fontSize: 9, fill: '#9CA3AF' }} />
                        </YAxis>
                        <Tooltip />
                        <Bar dataKey="value" fill="#0D1F45" radius={[4, 4, 0, 0]}>
                          <LabelList dataKey="value" position="top" style={{ fontSize: 10, fill: '#6B7280' }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <ChartFooter period={report.period} location={getLocationLabel()} />
                  </div>
                )}

                {/* Top Services Chart */}
                {report.attendance?.attendees?.length > 0 && (() => {
                  const serviceMap = {};
                  report.attendance.attendees.forEach(a => {
                    const svc = a.service || 'Unknown';
                    serviceMap[svc] = (serviceMap[svc] || 0) + 1;
                  });
                  const serviceData = Object.keys(serviceMap)
                    .map(svc => ({ service: svc, count: serviceMap[svc] }))
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 5); // Top 5
                  
                  return serviceData.length > 0 ? (
                    <div className="fin-report-chart-card">
                      <h3 className="fin-report-chart-title">Top Services By Attendance</h3>
                      <p className="fin-chart-summary">
                        Top: <strong>{serviceData[0].service}</strong> · {serviceData[0].count} attendees
                      </p>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={serviceData} layout="vertical" margin={{ top: 15, right: 30, left: 10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                          <XAxis type="number" hide />
                          <YAxis type="category" dataKey="service" tick={{ fontSize: 10 }} width={90} />
                          <Tooltip formatter={v => [v, 'Attendees']} />
                          <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20}>
                            {serviceData.map((_, i) => (
                              <Cell key={i} fill={i === 0 ? '#2563eb' : '#0D1F45'} />
                            ))}
                            <LabelList dataKey="count" position="right" style={{ fontSize: 10, fill: '#6B7280' }} />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                      <ChartFooter period={report.period} location={getLocationLabel()} />
                    </div>
                  ) : null;
                })()}
              </div>
              {/* === NEW: Monthly Attendance Trend (Row 1) === */}
              <div className="fin-report-charts-row" style={{ gridTemplateColumns: '1fr' }}>
                {(() => {
                  const byMonthMap = {};
                  (report.attendance.byMonth || []).forEach(d => { byMonthMap[d.month] = d.count; });
                  const { from, to } = getChartMonthRange();

                  const bmp = report.attendance.byMonthByProvince || {};
                  const bmc = report.attendance.byMonthByCommunity || {};
                  const availProvinces = [...new Set(Object.values(bmp).flatMap(obj => Object.keys(obj)))].sort();
                  const showProvinceTrend = availProvinces.length >= 2;

                  let allSeries = [];
                  let dataMap = {};
                  let chartTitle = 'Monthly Attendance Trend';

                  if (showProvinceTrend) {
                    allSeries = availProvinces;
                    dataMap = bmp;
                    chartTitle = `Monthly Attendance Trend (By Province)`;
                  } else {
                    allSeries = [...new Set(Object.values(bmc).flatMap(obj => Object.keys(obj)))].sort();
                    dataMap = bmc;
                    chartTitle = `Monthly Attendance Trend ${allSeries.length >= 2 ? '(By Community)' : ''}`;
                  }

                  const isMulti = allSeries.length >= 2;

                  // Filter series with actual data
                  const seriesWithData = allSeries.filter(s => Object.values(dataMap).some(monthObj => (monthObj[s] || 0) > 0));

                  const fullMonthData = MONTH_SHORT.slice(from, to + 1).map((label, idx) => {
                    const i = from + idx;
                    const key = `${reportYear}-${String(i + 1).padStart(2, '0')}`;
                    const row = { month: label, value: byMonthMap[key] || 0 };
                    if (isMulti && dataMap[key]) {
                      allSeries.forEach(s => { row[s] = dataMap[key][s] || 0; });
                    }
                    return row;
                  });

                  const totalAtt = fullMonthData.reduce((s, d) => s + d.value, 0);
                  const highestMon = fullMonthData.reduce((a, b) => b.value > a.value ? b : a, fullMonthData[0]);

                  return fullMonthData.some(d => d.value > 0) ? (
                    <div className="fin-report-chart-card" style={{ width: '100%' }}>
                      <h3 className="fin-report-chart-title">{chartTitle}</h3>
                      <p className="fin-chart-summary">Total: <strong>{totalAtt}</strong> attendees · Highest: <strong>{highestMon?.month}</strong> ({highestMon?.value})</p>
                      <ResponsiveContainer width="100%" height={isMulti ? 300 : 250}>
                        {isMulti ? (
                          <BarChart data={fullMonthData} margin={{ top: 15, right: 10, left: -10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} allowDecimals={false}>
                              <Label value="Attendees" angle={-90} position="insideLeft" offset={20} style={{ fontSize: 9, fill: '#9CA3AF' }} />
                            </YAxis>
                            <Tooltip />
                            {seriesWithData.map((s) => {
                              const origIdx = allSeries.indexOf(s);
                              return <Bar key={s} dataKey={s} fill={COMMUNITY_COLORS[origIdx % COMMUNITY_COLORS.length]} />;
                            })}
                          </BarChart>
                        ) : (
                          <BarChart data={fullMonthData} margin={{ top: 15, right: 10, left: -10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} allowDecimals={false}>
                              <Label value="Attendees" angle={-90} position="insideLeft" offset={20} style={{ fontSize: 9, fill: '#9CA3AF' }} />
                            </YAxis>
                            <Tooltip />
                            <Bar dataKey="value" fill="#0D1F45" radius={[4, 4, 0, 0]}>
                              <LabelList dataKey="value" position="top" style={{ fontSize: 10, fill: '#6B7280' }} />
                            </Bar>
                          </BarChart>
                        )}
                      </ResponsiveContainer>
                      {isMulti && (
                        <div className="fin-report-legend">
                          {(() => {
                            const activeSeries = allSeries.filter(s => seriesWithData.includes(s));
                            return (
                              <>
                                {activeSeries.map((s, i) => {
                                  const totalVal = fullMonthData.reduce((sum, row) => sum + (row[s] || 0), 0);
                                  const origIdx = allSeries.indexOf(s);
                                  return (
                                    <div key={s} className="fin-report-legend-item">
                                      <span className="fin-report-legend-dot" style={{ background: COMMUNITY_COLORS[origIdx % COMMUNITY_COLORS.length] }} />
                                      <span className="fin-report-legend-label">{s}</span>
                                      <span style={{ fontSize: '10px', color: '#4B5563', marginLeft: '6px' }}>({totalVal} attendees)</span>
                                    </div>
                                  );
                                })}
                                {allSeries.some(s => !seriesWithData.includes(s)) && (
                                  <div style={{ width: '100%', fontSize: '11px', color: '#9CA3AF', marginTop: '8px', fontStyle: 'italic' }}>
                                    No attendance: {allSeries.filter(s => !seriesWithData.includes(s)).join(', ')}
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      )}
                      <ChartFooter period={report.period} location={getLocationLabel()} />
                    </div>
                  ) : null;
                })()}
              </div>

              {(() => {
                const bmpCheck = report.attendance.byMonthByProvince || {};
                const availProvCheck = [...new Set(Object.values(bmpCheck).flatMap(obj => Object.keys(obj)))].sort();
                const shouldShowRow2 = availProvCheck.length >= 2;
                if (!shouldShowRow2) return null;
                return (
                <div className="fin-report-charts-row" style={{ gridTemplateColumns: '1fr' }}>
                  {(() => {
                    const byMonthMap = {};
                    (report.attendance.byMonth || []).forEach(d => { byMonthMap[d.month] = d.count; });
                    const { from, to } = getChartMonthRange();
                    const bmc = report.attendance.byMonthByCommunity || {};
                    const allCommunities = [...new Set(Object.values(bmc).flatMap(obj => Object.keys(obj)))].sort();
                    const isMulti = allCommunities.length >= 2;

                    // Filter communities with actual data
                    const commsWithData = allCommunities.filter(c => Object.values(bmc).some(monthObj => (monthObj[c] || 0) > 0));

                    const fullMonthData = MONTH_SHORT.slice(from, to + 1).map((label, idx) => {
                      const i = from + idx;
                      const key = `${reportYear}-${String(i + 1).padStart(2, '0')}`;
                      const row = { month: label, value: byMonthMap[key] || 0 };
                      if (isMulti && bmc[key]) {
                        commsWithData.forEach(c => { row[c] = bmc[key][c] || 0; });
                      }
                      return row;
                    });
                    const totalAtt = fullMonthData.reduce((s, d) => s + d.value, 0);
                    const highestMon = fullMonthData.reduce((a, b) => b.value > a.value ? b : a, fullMonthData[0]);

                    return fullMonthData.some(d => d.value > 0) ? (
                      <div className="fin-report-chart-card" style={{ width: '100%' }}>
                        <h3 className="fin-report-chart-title">Monthly Attendance Trend {isMulti ? '(By Community)' : ''}</h3>
                        <p className="fin-chart-summary">Detailed Community Breakdown · Total: <strong>{totalAtt}</strong> attendees · Highest: <strong>{highestMon?.month}</strong></p>
                        <ResponsiveContainer width="100%" height={isMulti ? 300 : 250}>
                          {isMulti ? (
                            <BarChart data={fullMonthData} margin={{ top: 15, right: 10, left: -10, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                              <YAxis tick={{ fontSize: 10 }} allowDecimals={false}>
                                <Label value="Attendees" angle={-90} position="insideLeft" offset={20} style={{ fontSize: 9, fill: '#9CA3AF' }} />
                              </YAxis>
                              <Tooltip />
                              {commsWithData.map((c) => {
                                const origIdx = allCommunities.indexOf(c);
                                return <Bar key={c} dataKey={c} fill={COMMUNITY_COLORS[origIdx % COMMUNITY_COLORS.length]} />;
                              })}
                            </BarChart>
                          ) : (
                            <BarChart data={fullMonthData} margin={{ top: 15, right: 10, left: -10, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                              <YAxis tick={{ fontSize: 10 }} allowDecimals={false}>
                                <Label value="Attendees" angle={-90} position="insideLeft" offset={20} style={{ fontSize: 9, fill: '#9CA3AF' }} />
                              </YAxis>
                              <Tooltip />
                              <Bar dataKey="value" fill="#0D1F45" radius={[4, 4, 0, 0]}>
                                <LabelList dataKey="value" position="top" style={{ fontSize: 10, fill: '#6B7280' }} />
                              </Bar>
                            </BarChart>
                          )}
                        </ResponsiveContainer>
                        {isMulti && (() => {
                          const branchToProv = {};
                          branchesData.forEach(b => {
                            branchToProv[b.name] = b.province || (b.address ? b.address.split(',')[0].trim() : 'Unknown');
                          });
                          const commsByProv = {};
                          allCommunities.forEach((c, i) => {
                            const prov = branchToProv[c] || 'Unknown';
                            if (!commsByProv[prov]) commsByProv[prov] = [];
                            const hasData = commsWithData.includes(c);
                            commsByProv[prov].push({ name: c, index: i, hasData });
                          });
                          
                          return (
                            <div className="fin-report-grouped-legend" style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', marginTop: '16px' }}>
                              {Object.entries(commsByProv).map(([prov, comms]) => {
                                const activeComms = comms.filter(c => c.hasData);
                                if (activeComms.length === 0) return null;
                                return (
                                  <div key={prov} className="fin-report-legend-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '120px' }}>
                                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase', borderBottom: '1px solid #e5e7eb', paddingBottom: '4px', marginBottom: '2px' }}>
                                      {prov}
                                    </div>
                                    {activeComms.map((c) => {
                                      const totalVal = fullMonthData.reduce((sum, row) => sum + (row[c.name] || 0), 0);
                                      return (
                                        <div key={c.name} className="fin-report-legend-item" style={{ margin: 0 }}>
                                          <div style={{ display: 'flex', alignItems: 'center' }}>
                                            <span className="fin-report-legend-dot" style={{ background: COMMUNITY_COLORS[c.index % COMMUNITY_COLORS.length] }} />
                                            <span className="fin-report-legend-label">{c.name}</span>
                                            <span style={{ fontSize: '10px', color: '#4B5563', marginLeft: '6px' }}>({totalVal} attendees)</span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                );
                              })}
                              {allCommunities.some(c => !commsWithData.includes(c)) && (
                                <div style={{ width: '100%', fontSize: '11px', color: '#9CA3AF', marginTop: '8px', fontStyle: 'italic' }}>
                                  No attendance: {allCommunities.filter(c => !commsWithData.includes(c)).join(', ')}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                        <ChartFooter period={report.period} location={getLocationLabel()} />
                      </div>
                    ) : null;
                  })()}
                </div>
              );
              })()}

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
              <div className="fin-report-charts-row" style={{ gridTemplateColumns: '1fr' }}>
                {/* === Monthly Disbursements (Row 1) === */}
                {(() => {
                  const { from, to } = getChartMonthRange();
                  const byMonthMap = {};
                  (report.secretary.disbursements.byMonth || []).forEach(d => { byMonthMap[d.month] = d; });
                  
                  const provDataMap = report.secretary.disbursements.byMonthByProvince || {};
                  const availableProvinces = [...new Set(Object.values(provDataMap).flatMap(obj => Object.keys(obj)))].sort();
                  const showProvinceTrend = availableProvinces.length >= 2;
                  const dataMap = showProvinceTrend ? provDataMap : (report.secretary.disbursements.byMonthByCommunity || {});
                  let allSeries = [...new Set(Object.values(dataMap).flatMap(obj => Object.keys(obj)))].sort();
                  const isMulti = allSeries.length >= 2;

                  // Filter communities/provinces with actual data
                  const seriesWithData = allSeries.filter(s => Object.values(dataMap).some(monthObj => (monthObj[s] || 0) > 0));

                  const chartTitle = `Monthly Disbursements ${allSeries.length >= 2 ? (showProvinceTrend ? '(By Province)' : '(By Community)') : ''}`;

                  const trendData = MONTH_SHORT.slice(from, to + 1).map((label, idx) => {
                    const i = from + idx;
                    const key = `${reportYear}-${String(i + 1).padStart(2, '0')}`;
                    const existing = byMonthMap[key];
                    const row = { month: key, label, value: existing?.value || 0 };
                    if (isMulti && dataMap[key]) {
                      allSeries.forEach(s => { row[s] = dataMap[key][s] || 0; });
                    }
                    return row;
                  });
                  const totalDisb = trendData.reduce((s, d) => s + d.value, 0);
                  const highestMon = trendData.reduce((a, b) => b.value > a.value ? b : a, trendData[0]);
                  return trendData.length > 0 ? (
                    <div className="fin-report-chart-card" style={{ width: '100%' }}>
                      <h3 className="fin-report-chart-title">{chartTitle}</h3>
                      <p className="fin-chart-summary">Total: <strong>{fmt(totalDisb)}</strong> · {report.secretary.disbursements.count} releases · Highest: <strong>{highestMon?.label}</strong></p>
                      <ResponsiveContainer width="100%" height={isMulti ? 300 : 250}>
                        {isMulti ? (
                          <BarChart data={trendData} margin={{ top: 15, right: 10, left: -10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `₱${(v/1000).toFixed(0)}k`} allowDecimals={false}>
                              <Label value="Amount (₱)" angle={-90} position="insideLeft" offset={20} style={{ fontSize: 9, fill: '#9CA3AF' }} />
                            </YAxis>
                            <Tooltip formatter={(v, name) => [fmt(v), name === 'value' ? 'Amount' : name]} />
                            {seriesWithData.map((s) => {
                              const origIdx = allSeries.indexOf(s);
                              return <Bar key={s} dataKey={s} name={s} fill={COMMUNITY_COLORS[origIdx % COMMUNITY_COLORS.length]} />;
                            })}
                          </BarChart>
                        ) : (
                          <BarChart data={trendData} margin={{ top: 15, right: 10, left: -10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `₱${(v/1000).toFixed(0)}k`} allowDecimals={false}>
                              <Label value="Amount (₱)" angle={-90} position="insideLeft" offset={20} style={{ fontSize: 9, fill: '#9CA3AF' }} />
                            </YAxis>
                            <Tooltip formatter={v => fmt(v)} labelFormatter={(v, payload) => payload?.[0]?.payload?.label || v} />
                            <Bar name="Amount" dataKey="value" fill="#0D1F45" radius={[4, 4, 0, 0]} barSize={30}>
                              <LabelList dataKey="value" position="top" formatter={v => v > 0 ? fmtShort(v) : ''} style={{ fontSize: 10, fill: '#6B7280' }} />
                            </Bar>
                          </BarChart>
                        )}
                      </ResponsiveContainer>
                      {isMulti && (() => {
                        const branchToProv = {};
                        branchesData.forEach(b => {
                          branchToProv[b.name] = b.province || (b.address ? b.address.split(',')[0].trim() : 'Unknown');
                        });
                        const seriesByProv = {};
                        allSeries.forEach((s, i) => {
                          const prov = showProvinceTrend ? s : (branchToProv[s] || 'Unknown');
                          if (!seriesByProv[prov]) seriesByProv[prov] = [];
                          const hasData = seriesWithData.includes(s);
                          seriesByProv[prov].push({ name: s, index: i, hasData });
                        });
                        
                        return (
                          <div className="fin-report-grouped-legend" style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', marginTop: '16px' }}>
                            {Object.entries(seriesByProv).map(([prov, seriesList]) => {
                              const activeSeries = seriesList.filter(s => s.hasData);
                              if (activeSeries.length === 0) return null;
                              return (
                                <div key={prov} className="fin-report-legend-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '120px' }}>
                                  {!showProvinceTrend && (
                                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase', borderBottom: '1px solid #e5e7eb', paddingBottom: '4px', marginBottom: '2px' }}>
                                      {prov}
                                    </div>
                                  )}
                                  {activeSeries.map((s) => {
                                    const totalVal = trendData.reduce((sum, row) => sum + (row[s.name] || 0), 0);
                                    return (
                                      <div key={s.name} className="fin-report-legend-item" style={{ margin: 0, flexDirection: 'column', alignItems: 'flex-start' }}>
                                        <div style={{ display: 'flex', alignItems: 'center' }}>
                                          <span className="fin-report-legend-dot" style={{ background: COMMUNITY_COLORS[s.index % COMMUNITY_COLORS.length] }} />
                                          <span className="fin-report-legend-label">{s.name}</span>
                                          <span style={{ fontSize: '10px', color: '#4B5563', marginLeft: '6px' }}>({fmt(totalVal)})</span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })}
                            {allSeries.some(s => !seriesWithData.includes(s)) && (
                              <div style={{ width: '100%', fontSize: '11px', color: '#9CA3AF', marginTop: '8px', fontStyle: 'italic' }}>
                                No disbursements: {allSeries.filter(s => !seriesWithData.includes(s)).join(', ')}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                      <ChartFooter period={report.period} location={getLocationLabel()} />
                    </div>
                  ) : null;
                })()}
              </div>

              {(() => {
                const provDataMap2 = report.secretary.disbursements.byMonthByProvince || {};
                const availProv2 = [...new Set(Object.values(provDataMap2).flatMap(obj => Object.keys(obj)))].sort();
                const shouldShowRow2 = availProv2.length >= 2;
                if (!shouldShowRow2) return null;
                return (
                <div className="fin-report-charts-row" style={{ gridTemplateColumns: '1fr' }}>
                  {(() => {
                    const { from, to } = getChartMonthRange();
                    const byMonthMap = {};
                    (report.secretary.disbursements.byMonth || []).forEach(d => { byMonthMap[d.month] = d; });
                    
                    const dataMap = report.secretary.disbursements.byMonthByCommunity || {};
                    let allSeries = [...new Set(Object.values(dataMap).flatMap(obj => Object.keys(obj)))].sort();
                    const chartTitle = `Monthly Disbursements (By Community)`;
                    const isMulti = allSeries.length >= 2;

                    // Filter communities with actual data
                    const seriesWithData = allSeries.filter(s => Object.values(dataMap).some(monthObj => (monthObj[s] || 0) > 0));

                    const trendData = MONTH_SHORT.slice(from, to + 1).map((label, idx) => {
                      const i = from + idx;
                      const key = `${reportYear}-${String(i + 1).padStart(2, '0')}`;
                      const existing = byMonthMap[key];
                      const row = { month: key, label, value: existing?.value || 0 };
                      if (isMulti && dataMap[key]) {
                        seriesWithData.forEach(s => { row[s] = dataMap[key][s] || 0; });
                      }
                      return row;
                    });
                    const totalDisb = trendData.reduce((s, d) => s + d.value, 0);
                    const highestMon = trendData.reduce((a, b) => b.value > a.value ? b : a, trendData[0]);

                    return trendData.length > 0 ? (
                      <div className="fin-report-chart-card" style={{ width: '100%' }}>
                        <h3 className="fin-report-chart-title">{chartTitle}</h3>
                        <p className="fin-chart-summary">Detailed Community Breakdown · Total: <strong>{fmt(totalDisb)}</strong> · Highest: <strong>{highestMon?.label}</strong></p>
                        <ResponsiveContainer width="100%" height={isMulti ? 300 : 250}>
                          {isMulti ? (
                            <BarChart data={trendData} margin={{ top: 15, right: 10, left: -10, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `₱${(v/1000).toFixed(0)}k`} allowDecimals={false}>
                                <Label value="Amount (₱)" angle={-90} position="insideLeft" offset={20} style={{ fontSize: 9, fill: '#9CA3AF' }} />
                              </YAxis>
                              <Tooltip formatter={(v, name) => [fmt(v), name === 'value' ? 'Amount' : name]} />
                              {seriesWithData.map((s) => {
                                const origIdx = allSeries.indexOf(s);
                                return <Bar key={s} dataKey={s} name={s} fill={COMMUNITY_COLORS[origIdx % COMMUNITY_COLORS.length]} />;
                              })}
                            </BarChart>
                          ) : (
                            <BarChart data={trendData} margin={{ top: 15, right: 10, left: -10, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `₱${(v/1000).toFixed(0)}k`} allowDecimals={false}>
                                <Label value="Amount (₱)" angle={-90} position="insideLeft" offset={20} style={{ fontSize: 9, fill: '#9CA3AF' }} />
                              </YAxis>
                              <Tooltip formatter={v => fmt(v)} labelFormatter={(v, payload) => payload?.[0]?.payload?.label || v} />
                              <Bar name="Amount" dataKey="value" fill="#0D1F45" radius={[4, 4, 0, 0]} barSize={30}>
                                <LabelList dataKey="value" position="top" formatter={v => v > 0 ? fmtShort(v) : ''} style={{ fontSize: 10, fill: '#6B7280' }} />
                              </Bar>
                            </BarChart>
                          )}
                        </ResponsiveContainer>
                        {isMulti && (() => {
                          const branchToProv = {};
                          branchesData.forEach(b => {
                            branchToProv[b.name] = b.province || (b.address ? b.address.split(',')[0].trim() : 'Unknown');
                          });
                          const seriesByProv = {};
                          allSeries.forEach((s, i) => {
                            const prov = branchToProv[s] || 'Unknown';
                            if (!seriesByProv[prov]) seriesByProv[prov] = [];
                            const hasData = seriesWithData.includes(s);
                            seriesByProv[prov].push({ name: s, index: i, hasData });
                          });
                          
                          return (
                            <div className="fin-report-grouped-legend" style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', marginTop: '16px' }}>
                              {Object.entries(seriesByProv).map(([prov, seriesList]) => {
                                const activeSeries = seriesList.filter(s => s.hasData);
                                if (activeSeries.length === 0) return null;
                                return (
                                  <div key={prov} className="fin-report-legend-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '120px' }}>
                                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#6b7280', textTransform: 'uppercase', borderBottom: '1px solid #e5e7eb', paddingBottom: '4px', marginBottom: '2px' }}>
                                      {prov}
                                    </div>
                                    {activeSeries.map((s) => {
                                      const totalVal = trendData.reduce((sum, row) => sum + (row[s.name] || 0), 0);
                                      return (
                                        <div key={s.name} className="fin-report-legend-item" style={{ margin: 0, flexDirection: 'column', alignItems: 'flex-start' }}>
                                          <div style={{ display: 'flex', alignItems: 'center' }}>
                                            <span className="fin-report-legend-dot" style={{ background: COMMUNITY_COLORS[s.index % COMMUNITY_COLORS.length] }} />
                                            <span className="fin-report-legend-label">{s.name}</span>
                                            <span style={{ fontSize: '10px', color: '#4B5563', marginLeft: '6px' }}>({fmt(totalVal)})</span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                );
                              })}
                              {allSeries.some(s => !seriesWithData.includes(s)) && (
                                <div style={{ width: '100%', fontSize: '11px', color: '#9CA3AF', marginTop: '8px', fontStyle: 'italic' }}>
                                  No disbursements: {allSeries.filter(s => !seriesWithData.includes(s)).join(', ')}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                        <ChartFooter period={report.period} location={getLocationLabel()} />
                      </div>
                    ) : null;
                   })()}
                </div>
              );
              })()}

              {/* Top Communities Row (Full Width) */}
              <div className="fin-report-charts-row" style={{ gridTemplateColumns: '1fr' }}>
                {/* Top 5 Communities by Disbursement */}
                {report.secretary.disbursements.byCommunity?.length > 0 && (
                  <div className="fin-report-chart-card">
                    <h3 className="fin-report-chart-title">Top Communities By Disbursement</h3>
                    <p className="fin-chart-summary">Top: <strong>{report.secretary.disbursements.byCommunity[0]?.community}</strong> · {fmt(report.secretary.disbursements.byCommunity[0]?.value)} ({report.secretary.disbursements.totalAmount > 0 ? ((report.secretary.disbursements.byCommunity[0]?.value / report.secretary.disbursements.totalAmount) * 100).toFixed(1) : 0}%)</p>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={report.secretary.disbursements.byCommunity} margin={{ top: 15, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="community" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `₱${(v/1000).toFixed(0)}k`} allowDecimals={false}>
                          <Label value="Amount (₱)" angle={-90} position="insideLeft" offset={20} style={{ fontSize: 9, fill: '#9CA3AF' }} />
                        </YAxis>
                        <Tooltip formatter={(v, name) => [fmt(v), name === 'value' ? 'Amount' : name]} />
                        <Bar dataKey="value" fill="#0D1F45" radius={[4, 4, 0, 0]} barSize={40}>
                          {report.secretary.disbursements.byCommunity.map((_, i) => (
                            <Cell key={i} fill={i === 0 ? '#2563eb' : '#0D1F45'} />
                          ))}
                          <LabelList dataKey="value" position="top" formatter={v => fmtShort(v)} style={{ fontSize: 10, fill: '#6B7280' }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="fin-report-legend">
                      {report.secretary.disbursements.byCommunity.map((c, i) => (
                        <div key={i} className="fin-report-legend-item">
                          <span className="fin-report-legend-dot" style={{ background: i === 0 ? '#2563eb' : '#0D1F45' }} />
                          <span className="fin-report-legend-label">{c.community}</span>
                          <span className="fin-report-legend-val">{fmt(c.value)} · {report.secretary.disbursements.totalAmount > 0 ? ((c.value / report.secretary.disbursements.totalAmount) * 100).toFixed(0) : 0}%</span>
                        </div>
                      ))}
                    </div>
                    <ChartFooter period={report.period} location={getLocationLabel()} />
                  </div>
                )}
              </div>

              {/* Payment Method + Top Recipients Row */}
              <div className="fin-report-charts-row">
                {/* Payment Method Distribution */}
                {report.secretary.disbursements.byMethod?.length > 0 && (() => {
                  const normalizedMethods = {};
                  report.secretary.disbursements.byMethod.forEach(m => {
                    const normalized = normalizeMethod(m.method);
                    normalizedMethods[normalized] = (normalizedMethods[normalized] || 0) + m.value;
                  });
                  const methodData = Object.entries(normalizedMethods).map(([method, value]) => ({ method, value })).sort((a, b) => b.value - a.value);
                  return (
                  <div className="fin-report-chart-card">
                    <h3 className="fin-report-chart-title">Disbursement By Payment Method</h3>
                    <p className="fin-chart-summary">Total: <strong>{fmt(report.secretary.disbursements.totalAmount)}</strong> · {methodData.length} methods</p>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie
                          data={methodData.map(m => ({ name: m.method, value: m.value }))}
                          cx="50%" cy="45%"
                          innerRadius={35} outerRadius={68}
                          paddingAngle={2}
                          dataKey="value"
                          label={renderSliceLabel}
                          labelLine={false}
                        >
                          {methodData.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v, name) => [fmt(v), name === 'value' ? 'Amount' : name]} />
                      </PieChart>
                    </ResponsiveContainer>
                    <p className="fin-report-chart-total">{fmt(report.secretary.disbursements.totalAmount)} Total</p>
                    <div className="fin-report-legend">
                      {methodData.map((m, i) => (
                        <div key={i} className="fin-report-legend-item">
                          <span className="fin-report-legend-dot" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                          <span className="fin-report-legend-label">{m.method}</span>
                          <span className="fin-report-legend-val">{fmt(m.value)} · {report.secretary.disbursements.totalAmount > 0 ? ((m.value / report.secretary.disbursements.totalAmount) * 100).toFixed(0) : 0}%</span>
                        </div>
                      ))}
                    </div>
                    <ChartFooter period={report.period} location={getLocationLabel()} />
                  </div>
                  );
                })()}

                {/* Top 5 Recipients */}
                {report.secretary.disbursements.byUser?.length > 0 && (
                  <div className="fin-report-chart-card">
                    <h3 className="fin-report-chart-title">Top Recipients By Disbursement</h3>
                    <p className="fin-chart-summary">#1: <strong>{report.secretary.disbursements.byUser[0]?.user}</strong> · {fmt(report.secretary.disbursements.byUser[0]?.value)} ({report.secretary.disbursements.totalAmount > 0 ? ((report.secretary.disbursements.byUser[0]?.value / report.secretary.disbursements.totalAmount) * 100).toFixed(1) : 0}%)</p>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={report.secretary.disbursements.byUser} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `₱${(v/1000).toFixed(0)}k`}>
                          <Label value="Amount (₱)" position="bottom" offset={-5} style={{ fontSize: 9, fill: '#9CA3AF' }} />
                        </XAxis>
                        <YAxis type="category" dataKey="user" tick={{ fontSize: 10 }} width={120} />
                        <Tooltip formatter={(v, name) => [fmt(v), name === 'value' ? 'Amount' : name]} />
                        <Bar dataKey="value" fill="#1e3a8a" radius={[0, 4, 4, 0]} barSize={18}>
                          {report.secretary.disbursements.byUser.map((_, i) => (
                            <Cell key={i} fill={i === 0 ? '#2563eb' : '#1e3a8a'} />
                          ))}
                          <LabelList dataKey="value" position="right" formatter={v => fmtShort(v)} style={{ fontSize: 10, fill: '#6B7280' }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <div className="fin-report-legend">
                      {report.secretary.disbursements.byUser.map((u, i) => (
                        <div key={i} className="fin-report-legend-item">
                          <span className="fin-report-legend-dot" style={{ background: i === 0 ? '#2563eb' : '#1e3a8a' }} />
                          <span className="fin-report-legend-label">{u.user}</span>
                          <span className="fin-report-legend-val">{fmt(u.value)} · {report.secretary.disbursements.totalAmount > 0 ? ((u.value / report.secretary.disbursements.totalAmount) * 100).toFixed(0) : 0}%</span>
                        </div>
                      ))}
                    </div>
                    <ChartFooter period={report.period} location={getLocationLabel()} />
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
            <p>Generated by IsangDiwa AI • {new Date(report.generatedAt).toLocaleString('en-US')}</p>
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
              {adminRole === 'admin' && (
                <div className="fin-confirm-row">
                  <span className="fin-confirm-label">Report Type</span>
                  <span className="fin-confirm-value">{getReportTypeName()}</span>
                </div>
              )}
              <div className="fin-confirm-row">
                <span className="fin-confirm-label">Period</span>
                <span className="fin-confirm-value">{getPeriodName()}</span>
              </div>
              <div className="fin-confirm-row">
                <span className="fin-confirm-label">Location</span>
                <span className="fin-confirm-value">
                  {getLocationLabel()}
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
