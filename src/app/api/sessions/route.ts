import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { generateMedicalDocumentHtml } from '@/lib/pdf';
import { uploadToR2 } from '@/lib/r2';

// Initialize PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for Heroku
  }
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const query = `
      SELECT ps.*
      FROM patient_sessions ps
      JOIN user_sessions us ON ps.id = us.session_id
      WHERE us.user_id = $1
      ORDER BY ps.created_at DESC;
    `;

    const result = await pool.query(query, [userId]);

    return NextResponse.json({
      sessions: result.rows
    });

  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      userId,
      patientName,
      patientAge,
      transcript,
      summary,
      suggestedDiagnosis,
      suggestedPrescription,
      finalDiagnosis,
      finalPrescription,
      examinationResults,
      treatmentPlan,
      doctorNotes,
      draftId // Add this to track which draft to clean up
    } = body;

    // Validate required fields
    if (!userId || !patientName || !patientAge || !finalDiagnosis || !finalPrescription) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Generate the medical document
    const documentData = {
      patientName,
      patientAge,
      date: new Date().toLocaleDateString(),
      summary,
      examinationResults, // Pass new field to document
      diagnosis: finalDiagnosis,
      prescription: finalPrescription,
      treatmentPlan,      // Pass new field to document
      doctorNotes,
    };
    
    const htmlString = generateMedicalDocumentHtml(documentData);
    const htmlBytes = new TextEncoder().encode(htmlString);
    
    // Upload the document to R2
    const fileName = `${crypto.randomUUID()}.html`;
    const documentUrl = await uploadToR2(
      new Blob([htmlBytes], { type: 'text/html' }),
      fileName,
      'text/html'
    );

    // Start a transaction to ensure all operations succeed or fail together
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Insert data into patient_sessions - adding the new fields
      const sessionQuery = `
        INSERT INTO patient_sessions (
          name,
          age,
          transcript,
          summary,
          suggested_diagnosis,
          suggested_prescription,
          final_diagnosis,
          final_prescription,
          examination_results,
          treatment_plan,
          doctor_notes,
          document_url,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
        RETURNING id::text;
      `;

      const sessionValues = [
        patientName,
        patientAge,
        transcript,
        summary,
        suggestedDiagnosis,
        suggestedPrescription,
        finalDiagnosis,
        finalPrescription,
        examinationResults, // New field
        treatmentPlan,      // New field
        doctorNotes,
        documentUrl
      ];

      const sessionResult = await client.query(sessionQuery, sessionValues);
      const sessionId = sessionResult.rows[0].id;

      // Insert into user_sessions
      const userSessionQuery = `
        INSERT INTO user_sessions (user_id, session_id)
        VALUES ($1, $2)
        RETURNING id;
      `;

      await client.query(userSessionQuery, [userId, sessionId]);

      // Clean up drafts - delete all drafts for this user that might be related to this session
      if (draftId) {
        // Delete the specific draft
        await client.query(
          `DELETE FROM draft_sessions WHERE id = $1 AND user_id = $2`,
          [draftId, userId]
        );
      }

      await client.query('COMMIT');

      return NextResponse.json({
        success: true,
        sessionId,
        documentUrl
      });

    } catch (error) {
      console.error('Error saving session:', error);
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error saving session:', error);
    return NextResponse.json(
      { error: 'Failed to save session' },
      { status: 500 }
    );
  }
}