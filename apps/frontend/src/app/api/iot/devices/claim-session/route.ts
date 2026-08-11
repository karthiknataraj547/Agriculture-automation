import { NextResponse } from 'next/server';

interface ClaimSession {
  claimSessionId: string;
  userEmail: string;
  createdAt: string;
  expiresAt: string;
}

// In-memory active claim sessions store
const claimSessions: Map<string, ClaimSession> = new Map();

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization');
    let userEmail = 'karthiknataraj547@gmail.com';

    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const decoded = JSON.parse(Buffer.from(authHeader.substring(7), 'base64').toString('utf-8'));
        if (decoded.email) userEmail = decoded.email;
      } catch (e) {}
    }

    const claimSessionId = `claim_session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000).toISOString(); // 15-minute expiry

    const session: ClaimSession = {
      claimSessionId,
      userEmail,
      createdAt: now.toISOString(),
      expiresAt,
    };

    claimSessions.set(claimSessionId, session);

    return NextResponse.json({
      success: true,
      claimSessionId,
      expiresAt,
      message: 'Short-lived device claim session initiated',
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || 'Failed to create claim session' }, { status: 500 });
  }
}
