import { NextResponse } from 'next/server';
import { Pool } from 'pg';
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

export async function POST(request: Request) {
  try {
    const { userId, transcript } = await request.json();

    if (!userId || !transcript) {
      return NextResponse.json(
        { error: 'User ID and transcript are required' },
        { status: 400 }
      );
    }

    // Get user settings
    const userSettings = await getUserSettings(userId);
    
    // Analyze transcript
    const analysis = await analyzeMedicalTranscript(
      transcript,
      userSettings.clinic_prompt,
      userSettings.summary_prompt
    );

    return NextResponse.json({
      success: true,
      analysis
    });

  } catch (error) {
    console.error('Error analyzing transcript:', error);
    return NextResponse.json(
      { error: 'Failed to analyze transcript' },
      { status: 500 }
    );
  }
}
