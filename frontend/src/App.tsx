import React, { useEffect, useState } from 'react';
import { RefreshCw, Database, Layers, Radio } from 'lucide-react';
import { getDailySales, getCategorySales, getCustomerAnalytics } from './services/api';
import { DailySalesRecord, CategorySalesRecord, CustomerAnalyticsRecord, DashboardMetrics } from './types';
import { MetricCards } from './components/MetricCards';
import { RevenueTrendChart } from './components/RevenueTrendChart';
import { CategoryPieChart } from './components/CategoryPieChart';
import { CustomerTopChart } from './components/CustomerTopChart';

export const App: React.FC = () => {
  const [dailySales, setDailySales] = useState<DailySalesRecord[]>([]);
  const [categorySales, setCategorySales] = useState<CategorySalesRecord[]>([]);
  const [customers, setCustomers] = useState<CustomerAnalyticsRecord[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [dailyRes, catRes, custRes] = await Promise.all([
        getDailySales(),
        getCategorySales(),
        getCustomerAnalytics()
      ]);

      setDailySales(dailyRes.data);
      setCategorySales(catRes.data);
      setCustomers(custRes.data);
      setIsLive(dailyRes.isLive || catRes.isLive || custRes.isLive);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute metrics
  const totalRevenue = dailySales.reduce((sum, d) => sum + Number(d.total_revenue || 0), 0);
  const totalOrders = dailySales.reduce((sum, d) => sum + Number(d.total_orders || 0), 0);
  const completedOrders = dailySales.reduce((sum, d) => sum + Number(d.completed_orders || 0), 0);
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const topCategory = categorySales[0]?.category_name || 'N/A';
  const topCustomer = customers[0]?.full_name || 'N/A';

  const metrics: DashboardMetrics = {
    totalRevenue,
    totalOrders,
    completedOrders,
    avgOrderValue,
    topCategory,
    topCustomer
  };

  return (
    <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '32px 24px' }}>
      {/* Top Header */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '28px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Layers size={28} color="#3b82f6" />
            <h1 style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '-0.5px' }}>
              Lakehouse Analytics Dashboard
            </h1>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '4px' }}>
            Live analytics powered by <b>Postgres → Spark → Iceberg REST (MinIO) → ClickHouse</b>
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {/* Connection Status Badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: 500,
              backgroundColor: isLive ? '#064e3b' : '#334155',
              color: isLive ? '#34d399' : '#cbd5e1',
              border: `1px solid ${isLive ? '#059669' : '#475569'}`
            }}
          >
            <Radio size={14} className={isLive ? 'animate-pulse' : ''} />
            <span>{isLive ? 'ClickHouse Connected' : 'Sample / Fallback Mode'}</span>
          </div>

          {/* Refresh Button */}
          <button
            onClick={loadData}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'background-color 0.2s'
            }}
          >
            <RefreshCw size={16} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            <span>Refresh</span>
          </button>
        </div>
      </header>

      {/* KPI Cards */}
      <MetricCards metrics={metrics} isLive={isLive} />

      {/* Main Charts Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: '24px' }}>
        {/* Daily Revenue Trend */}
        <div style={{ gridColumn: 'span 2' }}>
          <RevenueTrendChart data={dailySales} />
        </div>

        {/* Category Share */}
        <div>
          <CategoryPieChart data={categorySales} />
        </div>

        {/* Top Customer Lifetime Value */}
        <div>
          <CustomerTopChart data={customers} />
        </div>
      </div>

      {/* Architecture Footer Callout */}
      <footer
        style={{
          marginTop: '32px',
          padding: '16px 20px',
          backgroundColor: '#1e293b',
          borderRadius: '10px',
          border: '1px solid #334155',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          color: '#94a3b8',
          fontSize: '13px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Database size={16} color="#60a5fa" />
          <span><b>Lakehouse Architecture:</b> MinIO Object Store (S3) | Iceberg REST Catalog | Spark 3.5 Standalone | Trino 444 | ClickHouse OLAP</span>
        </div>
        <div>
          <span>API URL: <code>{import.meta.env.VITE_CLICKHOUSE_URL || 'http://localhost:8123'}</code></span>
        </div>
      </footer>
    </div>
  );
};

