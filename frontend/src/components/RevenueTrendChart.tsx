import React from 'react';
import ReactECharts from 'echarts-for-react';
import { DailySalesRecord } from '../types';

interface Props {
  data: DailySalesRecord[];
}

export const RevenueTrendChart: React.FC<Props> = ({ data }) => {
  const dates = data.map((d) => d.order_date);
  const revenues = data.map((d) => d.total_revenue);
  const orders = data.map((d) => d.total_orders);

  const option = {
    backgroundColor: 'transparent',
    title: {
      text: 'Daily Revenue & Order Volume',
      textStyle: { color: '#f8fafc', fontSize: 16, fontWeight: 600 },
      left: '0%'
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'cross', crossStyle: { color: '#94a3b8' } },
      backgroundColor: '#0f172a',
      borderColor: '#334155',
      textStyle: { color: '#f8fafc' }
    },
    legend: {
      data: ['Daily Revenue ($)', 'Order Count'],
      textStyle: { color: '#94a3b8' },
      right: '0%'
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: [
      {
        type: 'category',
        data: dates,
        axisPointer: { type: 'shadow' },
        axisLine: { lineStyle: { color: '#475569' } },
        axisLabel: { color: '#94a3b8', rotate: 30 }
      }
    ],
    yAxis: [
      {
        type: 'value',
        name: 'Revenue ($)',
        nameTextStyle: { color: '#94a3b8' },
        splitLine: { lineStyle: { color: '#334155', type: 'dashed' } },
        axisLabel: { color: '#94a3b8', formatter: '${value}' }
      },
      {
        type: 'value',
        name: 'Orders',
        nameTextStyle: { color: '#94a3b8' },
        minInterval: 1,
        splitLine: { show: false },
        axisLabel: { color: '#94a3b8' }
      }
    ],
    series: [
      {
        name: 'Daily Revenue ($)',
        type: 'bar',
        data: revenues,
        itemStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: '#3b82f6' },
              { offset: 1, color: '#1d4ed8' }
            ]
          },
          borderRadius: [4, 4, 0, 0]
        }
      },
      {
        name: 'Order Count',
        type: 'line',
        yAxisIndex: 1,
        data: orders,
        smooth: true,
        lineStyle: { width: 3, color: '#10b981' },
        itemStyle: { color: '#10b981' }
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

