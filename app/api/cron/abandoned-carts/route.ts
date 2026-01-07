import { NextRequest, NextResponse } from 'next/server';
import { scheduleRecoveryEmails } from '@/lib/notifications/abandoned-cart';

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'change-this-in-production';

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await scheduleRecoveryEmails();

    return NextResponse.json({
      success: result.success,
      emailsSent: result.emailsSent,
      cartsProcessed: result.cartsProcessed,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Abandoned cart cron error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
