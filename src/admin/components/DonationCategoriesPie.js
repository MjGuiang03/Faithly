import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, Label, Tooltip, ResponsiveContainer } from 'recharts';
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
  const activePieData = pieData.filter(d => d.value > 0);
  const zeroPieData = pieData.filter(d => d.value === 0);

  return (
    <div className="dcp-card">
      <div className="dcp-card-header">
        <h3 className="dcp-card-title">Donation Categories</h3>
      </div>
      <div className="dcp-chart-container">
        {activePieData.length === 0 ? (
          <div className="dcp-empty-state">No donations recorded yet.</div>
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie 
                data={activePieData} 
                cx="50%" 
                cy="50%" 
                innerRadius={45} 
                outerRadius={72} 
                paddingAngle={2} 
                dataKey="value"
              >
                {activePieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
                <Label 
                  value={`₱${pieTotal >= 1000 ? (pieTotal/1000).toFixed(1).replace(/\.0$/, '') + 'k' : pieTotal}`} 
                  position="center" 
                  fill="#1e3a5f" 
                  style={{ fontSize: '14px', fontWeight: 'bold', fontFamily: 'Inter' }} 
                />
                <Label 
                  value="Total" 
                  position="center" 
                  dy={12} 
                  fill="#6B7280" 
                  style={{ fontSize: '10px', fontFamily: 'Inter' }} 
                />
              </Pie>
              <Tooltip 
                formatter={(value, name, props) => [`₱${(value || 0).toLocaleString()} (${Math.round((value/pieTotal)*100)}%)`, props.payload.name]} 
                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
        
        {activePieData.length > 0 && (
          <div className="dcp-legend">
            {activePieData.map((cat, i) => (
              <div key={i} className="dcp-legend-item">
                <div className="dcp-dot" style={{ background: cat.color }} />
                <span className="dcp-label">{cat.name}</span>
                <span className="dcp-val">₱{cat.value.toLocaleString()} — {Math.round((cat.value/pieTotal)*100)}%</span>
              </div>
            ))}
          </div>
        )}
        
        {zeroPieData.length > 0 && (
          <div className="dcp-no-data">
            ({zeroPieData.map(c => c.name).join(', ')}: no donations yet)
          </div>
        )}
      </div>
    </div>
  );
}
