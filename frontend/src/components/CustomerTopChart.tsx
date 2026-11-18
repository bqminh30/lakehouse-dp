import React from 'react';
import ReactECharts from 'echarts-for-react';
import { CustomerAnalyticsRecord } from '../types';

interface Props {
  data: CustomerAnalyticsRecord[];
}

export const CustomerTopChart: React.FC<Props> = ({ data }) => {
  // Sort ascending for horizontal bar chart (so highest is at top)
  const sorted = [...data].sort((a, b) => a.total_spent - b.total_spent);
  const names = sorted.map((c) => `${c.full_name} (${c.city})`);
  const values = sorted.map((c) => c.total_spent);

  const option = {
    backgroundColor: 'transparent',
    title: {
      text: 'Top Customers by Lifetime Spend (LTV)',
      textStyle: { color: '#f8fafc', fontSize: 16, fontWeight: 600 },
      left: '0%'
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: '#0f172a',
      borderColor: '#334155',
      textStyle: { color: '#f8fafc' },
      formatter: '{b}<br/>Total Spent: <b>${c}</b>'
    },
    grid: {
      left: '3%',
      right: '6%',
      bottom: '3%',
      top: '15%',
      containLabel: true
    },
    xAxis: {
      type: 'value',
      name: 'Spent ($)',
      nameTextStyle: { color: '#94a3b8' },
      splitLine: { lineStyle: { color: '#334155', type: 'dashed' } },
      axisLabel: { color: '#94a3b8', formatter: '${value}' }
    },
    yAxis: {
      type: 'category',
      data: names,
      axisLine: { lineStyle: { color: '#475569' } },
      axisLabel: { color: '#94a3b8' }
    },
    series: [
      {
        name: 'Total Spent',
        type: 'bar',
        data: values,
        itemStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 1,
            y2: 0,
            colorStops: [
              { offset: 0, color: '#8b5cf6' },
              { offset: 1, color: '#c084fc' }
            ]
          },
          borderRadius: [0, 4, 4, 0]
        }
      }
    ]
  };

  return (
    <div
      style={{
        backgroundColor: '#1e293b',
        borderRadius: '12px',
        padding: '20px',
        border: '1px solid #334155',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)'
      }}
    >
      <ReactECharts option={option} style={{ height: '360px', width: '100%' }} />
    </div>
  );
};

