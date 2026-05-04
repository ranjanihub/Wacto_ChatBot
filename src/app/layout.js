import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const metadata = {
  title: "WACTO AI Chatbot",
  description: "Multilingual AI Chatbot for WACTO using Next.js, n8n, and MongoDB",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${outfit.variable}`}>
      <body>{children}</body>
    </html>
  );
}
