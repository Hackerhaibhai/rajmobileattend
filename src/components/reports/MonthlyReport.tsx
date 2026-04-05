'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import type { DailyReport } from '@/types';
import { formatHours, getMonthName } from '@/lib/format';
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  TrendingUp,
  Clock,
  Users,
  BarChart3,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { addMonths, subMonths, format, startOfMonth, endOfMonth, eachDayOfInterval, isWeekend } from 'date-fns';
import dynamic from 'next/dynamic';
import ShareButtons from '@/components/share/ShareButtons';

const ShareableAttendanceCard = dynamic(
  () => import('@/components/share/ShareableAttendanceCard').then((m) => m.default),
  { ssr: false }
);

export default function MonthlyReport() {
  const [selectedMonth, setSelectedMonth] = useState(() => startOfMonth(new Date()));
  const [report, setReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(true);

  const monthStr = format(selectedMonth, 'yyyy-MM');
  const title = `Attendance-Report-${monthStr}`;

  const fetchReport = useCallback(async (month: Date) => {
    try {
      setLoading(true);
      const mStr = format(month, 'yyyy-MM');
      const res = await fetch(`/api/reports?type=monthly&month=${mStr}`);
      if (res.ok) {
        const data = await res.json();
        setReport(data);
      }
    } catch (error) {
      console.error('Failed to fetch monthly report:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReport(selectedMonth);
  }, [selectedMonth, fetchReport]);

  const prevMonth = () => setSelectedMonth((d) => subMonths(d, 1));
  const nextMonth = () => {
    const now = new Date();
    const next = addMonths(selectedMonth, 1);
    if (next <= startOfMonth(now)) {
      setSelectedMonth(next);
    }
  };

  const dailyData = (() => {
    if (!report?.records) return [];
    const daysInMonth = eachDayOfInterval({
      start: startOfMonth(selectedMonth),
      end: endOfMonth(selectedMonth),
    });

    return daysInMonth.map((day) => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dayRecords = report.records.filter((r) => r.date === dateStr);
      const totalH = dayRecords.reduce((sum, r) => sum + (r.totalHours || 0), 0);
      return {
        day: format(day, 'd'),
        date: dateStr,
        hours: Math.round(totalH * 10) / 10,
        isWeekend: isWeekend(day),
      };
    });
  })();

  const totalDays = dailyData.filter((d) => !d.isWeekend && d.hours > 0).length;
  const totalHrs = dailyData.reduce((sum, d) => sum + d.hours, 0);
  const avgHrs = totalDays > 0 ? totalHrs / totalDays : 0;

  const isCurrentMonth = monthStr === format(new Date(), 'yyyy-MM');

  return (
    <div className="space-y-4 p-4 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Monthly Report</h1>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between bg-muted/50 rounded-xl p-3">
        <Button variant="ghost" size="icon" onClick={prevMonth} className="h-10 w-10 rounded-xl">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="text-center">
          <p className="font-bold text-base">{getMonthName(monthStr)}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={nextMonth}
          className="h-10 w-10 rounded-xl"
          disabled={isCurrentMonth}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Summary Cards */}
      {loading ? (
        <div className="grid grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <CalendarDays className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Working Days</span>
            </div>
            <p className="text-xl font-bold">{report?.presentCount ?? totalDays}</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-emerald-600" />
              <span className="text-xs text-muted-foreground">Total Hours</span>
            </div>
            <p className="text-xl font-bold">{formatHours(report?.totalHours ?? totalHrs)}</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-4 w-4 text-amber-600" />
              <span className="text-xs text-muted-foreground">Avg/Day</span>
            </div>
            <p className="text-xl font-bold">{formatHours(avgHrs)}</p>
          </Card>
        </div>
      )}

      {/* Share Button */}
      {!loading && report?.records && report.records.length > 0 && (
        <ShareButtons elementId="shareable-attendance" title={title} />
      )}

      {/* Daily Hours Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Daily Hours
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-48 rounded-lg" />
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis
                    dataKey="day"
                    fontSize={10}
                    tickLine={false}
                    interval={dailyData.length > 15 ? 2 : 0}
                  />
                  <YAxis fontSize={10} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--card)',
                    }}
                    formatter={(value: number) => [`${value}h`, 'Hours']}
                    labelFormatter={(label) => {
                      const item = dailyData.find((d) => d.day === label);
                      return item ? item.date : label;
                    }}
                  />
                  <Bar
                    dataKey="hours"
                    fill="var(--primary)"
                    radius={[2, 2, 0, 0]}
                    maxBarSize={16}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Employee Breakdown */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Employee Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-14 rounded-lg" />
              ))}
            </div>
          ) : !report?.records || report.records.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Is mahine ke liye koi data nahi hai
            </p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar">
              {(() => {
                const employeeMap = new Map<string, { name: string; totalHours: number; days: number; photo: string | null }>();
                report.records.forEach((r) => {
                  const emp = r.employee;
                  const key = r.employeeId;
                  const existing = employeeMap.get(key);
                  if (existing) {
                    existing.totalHours += r.totalHours || 0;
                    if (r.totalHours && r.totalHours > 0) existing.days++;
                  } else {
                    employeeMap.set(key, {
                      name: emp?.name || 'Unknown',
                      totalHours: r.totalHours || 0,
                      days: r.totalHours && r.totalHours > 0 ? 1 : 0,
                      photo: emp?.facePhoto || null,
                    });
                  }
                });
                return Array.from(employeeMap.entries()).map(([id, data]) => (
                  <div key={id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    {data.photo ? (
                      <img src={data.photo} alt={data.name} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-primary font-semibold text-sm">{data.name.charAt(0)}</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{data.name}</p>
                      <p className="text-xs text-muted-foreground">{data.days} days</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm">{formatHours(data.totalHours)}</p>
                      <p className="text-xs text-muted-foreground">total</p>
                    </div>
                  </div>
                ));
              })()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hidden Shareable Card */}
      <div style={{ position: 'fixed', left: '-9999px', top: 0, zIndex: -1 }}>
        <ShareableAttendanceCard
          month={monthStr}
          records={report?.records || []}
          show={!!report?.records && report.records.length > 0}
        />
      </div>
    </div>
  );
}
