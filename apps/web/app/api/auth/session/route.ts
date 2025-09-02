import { getFirebaseAdminAuth } from '@/lib/firebase/admin';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { idToken } = await request.json();
    
    // Set session expiration to 14 days
    const expiresIn = 60 * 60 * 24 * 14 * 1000; // 14 days in milliseconds
    
    // Create session cookie
    const sessionCookie = await getFirebaseAdminAuth().createSessionCookie(idToken, { expiresIn });
    
    const response = new NextResponse(JSON.stringify({ status: 'success' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
    
    // Set the session cookie
    response.cookies.set({
      name: '__session',
      value: sessionCookie,
      maxAge: expiresIn / 1000, // Convert to seconds
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
    
    return response;
  } catch (error) {
    console.error('Error creating session cookie:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Failed to create session' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export const dynamic = 'force-dynamic';
