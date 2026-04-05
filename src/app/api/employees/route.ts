import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

const createEmployeeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  phone: z.string().min(1, 'Phone is required'),
  hourlyRate: z.union([z.number().min(0, 'Hourly rate must be non-negative'), z.string().transform((v) => parseFloat(v)).pipe(z.number().min(0))]),
  overtimeRate: z.union([z.number().min(0), z.string().transform((v) => parseFloat(v)).pipe(z.number().min(0))]).nullable().optional(),
  facePhoto: z.string().nullable().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';

    const employees = await db.employee.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(employees);
  } catch (error) {
    console.error('Error fetching employees:', error);
    return NextResponse.json(
      { error: 'Failed to fetch employees' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createEmployeeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const employee = await db.employee.create({
      data: {
        name: parsed.data.name,
        phone: parsed.data.phone,
        hourlyRate: typeof parsed.data.hourlyRate === 'string' ? parseFloat(parsed.data.hourlyRate) : parsed.data.hourlyRate,
        overtimeRate: parsed.data.overtimeRate != null ? (typeof parsed.data.overtimeRate === 'string' ? parseFloat(parsed.data.overtimeRate) : parsed.data.overtimeRate) : null,
        facePhoto: parsed.data.facePhoto || null,
      },
    });

    return NextResponse.json(employee, { status: 201 });
  } catch (error) {
    console.error('Error creating employee:', error);
    return NextResponse.json(
      { error: 'Failed to create employee' },
      { status: 500 }
    );
  }
}
