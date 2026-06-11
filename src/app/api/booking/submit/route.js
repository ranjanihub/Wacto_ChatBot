import { NextResponse } from 'next/server';
import { submitBooking } from '@/lib/booking-service';

/**
 * POST /api/booking/submit
 * 
 * Request body:
 * {
 *   name: string,
 *   email: string,
 *   phoneNumber: string,
 *   sessionToken: string,
 *   otpCode: string,
 *   scheduledTime?: string
 * }
 * 
 * Response:
 * {
 *   success: boolean,
 *   message: string,
 *   calendlyLink: string,
 *   spreadsheetUrl: string,
 *   error?: string
 * }
 */
export async function POST(req) {
  try {
    const body = await req.json();
    const {
      name,
      email,
      phoneNumber,
      sessionToken,
      otpCode,
      scheduledTime,
    } = body;

    // Validate required fields
    if (!name || !email || !phoneNumber || !sessionToken || !otpCode) {
      return NextResponse.json(
        { error: 'Name, email, phone number, session token, and OTP code are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    console.log(`📝 Booking submission for: ${name} (${email})`);

    const result = await submitBooking({
      name,
      email,
      phoneNumber,
      sessionToken,
      otpCode,
      scheduledTime,
      calendlyLink: process.env.CALENDLY_LINK,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('❌ Error in submit booking route:', error.message);
    return NextResponse.json(
      { error: 'Failed to submit booking. Please try again.' },
      { status: 500 }
    );
  }
}
