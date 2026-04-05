import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

const checkInSchema = z.object({
  employeeId: z.string().min(1, 'Employee ID is required'),
  checkIn: z.string().regex(/^\d{2}:\d{2}$/, 'Check-in must be in HH:mm format'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  checkInPhoto: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    const date = searchParams.get('date');
    const month = searchParams.get('month');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const where: Record<string, unknown> = {};

    if (employeeId) {
      where.employeeId = employeeId;
    }

    if (date) {
      where.date = date;
    } else if (month) {
      where.date = { startsWith: month };
    } else if (from && to) {
      where.date = { gte: from, lte: to };
    }

    const records = await db.attendance.findMany({
      where,
      include: { employee: true },
      orderBy: [{ date: 'desc' }, { checkIn: 'desc' }],
    });

    return NextResponse.json(records);
  } catch (error) {
    console.error('Error fetching attendance records:', error);
    return NextResponse.json(
      { error: 'Failed to fetch attendance records' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = checkInSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { employeeId, checkIn, date, checkInPhoto } = parsed.data;

    // Check if employee exists and is active
    const employee = await db.employee.findUnique({ where: { id: employeeId } });
    if (!employee || !employee.isActive) {
      return NextResponse.json(
        { error: 'Employee not found or inactive' },
        { status: 404 }
      );
    }

    // Check if already checked in for this date
    const existingRecord = await db.attendance.findFirst({
      where: { employeeId, date },
    });

    if (existingRecord) {
      if (existingRecord.checkIn) {
        return NextResponse.json(
          { error: 'Employee already checked in for this date' },
          { status: 409 }
        );
      }

      // Update existing record with check-in
      const updated = await db.attendance.update({
        where: { id: existingRecord.id },
        data: {
          checkIn,
          status: 'present',
          checkInPhoto: checkInPhoto || null,
        },
        include: { employee: true },
      });

      return NextResponse.json(updated);
    }

    // Create new attendance record
    const record = await db.attendance.create({
      data: {
        employeeId,
        date,
        checkIn,
        status: 'present',
        checkInPhoto: checkInPhoto || null,
      },
      include: { employee: true },
    });

    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    console.error('Error checking in:', error);
    return NextResponse.json(
      { error: 'Failed to check in' },
      { status: 500 }
    );
  }
}
