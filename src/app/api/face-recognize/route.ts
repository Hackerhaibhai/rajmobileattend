import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import ZAI from 'z-ai-web-dev-sdk';
import { z } from 'zod';

const recognizeSchema = z.object({
  photo: z.string().min(100, 'Photo data is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = recognizeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { photo } = parsed.data;

    // Fetch all active employees that have a registered face photo
    const employees = await db.employee.findMany({
      where: {
        isActive: true,
        facePhoto: { not: null },
      },
      select: {
        id: true,
        name: true,
        facePhoto: true,
      },
    });

    if (employees.length === 0) {
      return NextResponse.json(
        { error: 'No employees with registered face photos found. Please register faces first.' },
        { status: 404 }
      );
    }

    // Build the VLM prompt with all registered employee photos
    const employeeList = employees
      .map((emp, i) => `Person ${i + 1}: ${emp.name} (ID: ${emp.id})`)
      .join('\n');

    const content: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
      {
        type: 'text',
        text: `You are a face recognition system. I will show you multiple registered face photos and then one captured photo.

REGISTERED EMPLOYEES:
${employeeList}

Each image below is labeled. Look at the LAST image carefully — it is the person who just arrived. Match their face against the registered photos above.

IMPORTANT: Respond with ONLY a JSON object in this exact format:
{"matched": true, "employeeId": "the_exact_id", "employeeName": "the_name", "confidence": "high/medium/low"}

If the face does NOT match any registered employee, respond with:
{"matched": false, "employeeId": null, "employeeName": null, "confidence": "none"}

Do NOT add any explanation. Just the JSON.`,
      },
    ];

    // Add each registered employee photo
    for (const emp of employees) {
      if (emp.facePhoto) {
        content.push({
          type: 'image_url',
          image_url: { url: emp.facePhoto },
        });
      }
    }

    // Add the captured photo as the last image
    content.push({
      type: 'text',
      text: 'The image below is the person who just arrived for check-in:',
    });
    content.push({
      type: 'image_url',
      image_url: { url: photo },
    });

    // Call VLM for face recognition
    const zai = await ZAI.create();
    const response = await zai.chat.completions.createVision({
      messages: [
        {
          role: 'user',
          content,
        },
      ],
      thinking: { type: 'disabled' },
    });

    const rawResponse = response.choices[0]?.message?.content || '';

    // Parse the response
    try {
      // Try to extract JSON from the response
      const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      const result = JSON.parse(jsonMatch[0]);

      if (!result.matched) {
        return NextResponse.json({
          matched: false,
          employeeId: null,
          employeeName: null,
          confidence: 'none',
          message: 'Face not recognized. Please try again or use manual check-in.',
        });
      }

      // Verify the matched employee actually exists
      const matchedEmployee = employees.find((e) => e.id === result.employeeId);
      if (!matchedEmployee) {
        return NextResponse.json({
          matched: false,
          employeeId: null,
          employeeName: null,
          confidence: 'none',
          message: 'Face recognized but employee record not found.',
        });
      }

      return NextResponse.json({
        matched: true,
        employeeId: matchedEmployee.id,
        employeeName: matchedEmployee.name,
        employeePhone: (await db.employee.findUnique({
          where: { id: matchedEmployee.id },
          select: { phone: true, hourlyRate: true },
        }))?.hourlyRate,
        confidence: result.confidence || 'medium',
        message: `Face recognized! ${matchedEmployee.name}`,
      });
    } catch (parseError) {
      console.error('Failed to parse VLM response:', rawResponse);
      return NextResponse.json(
        {
          matched: false,
          employeeId: null,
          employeeName: null,
          confidence: 'none',
          message: 'Face recognition failed. Could not process the result.',
        },
        { status: 422 }
      );
    }
  } catch (error) {
    console.error('Face recognition error:', error);
    return NextResponse.json(
      { error: 'Face recognition failed. Please try again.' },
      { status: 500 }
    );
  }
}
