import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

const createAdjustmentSchema = z.object({
  employeeId: z.string().min(1, 'Employee ID is required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  type: z.enum(['bonus', 'penalty']),
  amount: z.number().min(0, 'Amount must be non-negative'),
  reason: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employeeId');
    const month = searchParams.get('month');

    const where: Record<string, unknown> = {};

    if (employeeId) {
      where.employeeId = employeeId;
    }

    if (month) {
      where.date = { startsWith: month };
    }

    const adjustments = await db.salaryAdjustment.findMany({
      where,
      include: { employee: true },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json(adjustments);
  } catch (error) {
    console.error('Error fetching adjustments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch adjustments' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createAdjustmentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { employeeId } = parsed.data;

    // Check employee exists
    const employee = await db.employee.findUnique({ where: { id: employeeId } });
    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    const adjustment = await db.salaryAdjustment.create({
      data: parsed.data,
      include: { employee: true },
    });

    return NextResponse.json(adjustment, { status: 201 });
  } catch (error) {
    console.error('Error creating adjustment:', error);
    return NextResponse.json(
      { error: 'Failed to create adjustment' },
      { status: 500 }
    );
  }
}
