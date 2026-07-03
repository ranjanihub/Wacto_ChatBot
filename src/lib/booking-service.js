import * as admin from 'firebase-admin';
import { google } from 'googleapis';
import nodemailer from 'nodemailer';

// Initialize Firebase Admin SDK
let firebaseApp;
try {
  if (!admin.apps.length) {
    firebaseApp = admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    });
  } else {
    firebaseApp = admin.app();
  }
} catch (error) {
  console.error('❌ Firebase initialization error:', error.message);
}

// Initialize Gmail SMTP transporter
const mailTransporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});
console.log("EMAIL =", process.env.GOOGLE_CLIENT_EMAIL);

console.log(
  "KEY START =",
  process.env.GOOGLE_PRIVATE_KEY?.substring(0, 30)
);

console.log(
  "KEY END =",
  process.env.GOOGLE_PRIVATE_KEY?.slice(-30)
);

console.log(
  "KEY LENGTH =",
  process.env.GOOGLE_PRIVATE_KEY?.length
);
console.log(
  "FIRST CHAR:",
  process.env.GOOGLE_PRIVATE_KEY?.charCodeAt(0)
);

console.log(
  "LAST CHAR:",
  process.env.GOOGLE_PRIVATE_KEY?.charCodeAt(
    process.env.GOOGLE_PRIVATE_KEY.length - 1
  )
);
const privateKey = process.env.GOOGLE_PRIVATE_KEY
  ?.replace(/^"/, '')
  ?.replace(/"$/, '')
  ?.replace(/\\n/g, '\n');
console.log("PRIVATE KEY VARIABLE EXISTS:", !!privateKey);
console.log("PRIVATE KEY VARIABLE LENGTH:", privateKey?.length);
console.log("PRIVATE KEY VARIABLE START:", privateKey?.substring(0, 40));
const auth = new google.auth.JWT({
  email: process.env.GOOGLE_CLIENT_EMAIL,
  key: privateKey,
  scopes: [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/meetings.space.created'
  ],
});
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});
const sheets = google.sheets({
  version: 'v4',
  auth,
});
const calendar = google.calendar({
  version: 'v3',
  auth: oauth2Client,
});
// ============================================
// Google Sheets Integration
// ============================================
function convertTo24Hour(time12h) {
  if (!time12h.includes("AM") && !time12h.includes("PM")) {
    return time12h;
  }

  const [time, modifier] = time12h.split(" ");

  let [hours, minutes] = time.split(":");

  if (hours === "12") {
    hours = "00";
  }

  if (modifier === "PM") {
    hours = String(parseInt(hours, 10) + 12);
  }

  return `${hours.padStart(2, "0")}:${minutes}`;
}
export async function createGoogleMeet(bookingData) {
  try {

    const time24 = convertTo24Hour(
  bookingData.bookingTime
);

console.log("ORIGINAL TIME:", bookingData.bookingTime);
console.log("24 HOUR TIME:", time24);

const startTime = new Date(
  `${bookingData.bookingDate}T${time24}:00`
);

    const endTime = new Date(
      startTime.getTime() + 30 * 60 * 1000
    );

    const event = {
  summary: `Wacto Demo - ${bookingData.name}`,
  description: `
Name: ${bookingData.name}
Email: ${bookingData.email}
Phone: ${bookingData.phoneNumber}
  `,
  start: {
    dateTime: startTime.toISOString(),
    timeZone: 'Asia/Kolkata',
  },
  end: {
    dateTime: endTime.toISOString(),
    timeZone: 'Asia/Kolkata',
  },
  conferenceData: {
    createRequest: {
      requestId: Date.now().toString()
    },
  },
};
const response = await calendar.events.insert({
  calendarId: process.env.GOOGLE_CALENDAR_ID,
  conferenceDataVersion: 1,
  sendUpdates: "all",
  requestBody: event,
});
console.log(
  "FULL RESPONSE:",
  JSON.stringify(response.data, null, 2)
);
    console.log("CREATE MEET INPUT:", bookingData);
console.log("BOOKING DATE:", bookingData.bookingDate);
console.log("BOOKING TIME:", bookingData.bookingTime);
    
console.log(
  "CONFERENCE DATA:",
  JSON.stringify(response.data.conferenceData, null, 2)
);

console.log("HANGOUT LINK:", response.data.hangoutLink);
    console.log("CALENDAR RESPONSE:", response.data);
console.log("HANGOUT LINK:", response.data.hangoutLink);

const meetLink =
  response.data.hangoutLink ||
  response.data.conferenceData?.entryPoints?.find(
    p => p.entryPointType === "video"
  )?.uri;

return {
  success: true,
  meetLink,
  eventId: response.data.id,
};
  } catch (error) {
    console.error("Google Calendar Error:", error);

    return {
      success: false,
      error: error.message,
    };
  }
}


// ============================================
// OTP Management
// ============================================

/**
 * Send OTP via SMS to phone number
 * Uses Firebase Authentication to send SMS
 */
export async function sendOTP(phoneNumber) {
  try {
    // Validate phone number format (E.164)
    phoneNumber = '+' + phoneNumber.replace('+', '');
    if (!phoneNumber.match(/^\+[1-9]\d{1,14}$/)) {
      throw new Error('Invalid phone number');
    }

    // Generate OTP code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    // Create custom token for OTP verification session
    // Store OTP in a session variable (in production, use Redis or similar)
    const sessionToken = `${phoneNumber}_${Date.now()}`;
    
    // Store OTP temporarily (expires in 10 minutes)
    // Note: In production, store in Redis or database with TTL
    if (!global.otpStore) {
      global.otpStore = {};
    }
    global.otpStore[sessionToken] = {
      phoneNumber,
      otpCode,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
    };

    // For Firebase SMS, we would use:
    // await admin.auth().sendSignInLinkToEmail(phoneNumber, {...})
    // For production, integrate with Firebase Phone Auth or Twilio
    
    // For now, log the OTP (in production, actually send SMS via Firebase or Twilio)
    console.log(`📱 OTP for ${phoneNumber}: ${otpCode} (Session: ${sessionToken})`);
    await sendWhatsAppOTP(phoneNumber, otpCode);

    return {
      success: true,
      sessionToken,
      message: `OTP sent to ${phoneNumber}. Valid for 10 minutes.`,
      // In production, remove this from response
      debug_otp: process.env.NODE_ENV === 'development' ? otpCode : undefined,
    };
  } catch (error) {
    console.error('❌ Error sending OTP:', error.message);
    return {
      success: false,
      error: error.message || 'Failed to send OTP. Please try again.',
    };
  }
}

/**
 * Verify OTP code
 */
export async function verifyOTP(sessionToken, otpCode) {
  try {
    if (!sessionToken || !otpCode) {
      throw new Error('Session token and OTP code are required');
    }

    if (!global.otpStore || !global.otpStore[sessionToken]) {
      throw new Error('OTP session expired or not found. Request a new OTP.');
    }

    const session = global.otpStore[sessionToken];

    // Check expiration
    if (Date.now() > session.expiresAt) {
      delete global.otpStore[sessionToken];
      throw new Error('OTP has expired. Please request a new OTP.');
    }

    // Check OTP code
    if (session.otpCode !== otpCode) {
      throw new Error('Invalid OTP code. Please try again.');
    }

    // Mark as verified and return
    session.verified = true;
    session.verifiedAt = Date.now();

    return {
      success: true,
      phoneNumber: session.phoneNumber,
      message: 'OTP verified successfully',
    };
  } catch (error) {
    console.error('❌ Error verifying OTP:', error.message);
    return {
      success: false,
      error: error.message || 'OTP verification failed',
    };
  }
}
async function sendWhatsAppOTP(phoneNumber, otp) {
  try {
    console.log("Sending WhatsApp OTP to:", phoneNumber);
    console.log("OTP:", otp);
    console.log("Calling Wacto API...");
    console.log(
      "WACTO TOKEN EXISTS:",
      !!process.env.WACTO_WHATSAPP_TOKEN
    );
    const response = await fetch(
      `https://backend.wacto.ai/v1/message/send-message?token=${process.env.WACTO_WHATSAPP_TOKEN}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: phoneNumber.replace("+", ""),
          type: "template",
          template: {
            language: {
              policy: "deterministic",
              code: "en",
            },
            name: "otp",
            components: [
              {
                type: "body",
                parameters: [
                  {
                    type: "text",
                    text: otp,
                  },
                ],
              },
              {
                type: "button",
                sub_type: "url",
                index: "0",
                parameters: [
                  {
                    type: "text",
                    text: otp,
                  },
                ],
              },
            ],
          },
        }),
      }
    );
    console.log("Wacto API Status:", response.status);
    const data = await response.json();
    console.log("WhatsApp OTP Response:", data);

    return data;
  } catch (error) {
    console.error("WhatsApp OTP Error:", error);
  }
}
// ============================================
// Google Sheets Integration
// ============================================

/**
 * Store booking data in Google Sheet
 */
export async function storeBooking(bookingData) {
  try {
    const {
      name,
      email,
      phoneNumber,
      meetLink
    } = bookingData;

    if (!name || !email || !phoneNumber) {
      throw new Error('Name, email, and phone number are required');
    }

    const sheetId = process.env.GOOGLE_SHEET_ID;
    if (!sheetId) {
      throw new Error('Google Sheet ID not configured');
    }

    // Prepare row data
    const now = new Date();
    const timestamp = now.toISOString();
    const values = [[
      '', // A - S.No
      new Date().toLocaleDateString('en-GB'), // B - Date
      '', // C - Company Name
      '', // D - Industry
      bookingData.name, // E - Client Name
      bookingData.phoneNumber, // F - Contact No
      bookingData.email, // G - Email
      'Website chatbot', // H - Source
      '', '',
      'WACTO' // K - Service
    ]];
    console.log("CLIENT EMAIL:", process.env.GOOGLE_CLIENT_EMAIL);
console.log("PRIVATE KEY EXISTS:", !!process.env.GOOGLE_PRIVATE_KEY);
console.log(
  "PRIVATE KEY LENGTH:",
  process.env.GOOGLE_PRIVATE_KEY?.length
);

let token;

try {
  token = await auth.authorize();

  console.log("TOKEN OBJECT:", token);
  console.log("ACCESS TOKEN:", token?.access_token);

} catch (err) {
  console.error("AUTH ERROR MESSAGE:", err.message);
  console.error("AUTH ERROR STACK:", err.stack);
  console.error("FULL ERROR:", JSON.stringify(err, null, 2));
}

console.log("TOKEN GENERATED:", !!token?.access_token);
    // Append to sheet
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: "June 26 Onwards!A:Z", // Adjust range if your sheet structure differs
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values,
      },
    });

    console.log(`✅ Booking stored in Google Sheet. Updates: ${response.data.updates?.updatedRows || 0}`);

    return {
      success: true,
      message: 'Booking data stored successfully',
      spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${sheetId}`,
    };
  } catch (error) {
    console.error('❌ Error storing booking in Google Sheet:', error.message);
    return {
      success: false,
      error: error.message || 'Failed to store booking data',
    };
  }
}

// ============================================
// Email Notifications
// ============================================

/**
 * Send confirmation emails to user and admin
 */
export async function sendConfirmationEmails(bookingData) {
  try {
    const {
      name,
      email,
      phoneNumber,
      bookingDate,
      bookingTime,
    } = bookingData;

    const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim()) || [];
    if (adminEmails.length === 0) {
      console.warn('⚠️ No admin emails configured');
    }

    // Email to user
    const userEmailTemplate = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2c3e50;">Demo Booking Confirmation 🎉</h2>
            
            <p>Hi <strong>${name}</strong>,</p>
            
            <p>Thank you for booking a demo with Wacto! We're excited to show you how our platform can transform your business.</p>
            
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #2c3e50;">Booking Details</h3>
              <p><strong>Phone:</strong> ${phoneNumber}</p>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Demo Date:</strong> ${bookingDate}</p>
              <p><strong>Demo Time:</strong> ${bookingTime}</p>
              <button style="background-color: #4CAF50; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer;">
                <a href="${bookingData.meetLink}" style="color: #fff; text-decoration: none;">
                  Join Google Meet
                </a>
              </button>
            </div>
           
            
            ${bookingData.meetLink ? `
            <p>
            <a href="${bookingData.meetLink}">
            Join Google Meet
            </a>
            </p>
            ` : ''}
            
            <p>Our team will reach out to you shortly with more details. If you have any questions in the meantime, feel free to contact us at <strong>wecare@wacto.in</strong> or call <strong>+91-8012666888</strong>.</p>
            
            <p>Best regards,<br/>
            <strong>Wacto Team</strong></p>
          </div>
        </body>
      </html>
    `;

    // Email to admin
    const adminEmailTemplate = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2c3e50;">New Demo Booking Request </h2>
            
            <p>A new user has booked a demo:</p>
            
            <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Name:</strong> ${name}</p>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Phone:</strong> ${phoneNumber}</p>
              <p><strong>Booked at:</strong> ${new Date().toLocaleString()}</p>
              <p><strong>Demo Date:</strong> ${bookingDate}</p>
              <p><strong>Demo Time:</strong> ${bookingTime}</p>
              <button style="background-color: #4CAF50; color: white; padding: 10px 20px; border: none; border-radius: 5px; cursor: pointer;">
                <a href="${bookingData.meetLink}" style="color: #fff; text-decoration: none;">
                  Join Google Meet  
                </a>
              </button>
            </div>
            
            <p>Booking details have been stored in the shared Google Sheet. Please follow up with the user.</p>
            
            <p>---<br/>
            <strong>Wacto Team</strong></p>
          </div>
        </body>
      </html>
    `;

    // Send user email
    try {
      await mailTransporter.sendMail({
        from: process.env.GMAIL_USER,
        to: email,
        subject: 'Demo Booking Confirmation - Wacto',
        html: userEmailTemplate,
      });
      console.log(`✅ User confirmation email sent to ${email}`);
    } catch (error) {
      console.error(`❌ Error sending user email: ${error.message}`);
    }

    // Send admin emails
    for (const adminEmail of adminEmails) {
      try {
        await mailTransporter.sendMail({
          from: process.env.GMAIL_USER,
          to: adminEmail,
          subject: `New Demo Booking: ${name}`,
          html: adminEmailTemplate,
        });
        console.log(`✅ Admin notification email sent to ${adminEmail}`);
      } catch (error) {
        console.error(`❌ Error sending admin email to ${adminEmail}: ${error.message}`);
      }
    }

    return {
      success: true,
      message: 'Confirmation emails sent',
    };
  } catch (error) {
    console.error('❌ Error sending emails:', error.message);
    return {
      success: false,
      error: error.message || 'Failed to send confirmation emails',
    };
  }
}

// ============================================
// Complete Booking Flow
// ============================================

/**
 * Complete booking submission: store data + send emails
 */
export async function submitBooking(bookingData) {
  try {
    // Validate required fields
    const { name, email, phoneNumber, sessionToken, otpCode } = bookingData;
    
    if (!name || !email || !phoneNumber) {
      throw new Error('Name, email, and phone number are required');
    }

    // Verify OTP
    const otpVerification = await verifyOTP(sessionToken, otpCode);
    if (!otpVerification.success) {
      throw new Error(otpVerification.error);
    }
    console.log("🚀 Creating Google Meet...");
    // Store in Google Sheets
    const meetResult = await createGoogleMeet(bookingData);

    if (!meetResult.success) {
      throw new Error(meetResult.error);
    }
    console.log("MEET RESULT:", meetResult);
    bookingData.meetLink = meetResult.meetLink;

    const sheetResult = await storeBooking(bookingData);
    if (!sheetResult.success) {
      throw new Error(`Failed to store booking: ${sheetResult.error}`);
    }

    // Send confirmation emails
    const emailResult = await sendConfirmationEmails(bookingData);
    // Note: We don't fail the whole request if email fails, just log it

    return {
      success: true,
      message: 'Booking submitted successfully',
      meetLink: bookingData.meetLink,
      spreadsheetUrl: sheetResult.spreadsheetUrl,
    };
  } catch (error) {
    console.error('❌ Error submitting booking:', error.message);
    return {
      success: false,
      error: error.message || 'Failed to submit booking',
    };
  }
}

export default {
  sendOTP,
  verifyOTP,
  storeBooking,
  sendConfirmationEmails,
  submitBooking,
};
