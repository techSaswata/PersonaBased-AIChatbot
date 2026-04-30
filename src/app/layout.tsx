import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Persona-Based AI Chatbot",
  description: "Chat with AI personas inspired by Scaler and InterviewBit mentors."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
