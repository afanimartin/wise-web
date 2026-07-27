import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wise API Tester",
  description: "Google auth tester for the Wise backend API",
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
