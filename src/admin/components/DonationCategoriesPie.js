import React, { useMemo } from 'react';
import '../styles/DonationCategoriesPie.css';

const INITIAL_DONATION_CATEGORIES = [
  { name: 'General Fund', value: 0, color: '#0D1F45' },
  { name: 'Children\'s Department', value: 0, color: '#1E3A8A' },
  { name: 'Men\'s Department', value: 0, color: '#2563EB' },
  { name: 'Women\'s Department', value: 0, color: '#3B82F6' },
  { name: 'Youth Department', value: 0, color: '#60A5FA' },
  { name: 'Mission Fund', value: 0, color: '#93C5FD' },
];

export default function DonationCategoriesPie({ categoryBreakdown = {} }) {
  const pieData = useMemo(() => {
    return INITIAL_DONATION_CATEGORIES.map(cat => ({
      ...cat,
      value: categoryBreakdown[cat.name] || 0
    }));
  }, [categoryBreakdown]);

  const pieTotal = pieData.reduce((sum, item) => sum + (item.value || 0), 0);

  const sortedDonationData = useMemo(() => {
    return [...pieData].sort((a, b) => b.value - a.value).map(item => {
      const percentage = pieTotal > 0 ? ((item.value / pieTotal) * 100).toFixed(1) : 0;
      return {
        ...item,
        percentage,
        displayLabel: `₱${(item.value || 0).toLocaleString()} (${percentage}%)`,
        fillColor: item.value > 0 ? item.color : '#D1D5DB'
      };
    });
  }, [pieData, pieTotal]);

  const formatK = (num) => num >= 1000 ? `${(num / 1000).toFixed(0)}k` : num;

  return (
    <div className="dcp-card" style={{ padding: '24px' }}>
      <div className="dcp-card-header" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '8px' }}>
          <h3 className="dcp-card-title" style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#111827', fontFamily: "'Inter', sans-serif" }}>Donation Categories</h3>
          <span className="dcp-stat-chip">
            ₱{(pieTotal || 0).toLocaleString()}
          </span>
        </div>
      </div>
      <div className="dcp-donation-list">
        {sortedDonationData.map((item, idx) => {
          const shortName = item.name.replace('Department', 'Dept');
          const displayLabel = `₱${formatK(item.value || 0)} • ${item.percentage}%`;
          return (
            <div key={idx} className="dcp-donation-row">
              <span className="dcp-donation-name">{shortName}</span>
              <div className="dcp-donation-bar-bg">
                <div className="dcp-donation-bar-fill" style={{ width: `${item.percentage}%`, backgroundColor: item.fillColor }}></div>
              </div>
              <span className="dcp-donation-value">{displayLabel}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
