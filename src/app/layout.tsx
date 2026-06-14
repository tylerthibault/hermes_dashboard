import type { Metadata } from "next";
import { Orbitron, Rajdhani, Roboto_Mono } from "next/font/google";
import "./globals.css";

const displayFont = Orbitron({
  variable: "--font-display",
  subsets: ["latin"],
});

const sansFont = Rajdhani({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const monoFont = Roboto_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hermes Agent Command Center",
  description: "Private dashboard for supervising and controlling Hermes AI agents.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${displayFont.variable} ${sansFont.variable} ${monoFont.variable} h-full`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
