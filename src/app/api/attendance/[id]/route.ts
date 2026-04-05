import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';
import { calculateHours } from '@/lib/hours';

const checkOutSchema = z.object({
  checkOut: z.string().regex(/^\d{2}:\d{2}$/, 'Check-out must be in HH:mm format'),
  checkOutPhoto: z.string().optional(),
  notes: z.string().optional(),
});

const editAttendanceSchema = z.object({
  status: z.enum(['present', 'absent', 'half_day']).optional(),
  checkIn: z.string().regex(/^\d{2}:\d{2}$/, 'Check-in must be in HH:mm format').nullable().optional(),
  checkOut: z.string().regex(/^\d{2}:\d{2}$/, 'Check-out must be in HH:mm format').nullable().optional(),
  totalHours: z.number().min(0).nullable().optional(),
  notes: z.string().nullable().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const record = await db.attendance.findUnique({
      where: { id },
      include: { employee: true },
    });

    if (!record) {
      return NextResponse.json(
        { error: 'Attendance record not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(record);
  } catch (error) {
    console.error('Error fetching attendance record:', error);
    return NextResponse.json(
      { error: 'Failed to fetch attendance record' },
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

    const existing = await db.attendance.findUnique({
      where: { id },
      include: { employee: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Attendance record not found' },
        { status: 404 }
      );
    }

    // Determine if this is a check-out or an edit
    const isCheckOut = body.checkOut && body.checkIn === undefined && body.status === undefined && body.totalHours === undefined;

    if (isCheckOut) {
      // Check-out flow
      const parsed = checkOutSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
          { status: 400 }
        );
      }

      if (!existing.checkIn) {
        return NextResponse.json(
          { error: 'Employee has not checked in yet' },
          { status: 400 }
        );
      }

      if (existing.checkOut) {
        return NextResponse.json(
          { error: 'Employee already checked out' },
          { status: 409 }
        );
      }

      const totalHours = calculateHours(existing.checkIn, parsed.data.checkOut);

      const updated = await db.attendance.update({
        where: { id },
        data: {
          checkOut: parsed.data.checkOut,
          totalHours,
          checkOutPhoto: parsed.data.checkOutPhoto || null,
          notes: parsed.data.notes || null,
        },
        include: { employee: true },
      });

      return NextResponse.json(updated);
    }

    // Edit flow
    const parsed = editAttendanceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};

    if (parsed.data.status !== undefined) updateData.status = parsed.data.status;
    if (parsed.data.checkIn !== undefined) updateData.checkIn = parsed.data.checkIn;
    if (parsed.data.checkOut !== undefined) updateData.checkOut = parsed.data.checkOut;
    if (parsed.data.notes !== undefined) updateData.notes = parsed.data.notes;

    // Auto-calculate totalHours if checkIn and checkOut are provided
    if (parsed.data.checkIn && parsed.data.checkOut) {
      updateData.totalHours = calculateHours(parsed.data.checkIn, parsed.data.checkOut);
    } else if (parsed.data.totalHours !== undefined) {
      updateData.totalHours = parsed.data.totalHours;
    }

    const updated = await db.attendance.update({
      where: { id },
      data: updateData,
      include: { employee: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating attendance record:', error);
    return NextResponse.json(
      { error: 'Failed to update attendance record' },
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

    const existing = await db.attendance.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Attendance record not found' },
        { status: 404 }
      );
    }

    await db.attendance.delete({ where: { id } });

    return NextResponse.json({ message: 'Attendance record deleted successfully' });
  } catch (error) {
    console.error('Error deleting attendance record:', error);
    return NextResponse.json(
      { error: 'Failed to delete attendance record' },
      { status: 500 }
    );
  }
}
