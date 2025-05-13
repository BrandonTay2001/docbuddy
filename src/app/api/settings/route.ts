import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

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

    // Query the database for user settings
    const result = await pool.query(
      'SELECT clinic_prompt, summary_prompt FROM user_settings WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      // Return default prompts if no settings found
      return NextResponse.json({
        settings: {
          clinic_prompt: "",
          summary_prompt: ""
        }
      });
    }

    return NextResponse.json({ settings: result.rows[0] });
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { userId, clinicPrompt, summaryPrompt } = await request.json();

    // Update or insert user settings
    await pool.query(
      `INSERT INTO user_settings (user_id, clinic_prompt, summary_prompt)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id) 
       DO UPDATE SET 
         clinic_prompt = $2,
         summary_prompt = $3`,
      [userId, clinicPrompt, summaryPrompt]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving prompts:', error);
    return NextResponse.json({ error: 'Failed to save prompts' }, { status: 500 });
  }
} 