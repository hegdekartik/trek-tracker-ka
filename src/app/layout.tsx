import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aranya Vihaara Tracker",
  description: "Automated Trek Availability Tracker for Aranya Vihaara",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
