import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { generateMedicalDocumentHtml } from '@/lib/pdf';
import { uploadToR2 } from '@/lib/r2';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const result = await pool.query(
      `SELECT ps.*
       FROM patient_sessions ps
       WHERE ps.id = $1
       ORDER BY ps.created_at DESC`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ session: result.rows[0] });
  } catch (error) {
    console.error('Error fetching session:', error);
    return NextResponse.json(
      { error: 'Failed to fetch session' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      transcript,
      summary,
      examinationResults, // New field
      diagnosis,
      prescription,
      treatmentPlan,      // New field
      doctorNotes,
    } = body;

    // Start a transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update session details
      if (transcript !== undefined || summary !== undefined || 
          examinationResults !== undefined || // Added check
          diagnosis !== undefined || prescription !== undefined || 
          treatmentPlan !== undefined ||      // Added check
          doctorNotes !== undefined) {
        const updateFields = [];
        const values = [];
        let paramCount = 1;

        if (transcript !== undefined) {
          updateFields.push(`transcript = $${paramCount}`);
          values.push(transcript);
          paramCount++;
        }
        if (summary !== undefined) {
          updateFields.push(`summary = $${paramCount}`);
          values.push(summary);
          paramCount++;
        }
        if (examinationResults !== undefined) { // Added field
          updateFields.push(`examination_results = $${paramCount}`);
          values.push(examinationResults);
          paramCount++;
        }
        if (diagnosis !== undefined) {
          updateFields.push(`final_diagnosis = $${paramCount}`);
          values.push(diagnosis);
          paramCount++;
        }
        if (prescription !== undefined) {
          updateFields.push(`final_prescription = $${paramCount}`);
          values.push(prescription);
          paramCount++;
        }
        if (treatmentPlan !== undefined) { // Added field
          updateFields.push(`treatment_plan = $${paramCount}`);
          values.push(treatmentPlan);
          paramCount++;
        }
        if (doctorNotes !== undefined) {
          updateFields.push(`doctor_notes = $${paramCount}`);
          values.push(doctorNotes);
          paramCount++;
        }

        if (updateFields.length > 0) {
          await client.query(
            `UPDATE patient_sessions 
             SET ${updateFields.join(', ')}
             WHERE id = $${paramCount}`,
            [...values, id]
          );
          console.log('Updated session details');
        }
      }

      // Get the updated session data
      const sessionResult = await client.query(
        `SELECT name, age, summary, examination_results, final_diagnosis as diagnosis, 
                final_prescription as prescription, treatment_plan, doctor_notes
         FROM patient_sessions
         WHERE id = $1`,
        [id]
      );

      if (sessionResult.rows.length === 0) {
        throw new Error('Session not found after update');
      }

      const session = sessionResult.rows[0];

      // Generate new document
      const documentHtml = generateMedicalDocumentHtml({
        patientName: session.name,
        patientAge: session.age.toString(),
        date: new Date().toLocaleDateString(),
        summary: session.summary || '',
        examinationResults: session.examination_results || '', // New field
        diagnosis: session.diagnosis || '',
        prescription: session.prescription || '',
        treatmentPlan: session.treatment_plan || '', // New field
        doctorNotes: session.doctor_notes || '',
      });

      // Upload to R2
      const documentUrl = await uploadToR2(
        new Blob([documentHtml], { type: 'text/html' }),
        `documents/${userId}/${id}.html`,
        'text/html'
      );

      console.log('Document URL:', documentUrl);

      // Update document URL in database
      await client.query(
        `UPDATE patient_sessions 
         SET document_url = $1
         WHERE id = $2`,
        [documentUrl, id]
      );

      await client.query('COMMIT');

      return NextResponse.json({ 
        success: true,
        documentUrl 
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error updating session:', error);
    return NextResponse.json(
      { error: 'Failed to update session' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Get userId from request body
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Verify the session belongs to the user and delete it
    const result = await pool.query(
      `DELETE FROM patient_sessions
       WHERE id = $1
       RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Session not found or access denied' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Session deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting session:', error);
    return NextResponse.json(
      { error: 'Failed to delete session' },
      { status: 500 }
    );
  }
}