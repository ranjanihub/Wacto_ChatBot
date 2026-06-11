import { NextResponse } from 'next/server';
import { sendOTP } from '@/lib/booking-service';

/**
 * POST /api/booking/send-otp
 * 
 * Request body:
 * {
 *   phoneNumber: string (E.164 format, e.g., "+1234567890" or "+919876543210")
 * }
 * 
 * Response:
 * {
 *   success: boolean,
 *   sessionToken: string,
 *   message: string,
 *   debug_otp?: string (only in development)
 * }
 */
export async function POST(req) {
  try {
    const { phoneNumber } = await req.json();

    if (!phoneNumber) {
      return NextResponse.json(
        { error: 'Phone number is required' },
        { status: 400 }
      );
    }

    console.log(`📱 OTP request for: ${phoneNumber}`);

    const result = await sendOTP(phoneNumber);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('❌ Error in send-otp route:', error.message);
    return NextResponse.json(
      { error: 'Failed to send OTP. Please try again.' },
      { status: 500 }
    );
  }
}
