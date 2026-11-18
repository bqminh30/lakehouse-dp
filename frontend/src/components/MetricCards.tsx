import React from 'react';
import { DollarSign, ShoppingCart, CheckCircle, TrendingUp } from 'lucide-react';
import { DashboardMetrics } from '../types';

interface MetricCardsProps {
  metrics: DashboardMetrics;
  isLive: boolean;
}

export const MetricCards: React.FC<MetricCardsProps> = ({ metrics, isLive }) => {
  const cards = [
    {
      title: 'Total Revenue',
      value: `$${metrics.totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: '#3b82f6',
      sub: 'All-time Lakehouse gross'
    },
    {
      title: 'Total Orders',
      value: metrics.totalOrders.toString(),
      icon: ShoppingCart,
      color: '#8b5cf6',
      sub: `${metrics.completedOrders} completed orders`
    },
    {
      title: 'Completed Rate',
      value: `${((metrics.completedOrders / (metrics.totalOrders || 1)) * 100).toFixed(1)}%`,
      icon: CheckCircle,
      color: '#10b981',
      sub: 'Fulfillment success'
    },
    {
      title: 'Avg Order Value',
      value: `$${metrics.avgOrderValue.toFixed(2)}`,
      icon: TrendingUp,
      color: '#f59e0b',
      sub: `Top: ${metrics.topCategory}`
    }
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '24px' }}>
      {cards.map((c, i) => {
        const IconComponent = c.icon;
        return (
          <div
            key={i}
            style={{
              backgroundColor: '#1e293b',
              borderRadius: '12px',
              padding: '20px',
              border: '1px solid #334155',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#94a3b8', fontSize: '14px', fontWeight: 500 }}>{c.title}</span>
              <div style={{ backgroundColor: `${c.color}20`, padding: '8px', borderRadius: '8px' }}>
                <IconComponent size={20} color={c.color} />
              </div>
            </div>
            <div style={{ marginTop: '12px' }}>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#f8fafc' }}>{c.value}</div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>{c.sub}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

