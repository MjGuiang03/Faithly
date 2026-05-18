import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LabelList, Cell, ResponsiveContainer } from 'recharts';
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

  return (
    <div className="dcp-card">
      <div className="dcp-card-header" style={{ marginBottom: '10px' }}>
        <div>
          <h3 className="dcp-card-title" style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#111827' }}>Donation Categories</h3>
          <span style={{ fontSize: '12px', color: '#6B7280' }}>Total: ₱{(pieTotal || 0).toLocaleString()}</span>
        </div>
      </div>
      <div className="dcp-chart-container" style={{ padding: '10px 0', height: '220px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={sortedDonationData}
            margin={{ top: 0, right: 90, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#F3F4F6" />
            <XAxis type="number" hide />
            <YAxis 
              type="category" 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 11, fill: '#4B5563' }} 
              width={130} 
              tickFormatter={(val) => val.length > 18 ? val.substring(0, 18) + '...' : val}
            />
            <Tooltip 
              cursor={{ fill: '#F9FAFB' }}
              formatter={(value, name, props) => {
                const p = props.payload;
                return [`₱${value.toLocaleString()} (${p.percentage}%)`, 'Donations'];
              }}
              contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20} minPointSize={2}>
              {sortedDonationData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fillColor} />
              ))}
              <LabelList 
                dataKey="displayLabel" 
                position="right" 
                fill="#6B7280" 
                fontSize={11} 
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
