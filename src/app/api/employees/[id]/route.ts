import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

const updateEmployeeSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  phone: z.string().min(1, 'Phone is required').optional(),
  hourlyRate: z.union([z.number().min(0), z.string().transform((v) => parseFloat(v)).pipe(z.number().min(0))]).optional(),
  overtimeRate: z.union([z.number().min(0), z.string().transform((v) => parseFloat(v)).pipe(z.number().min(0))]).nullable().optional(),
  facePhoto: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const employee = await db.employee.findUnique({
      where: { id },
    });

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(employee);
  } catch (error) {
    console.error('Error fetching employee:', error);
    return NextResponse.json(
      { error: 'Failed to fetch employee' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateEmployeeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Check employee exists
    const existing = await db.employee.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
    if (parsed.data.phone !== undefined) updateData.phone = parsed.data.phone;
    if (parsed.data.hourlyRate !== undefined) updateData.hourlyRate = typeof parsed.data.hourlyRate === 'string' ? parseFloat(parsed.data.hourlyRate) : parsed.data.hourlyRate;
    if (parsed.data.overtimeRate !== undefined) updateData.overtimeRate = parsed.data.overtimeRate != null ? (typeof parsed.data.overtimeRate === 'string' ? parseFloat(parsed.data.overtimeRate) : parsed.data.overtimeRate) : null;
    if (parsed.data.facePhoto !== undefined) updateData.facePhoto = parsed.data.facePhoto;
    if (parsed.data.isActive !== undefined) updateData.isActive = parsed.data.isActive;

    const employee = await db.employee.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(employee);
  } catch (error) {
    console.error('Error updating employee:', error);
    return NextResponse.json(
      { error: 'Failed to update employee' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.employee.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    await db.employee.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ message: 'Employee deactivated successfully' });
  } catch (error) {
    console.error('Error deactivating employee:', error);
    return NextResponse.json(
      { error: 'Failed to deactivate employee' },
      { status: 500 }
    );
  }
}
