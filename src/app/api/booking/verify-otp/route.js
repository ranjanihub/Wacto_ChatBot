import { NextResponse } from 'next/server';
import { verifyOTP } from '@/lib/booking-service';

/**
 * POST /api/booking/verify-otp
 * 
 * Request body:
 * {
 *   sessionToken: string,
 *   otpCode: string (6-digit code)
 * }
 * 
 * Response:
 * {
 *   success: boolean,
 *   phoneNumber: string,
 *   message: string,
 *   error?: string
 * }
 */
export async function POST(req) {
  try {
    const { sessionToken, otpCode } = await req.json();

    if (!sessionToken || !otpCode) {
      return NextResponse.json(
        { error: 'Session token and OTP code are required' },
        { status: 400 }
      );
    }

    console.log(`✓ Verifying OTP for session: ${sessionToken.substring(0, 20)}...`);

    console.log("SESSION TOKEN:", sessionToken);
    console.log("OTP CODE:", otpCode);
    const result = await verifyOTP(sessionToken, otpCode);
    console.log("VERIFY RESULT:", result);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('❌ Error in verify-otp route:', error.message);
    return NextResponse.json(
      { error: 'Failed to verify OTP. Please try again.' },
      { status: 500 }
    );
  }
}
