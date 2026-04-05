import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

function getWeekRange(dateStr: string): { from: string; to: string } {
  const date = new Date(dateStr + 'T00:00:00');
  const day = date.getDay();
  // Monday = start of week
  const diff = day === 0 ? 6 : day - 1;
  const monday = new Date(date);
  monday.setDate(date.getDate() - diff);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const from = monday.toISOString().split('T')[0];
  const to = sunday.toISOString().split('T')[0];
  return { from, to };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const date = searchParams.get('date');
    const month = searchParams.get('month');

    if (!type) {
      return NextResponse.json(
        { error: 'Report type is required (daily, weekly, monthly)' },
        { status: 400 }
      );
    }

    if (type === 'monthly' && !month) {
      return NextResponse.json(
        { error: 'Month parameter is required for monthly reports (YYYY-MM)' },
        { status: 400 }
      );
    }

    if (type !== 'monthly' && !date) {
      return NextResponse.json(
        { error: 'Date parameter is required for daily/weekly reports (YYYY-MM-DD)' },
        { status: 400 }
      );
    }

    if (type === 'daily') {
      return handleDailyReport(date!);
    } else if (type === 'weekly') {
      return handleWeeklyReport(date!);
    } else if (type === 'monthly') {
      return handleMonthlyReport(month!);
    } else {
      return NextResponse.json(
        { error: 'Invalid report type. Use: daily, weekly, or monthly' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}

async function handleDailyReport(date: string) {
  const totalEmployees = await db.employee.count({ where: { isActive: true } });

  const records = await db.attendance.findMany({
    where: { date },
    include: { employee: true },
    orderBy: { checkIn: 'asc' },
  });

  const presentCount = records.filter((r) => r.status === 'present').length;
  const absentCount = totalEmployees - records.length;
  const halfDayCount = records.filter((r) => r.status === 'half_day').length;
  const totalHours = records.reduce((sum, r) => sum + (r.totalHours || 0), 0);

  const report = {
    date,
    totalEmployees,
    presentCount,
    absentCount,
    halfDayCount,
    totalHours: Math.round(totalHours * 100) / 100,
    records,
  };

  return NextResponse.json(report);
}

async function handleWeeklyReport(date: string) {
  const { from, to } = getWeekRange(date);
  const totalEmployees = await db.employee.count({ where: { isActive: true } });

  const records = await db.attendance.findMany({
    where: { date: { gte: from, lte: to } },
    include: { employee: true },
    orderBy: [{ date: 'desc' }, { checkIn: 'asc' }],
  });

  const presentCount = records.filter((r) => r.status === 'present').length;
  const halfDayCount = records.filter((r) => r.status === 'half_day').length;
  const totalHours = records.reduce((sum, r) => sum + (r.totalHours || 0), 0);

  // Group by date for summary
  const dailyBreakdown: Record<string, number> = {};
  for (const r of records) {
    dailyBreakdown[r.date] = (dailyBreakdown[r.date] || 0) + (r.totalHours || 0);
  }

  const report = {
    weekStart: from,
    weekEnd: to,
    totalEmployees,
    totalRecords: records.length,
    presentCount,
    halfDayCount,
    totalHours: Math.round(totalHours * 100) / 100,
    dailyBreakdown,
    records,
  };

  return NextResponse.json(report);
}

async function handleMonthlyReport(month: string) {
  const totalEmployees = await db.employee.count({ where: { isActive: true } });

  const records = await db.attendance.findMany({
    where: { date: { startsWith: month } },
    include: { employee: true },
    orderBy: [{ date: 'desc' }, { checkIn: 'asc' }],
  });

  const presentCount = records.filter((r) => r.status === 'present').length;
  const halfDayCount = records.filter((r) => r.status === 'half_day').length;
  const totalHours = records.reduce((sum, r) => sum + (r.totalHours || 0), 0);

  // Employee-level breakdown
  const employeeBreakdown: Record<string, {
    employeeName: string;
    daysWorked: number;
    totalHours: number;
  }> = {};

  for (const r of records) {
    if (!employeeBreakdown[r.employeeId]) {
      employeeBreakdown[r.employeeId] = {
        employeeName: r.employee.name,
        daysWorked: 0,
        totalHours: 0,
      };
    }
    if (r.status === 'present' || r.status === 'half_day') {
      employeeBreakdown[r.employeeId].daysWorked++;
    }
    employeeBreakdown[r.employeeId].totalHours += r.totalHours || 0;
  }

  // Round employee breakdown values
  for (const key of Object.keys(employeeBreakdown)) {
    employeeBreakdown[key].totalHours = Math.round(employeeBreakdown[key].totalHours * 100) / 100;
  }

  const report = {
    month,
    totalEmployees,
    totalRecords: records.length,
    presentCount,
    halfDayCount,
    totalHours: Math.round(totalHours * 100) / 100,
    employeeBreakdown,
    records,
  };

  return NextResponse.json(report);
}
