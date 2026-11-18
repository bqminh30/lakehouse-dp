import React from 'react';
import ReactECharts from 'echarts-for-react';
import { CategorySalesRecord } from '../types';

interface Props {
  data: CategorySalesRecord[];
}

export const CategoryPieChart: React.FC<Props> = ({ data }) => {
  const pieData = data.map((d) => ({
    name: `${d.category_name} (${d.department})`,
    value: d.total_revenue
  }));

  const option = {
    backgroundColor: 'transparent',
    title: {
      text: 'Revenue Share by Category',
      textStyle: { color: '#f8fafc', fontSize: 16, fontWeight: 600 },
      left: '0%'
    },
    tooltip: {
      trigger: 'item',
      backgroundColor: '#0f172a',
      borderColor: '#334155',
      textStyle: { color: '#f8fafc' },
      formatter: '{b}<br/>Revenue: <b>${c}</b> ({d}%)'
    },
    legend: {
      orient: 'vertical',
      right: '2%',
      top: 'center',
      textStyle: { color: '#94a3b8' }
    },
    series: [
      {
        name: 'Revenue',
        type: 'pie',
        radius: ['45%', '70%'],
        center: ['38%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 8,
          borderColor: '#1e293b',
          borderWidth: 2
        },
        label: {
          show: false,
          position: 'center'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 16,
            fontWeight: 'bold',
            color: '#f8fafc'
          }
        },
        data: pieData,
        color: ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4']
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

