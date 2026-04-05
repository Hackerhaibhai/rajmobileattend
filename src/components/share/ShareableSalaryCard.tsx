'use client';

import React from 'react';
import type { EmployeeSalary } from '@/types';
import { formatCurrency, formatHours, getMonthName } from '@/lib/format';

interface ShareableSalaryCardProps {
  month: string;
  salaries: EmployeeSalary[];
  show?: boolean; // only render when visible for capture
}

export default function ShareableSalaryCard({ month, salaries, show = true }: ShareableSalaryCardProps) {
  if (!show) return null;

  const totalRegular = salaries.reduce((s, e) => s + e.regularPay, 0);
  const totalOvertime = salaries.reduce((s, e) => s + e.overtimePay, 0);
  const totalAdj = salaries.reduce((s, e) => s + e.adjustments, 0);
  const grandTotal = salaries.reduce((s, e) => s + e.totalSalary, 0);
  const totalDays = salaries.reduce((s, e) => s + e.daysWorked, 0);
  const totalHrs = salaries.reduce((s, e) => s + e.totalHours, 0);

  return (
    <div
      id="shareable-report"
      style={{
        width: '600px',
        padding: '32px',
        backgroundColor: '#ffffff',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        color: '#1a1a1a',
      }}
    >
      {/* Header */}
      <div style={{ borderBottom: '3px solid #f97316', paddingBottom: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0, color: '#1a1a1a' }}>
              📱 Raj Mobile Cover
            </h1>
            <p style={{ fontSize: '13px', color: '#666', margin: '2px 0 0 0' }}>Kukshi, Madhya Pradesh</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#f97316' }}>
              {getMonthName(month)}
            </h2>
            <p style={{ fontSize: '12px', color: '#666', margin: '2px 0 0 0' }}>Monthly Salary Report</p>
          </div>
        </div>
      </div>

      {/* Summary Boxes */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '20px' }}>
        {[
          { label: 'Employees', value: salaries.length.toString(), color: '#f97316' },
          { label: 'Days Worked', value: totalDays.toString(), color: '#16a34a' },
          { label: 'Total Hours', value: formatHours(totalHrs), color: '#0284c7' },
          { label: 'Grand Total', value: formatCurrency(grandTotal), color: '#dc2626' },
        ].map((item) => (
          <div
            key={item.label}
            style={{
              backgroundColor: `${item.color}10`,
              border: `1px solid ${item.color}30`,
              borderRadius: '10px',
              padding: '10px',
              textAlign: 'center',
            }}
          >
            <p style={{ fontSize: '11px', color: '#666', margin: 0, textTransform: 'uppercase', fontWeight: 600 }}>
              {item.label}
            </p>
            <p style={{ fontSize: '18px', fontWeight: 800, margin: '4px 0 0 0', color: item.color }}>
              {item.value}
            </p>
          </div>
        ))}
      </div>

      {/* Employee Table */}
      {salaries.length > 0 ? (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f97316', color: '#fff' }}>
              <th style={{ padding: '10px 8px', textAlign: 'left', borderRadius: '8px 0 0 0', fontWeight: 600 }}>#</th>
              <th style={{ padding: '10px 8px', textAlign: 'left', fontWeight: 600 }}>Employee</th>
              <th style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 600 }}>Days</th>
              <th style={{ padding: '10px 8px', textAlign: 'center', fontWeight: 600 }}>Hours</th>
              <th style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 600 }}>Regular</th>
              <th style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 600 }}>OT Pay</th>
              <th style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 600 }}>Adj.</th>
              <th style={{ padding: '10px 8px', textAlign: 'right', borderRadius: '0 8px 0 0', fontWeight: 700 }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {salaries.map((s, i) => (
              <tr
                key={s.employeeId}
                style={{
                  backgroundColor: i % 2 === 0 ? '#fff' : '#fafafa',
                  borderBottom: '1px solid #eee',
                }}
              >
                <td style={{ padding: '9px 8px', fontWeight: 600, color: '#999' }}>{i + 1}</td>
                <td style={{ padding: '9px 8px', fontWeight: 600 }}>
                  {s.employeeName}
                </td>
                <td style={{ padding: '9px 8px', textAlign: 'center' }}>{s.daysWorked}</td>
                <td style={{ padding: '9px 8px', textAlign: 'center' }}>{formatHours(s.totalHours)}</td>
                <td style={{ padding: '9px 8px', textAlign: 'right' }}>{formatCurrency(s.regularPay)}</td>
                <td style={{ padding: '9px 8px', textAlign: 'right', color: s.overtimePay > 0 ? '#f97316' : '#999' }}>
                  {s.overtimePay > 0 ? formatCurrency(s.overtimePay) : '-'}
                </td>
                <td style={{ padding: '9px 8px', textAlign: 'right', color: s.adjustments > 0 ? '#16a34a' : s.adjustments < 0 ? '#dc2626' : '#999', fontWeight: 600 }}>
                  {s.adjustments !== 0 ? `${s.adjustments > 0 ? '+' : ''}${formatCurrency(s.adjustments)}` : '-'}
                </td>
                <td style={{ padding: '9px 8px', textAlign: 'right', fontWeight: 700, color: '#1a1a1a' }}>
                  {formatCurrency(s.totalSalary)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ backgroundColor: '#1a1a1a', color: '#fff' }}>
              <td colSpan={4} style={{ padding: '12px 8px', fontWeight: 700, borderRadius: '0 0 0 8px' }}>
                Total ({salaries.length} employees)
              </td>
              <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 600 }}>
                {formatCurrency(totalRegular)}
              </td>
              <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 600 }}>
                {formatCurrency(totalOvertime)}
              </td>
              <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 600, color: totalAdj >= 0 ? '#86efac' : '#fca5a5' }}>
                {totalAdj !== 0 ? `${totalAdj > 0 ? '+' : ''}${formatCurrency(totalAdj)}` : '-'}
              </td>
              <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 800, fontSize: '16px', borderRadius: '0 0 8px 0', color: '#f97316' }}>
                {formatCurrency(grandTotal)}
              </td>
            </tr>
          </tfoot>
        </table>
      ) : (
        <div style={{ textAlign: 'center', padding: '30px', color: '#999' }}>
          No data for this month
        </div>
      )}

      {/* Footer */}
      <div style={{ marginTop: '20px', paddingTop: '12px', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ fontSize: '11px', color: '#999', margin: 0 }}>
          Generated on {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </p>
        <p style={{ fontSize: '11px', color: '#999', margin: 0 }}>
          Raj Mobile Cover Kukshi © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
