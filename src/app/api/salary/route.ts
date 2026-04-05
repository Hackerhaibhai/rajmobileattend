import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { splitHours } from '@/lib/hours';

const salaryQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format'),
  employeeId: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const employeeId = searchParams.get('employeeId');

    if (!month) {
      return NextResponse.json(
        { error: 'Month query parameter is required (YYYY-MM)' },
        { status: 400 }
      );
    }

    const parsedQuery = salaryQuerySchema.safeParse({ month, employeeId: employeeId || undefined });
    if (!parsedQuery.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: parsedQuery.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const employeeWhere = employeeId ? { id: employeeId } : { isActive: true };

    const employees = await db.employee.findMany({
      where: employeeWhere,
    });

    const salaryResults = [];

    for (const employee of employees) {
      // Get attendance records for the month
      const attendanceRecords = await db.attendance.findMany({
        where: {
          employeeId: employee.id,
          date: { startsWith: month },
        },
      });

      // Get adjustments for the month
      const adjustments = await db.salaryAdjustment.findMany({
        where: {
          employeeId: employee.id,
          date: { startsWith: month },
        },
      });

      // Calculate totals
      const daysWorked = attendanceRecords.filter(
        (r) => r.status === 'present' || r.status === 'half_day'
      ).length;

      const totalHours = attendanceRecords.reduce(
        (sum, r) => sum + (r.totalHours || 0),
        0
      );

      const { regular, overtime } = splitHours(totalHours);

      const regularPay = regular * employee.hourlyRate;
      const overtimeRate = employee.overtimeRate || employee.hourlyRate * 1.5;
      const overtimePay = overtime * overtimeRate;

      const bonusTotal = adjustments
        .filter((a) => a.type === 'bonus')
        .reduce((sum, a) => sum + a.amount, 0);

      const penaltyTotal = adjustments
        .filter((a) => a.type === 'penalty')
        .reduce((sum, a) => sum + a.amount, 0);

      const adjustmentNet = bonusTotal - penaltyTotal;
      const totalSalary = Math.round((regularPay + overtimePay + adjustmentNet) * 100) / 100;

      salaryResults.push({
        employeeId: employee.id,
        employeeName: employee.name,
        employeePhoto: employee.facePhoto,
        totalHours: Math.round(totalHours * 100) / 100,
        regularHours: regular,
        overtimeHours: overtime,
        regularPay: Math.round(regularPay * 100) / 100,
        overtimePay: Math.round(overtimePay * 100) / 100,
        adjustments: Math.round(adjustmentNet * 100) / 100,
        totalSalary,
        daysWorked,
      });
    }

    return NextResponse.json(salaryResults);
  } catch (error) {
    console.error('Error calculating salary:', error);
    return NextResponse.json(
      { error: 'Failed to calculate salary' },
      { status: 500 }
    );
  }
}
