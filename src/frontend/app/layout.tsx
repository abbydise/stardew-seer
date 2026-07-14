import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const stardewChatFont = localFont({
  src: './fonts/svthin.otf',
  variable: "--font-stardew-chat"
})

const stardewTitleFont = localFont({
  src: './fonts/Stardew Valley Regular.ttf',
  variable: "--font-stardew-title"
})

export const metadata: Metadata = {
  title: "Stardew Seer",
  description: "A RAG chatbot for the video game Stardew Valley",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${stardewChatFont.variable} ${stardewTitleFont.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
