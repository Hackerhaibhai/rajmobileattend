import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

const updateAdjustmentSchema = z.object({
  type: z.enum(['bonus', 'penalty']).optional(),
  amount: z.number().min(0, 'Amount must be non-negative').optional(),
  reason: z.string().nullable().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = updateAdjustmentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const existing = await db.salaryAdjustment.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Adjustment not found' },
        { status: 404 }
      );
    }

    const updated = await db.salaryAdjustment.update({
      where: { id },
      data: parsed.data,
      include: { employee: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating adjustment:', error);
    return NextResponse.json(
      { error: 'Failed to update adjustment' },
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

    const existing = await db.salaryAdjustment.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: 'Adjustment not found' },
        { status: 404 }
      );
    }

    await db.salaryAdjustment.delete({ where: { id } });

    return NextResponse.json({ message: 'Adjustment deleted successfully' });
  } catch (error) {
    console.error('Error deleting adjustment:', error);
    return NextResponse.json(
      { error: 'Failed to delete adjustment' },
      { status: 500 }
    );
  }
}
