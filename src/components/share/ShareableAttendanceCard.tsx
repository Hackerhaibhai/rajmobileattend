'use client';

import React from 'react';
import type { AttendanceRecord } from '@/types';
import { formatTime, formatHours, formatDate, getMonthName, getEmployeeShortId } from '@/lib/format';

interface ShareableAttendanceCardProps {
  month: string;
  records: AttendanceRecord[];
  show?: boolean;
}

export default function ShareableAttendanceCard({ month, records, show = true }: ShareableAttendanceCardProps) {
  if (!show) return null;

  const presentCount = records.filter((r) => r.status === 'present').length;
  const halfDayCount = records.filter((r) => r.status === 'half_day').length;
  const absentCount = records.filter((r) => r.status === 'absent').length;
  const totalHours = records.reduce((s, r) => s + (r.totalHours || 0), 0);

  // Group records by date
  const dateMap = new Map<string, AttendanceRecord[]>();
  records.forEach((r) => {
    const list = dateMap.get(r.date) || [];
    list.push(r);
    dateMap.set(r.date, list);
  });
  const sortedDates = Array.from(dateMap.keys()).sort((a, b) => b.localeCompare(a));

  return (
    <div
      id="shareable-attendance"
      style={{
        width: '600px',
        padding: '32px',
        backgroundColor: '#ffffff',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        color: '#1a1a1a',
      }}
    >
      {/* Header */}
      <div style={{ borderBottom: '3px solid #16a34a', paddingBottom: '16px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, margin: 0, color: '#1a1a1a' }}>
              📱 Raj Mobile Cover
            </h1>
            <p style={{ fontSize: '13px', color: '#666', margin: '2px 0 0 0' }}>Kukshi, Madhya Pradesh</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#16a34a' }}>
              {getMonthName(month)}
            </h2>
            <p style={{ fontSize: '12px', color: '#666', margin: '2px 0 0 0' }}>Attendance Report</p>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '20px' }}>
        {[
          { label: 'Present', value: presentCount.toString(), color: '#16a34a' },
          { label: 'Half Day', value: halfDayCount.toString(), color: '#f59e0b' },
          { label: 'Absent', value: absentCount.toString(), color: '#dc2626' },
          { label: 'Total Hours', value: formatHours(totalHours), color: '#0284c7' },
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
            <p style={{ fontSize: '20px', fontWeight: 800, margin: '4px 0 0 0', color: item.color }}>
              {item.value}
            </p>
          </div>
        ))}
      </div>

      {/* Daily Records */}
      {sortedDates.length > 0 ? (
        <div>
          {sortedDates.map((date) => {
            const dayRecords = dateMap.get(date)!;
            const dayHours = dayRecords.reduce((s, r) => s + (r.totalHours || 0), 0);
            return (
              <div key={date} style={{ marginBottom: '16px' }}>
                {/* Date Header */}
                <div
                  style={{
                    backgroundColor: '#f8f8f8',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    marginBottom: '4px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: '13px' }}>{formatDate(date)}</span>
                  <span style={{ fontSize: '12px', color: '#666' }}>
                    {dayRecords.length} employees · {formatHours(dayHours)} total
                  </span>
                </div>

                {/* Employee Rows */}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <tbody>
                    {dayRecords.map((r) => (
                      <tr key={r.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <td style={{ padding: '7px 12px', fontWeight: 600 }}>
                          {r.employee?.name || 'Unknown'}
                          <span style={{ color: '#aaa', fontSize: '10px', marginLeft: '6px' }}>
                            #{getEmployeeShortId(r.employeeId)}
                          </span>
                        </td>
                        <td style={{ padding: '7px 8px', textAlign: 'center', color: '#16a34a', fontWeight: 600 }}>
                          {r.checkIn ? formatTime(r.checkIn) : '--'}
                        </td>
                        <td style={{ padding: '7px 8px', textAlign: 'center', color: '#dc2626', fontWeight: 600 }}>
                          {r.checkOut ? formatTime(r.checkOut) : '--'}
                        </td>
                        <td style={{ padding: '7px 8px', textAlign: 'center', fontWeight: 600 }}>
                          {r.totalHours ? formatHours(r.totalHours) : '-'}
                        </td>
                        <td style={{ padding: '7px 12px', textAlign: 'right' }}>
                          <span
                            style={{
                              backgroundColor:
                                r.status === 'present'
                                  ? '#dcfce7'
                                  : r.status === 'half_day'
                                  ? '#fef3c7'
                                  : '#fee2e2',
                              color:
                                r.status === 'present'
                                  ? '#16a34a'
                                  : r.status === 'half_day'
                                  ? '#d97706'
                                  : '#dc2626',
                              padding: '2px 8px',
                              borderRadius: '10px',
                              fontSize: '10px',
                              fontWeight: 600,
                            }}
                          >
                            {r.status === 'half_day' ? 'Half' : r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '30px', color: '#999' }}>
          No attendance data for this month
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
