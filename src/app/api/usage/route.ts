import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');
        const year = searchParams.get('year');
        const month = searchParams.get('month');

        if (!userId) {
            return NextResponse.json(
                { error: 'User ID is required' },
                { status: 400 }
            );
        }

        let query = `
            SELECT year, month, minutes_used
            FROM transcription_usage
            WHERE user_id = $1
        `;
        const queryParams: (string | number)[] = [userId];

        if (year && month) {
            query += ' AND year = $2 AND month = $3';
            queryParams.push(Number.parseInt(year, 10), Number.parseInt(month, 10));
        } else {
            query += ' ORDER BY year DESC, month DESC';
        }

        const result = await pool.query(query, queryParams);

        return NextResponse.json({
            usage: result.rows
        });

    } catch (error) {
        console.error('Error fetching usage data:', error);
        return NextResponse.json(
            { error: 'Failed to fetch usage data' },
            { status: 500 }
        );
    }
} 