import { NextResponse } from 'next/server';
import { Pool } from 'pg';
import { generateMedicalDocumentHtml } from '@/lib/pdf';
import { uploadToR2 } from '@/lib/r2';
import { analyzeMedicalTranscript } from '@/lib/openai';

// Initialize PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for Heroku
  }
});

async function getUserSettings(userId: string) {
  try {
    const result = await pool.query(
      'SELECT clinic_prompt, summary_prompt FROM user_settings WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      // Return default prompts if no settings found
      return {
        clinic_prompt: "You are a medical assistant AI. Analyze the following doctor-patient conversation and provide a diagnosis and prescription. Be professional and return in point form, only containing necessary information. The doctor and patient are not labeled so you would need to identify which is which. Sometimes, multiple languages may be present but you only need to return results in English, translate as necessary.",
        summary_prompt: "You are a medical assistant AI. Analyze the following doctor-patient conversation and provide a concise summary. Be professional and summarize only critical information. The doctor and patient are not labeled so you would need to identify which is which. There may be multiple patients. Sometimes, multiple languages may be present but you only need to return results in English, translate as necessary."
      };
    }
    
    const clinicPromptFromDB = result.rows[0].clinic_prompt;
    const summaryPromptFromDB = result.rows[0].summary_prompt;

    return {
      clinic_prompt: `You are a medical assistant AI. Analyze the following doctor-patient conversation and provide a diagnosis and prescription. Be professional and return in point form, only containing necessary information. The doctor and patient are not labeled so you would need to identify which is which. Sometimes, multiple languages may be present but you only need to return results in English, translate as necessary. Here is a clinic profile to help you better diagnose and prescribe: ${clinicPromptFromDB}`,
      summary_prompt: `You are a medical assistant AI. Analyze the following doctor-patient conversation and provide a concise summary. Be professional and summarize only critical information. The doctor and patient are not labeled so you would need to identify which is which. There may be multiple patients. Sometimes, multiple languages may be present but you only need to return results in English, translate as necessary. Below are instructions for the summary: ${summaryPromptFromDB}`
    }
  } catch (error) {
    console.error('Error fetching user settings:', error);
    throw new Error('Failed to fetch user settings from database');
  }
}

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
      doctorNotes
    } = await request.json();

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
      diagnosis: finalDiagnosis,
      prescription: finalPrescription,
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

    // Start a transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Insert data into patient_sessions
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
          doctor_notes,
          document_url,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
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