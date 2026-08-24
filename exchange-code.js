import { google } from "googleapis";
import dotenv from "dotenv";
dotenv.config();

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  "http://localhost:3000/api/auth/google/callback"
);

const code = "4/0AdkVLPzS7z9SQWd9bktCYzr9yiw26kHSM1pRJIJPBo1blWAyC07wcU3J0F9hZyj18_wCCA&scope=https://www.googleapis.com/auth/calendar";

async function main() {
  const { tokens } = await oauth2Client.getToken(code);

  console.log("\nREFRESH TOKEN:");
  console.log(tokens.refresh_token);

  console.log("\nACCESS TOKEN:");
  console.log(tokens.access_token);
}

main();