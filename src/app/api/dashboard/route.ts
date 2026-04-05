import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { splitHours } from '@/lib/hours';

export async function GET() {
  try {
    // Active employees count
    const activeEmployees = await db.employee.count({
      where: { isActive: true },
    });

    // Today's date in YYYY-MM-DD
    const today = new Date().toISOString().split('T')[0];

    // Checked-in today: has checkIn but no checkOut
    const checkedInToday = await db.attendance.count({
      where: {
        date: today,
        checkIn: { not: null },
        checkOut: null,
      },
    });

    // Total hours today
    const todayRecords = await db.attendance.findMany({
      where: {
        date: today,
        totalHours: { not: null },
      },
    });

    const totalHoursToday = todayRecords.reduce(
      (sum, r) => sum + (r.totalHours || 0),
      0
    );

    // Pending salary for current month
    const currentMonth = today.substring(0, 7); // YYYY-MM

    const activeEmployeeList = await db.employee.findMany({
      where: { isActive: true },
    });

    let pendingSalary = 0;

    for (const employee of activeEmployeeList) {
      const monthAttendance = await db.attendance.findMany({
        where: {
          employeeId: employee.id,
          date: { startsWith: currentMonth },
        },
      });

      const totalHours = monthAttendance.reduce(
        (sum, r) => sum + (r.totalHours || 0),
        0
      );

      const { regular, overtime } = splitHours(totalHours);
      const regularPay = regular * employee.hourlyRate;
      const overtimeRate = employee.overtimeRate || employee.hourlyRate * 1.5;
      const overtimePay = overtime * overtimeRate;

      const monthAdjustments = await db.salaryAdjustment.findMany({
        where: {
          employeeId: employee.id,
          date: { startsWith: currentMonth },
        },
      });

      const bonusTotal = monthAdjustments
        .filter((a) => a.type === 'bonus')
        .reduce((sum, a) => sum + a.amount, 0);

      const penaltyTotal = monthAdjustments
        .filter((a) => a.type === 'penalty')
        .reduce((sum, a) => sum + a.amount, 0);

      pendingSalary += regularPay + overtimePay + bonusTotal - penaltyTotal;
    }

    pendingSalary = Math.round(pendingSalary * 100) / 100;

    const stats = {
      activeEmployees,
      checkedInToday,
      totalHoursToday: Math.round(totalHoursToday * 100) / 100,
      pendingSalary,
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
}
