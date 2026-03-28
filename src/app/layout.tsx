import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Email Generator",
  description: "Generate outreach emails from a website URL",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/logo-2.png" />
      </head>
      <body>{children}</body>
    </html>
  );
}
