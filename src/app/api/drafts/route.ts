import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { uploadToR2 } from '@/lib/r2';

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

    const result = await pool.query(
      `SELECT *
       FROM draft_sessions
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    return NextResponse.json({ drafts: result.rows });
  } catch (error) {
    console.error('Error fetching drafts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch drafts' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    console.log('POST /api/drafts called');
    const { userId, audioBlob } = await request.json();
    console.log('Request body:', { userId, audioBlobLength: audioBlob?.length });

    if (!userId || !audioBlob) {
      console.error('Missing required fields:', { userId, hasAudioBlob: !!audioBlob });
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Convert base64 to buffer
    const base64Data = audioBlob.split(',')[1];
    const audioBuffer = Buffer.from(base64Data, 'base64');
    console.log('Audio converted to buffer, size:', audioBuffer.length);

    // Upload to R2
    const filePath = `drafts/${userId}/${Date.now()}.webm`;
    console.log('Uploading to R2:', filePath);
    
    // Get the full URL back from the uploadToR2 function
    const fullAudioUrl = await uploadToR2(
      audioBuffer,
      filePath,
      'audio/webm'
    );
    console.log('Upload to R2 complete, full URL:', fullAudioUrl);

    // Save full URL to database
    const result = await pool.query(
      `INSERT INTO draft_sessions (user_id, audio_url)
       VALUES ($1, $2)
       RETURNING id`,
      [userId, fullAudioUrl]
    );
    console.log('Database insert complete:', result.rows[0]);

    return NextResponse.json({
      draftId: result.rows[0].id,
      audioUrl: fullAudioUrl
    });
  } catch (error) {
    console.error('Error in POST /api/drafts:', error);
    return NextResponse.json(
      { error: 'Failed to save draft' },
      { status: 500 }
    );
  }
}