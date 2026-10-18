import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PondScale — is my fish feed right?",
  description:
    "Feed conversion, growth and feed cost per kg of fish, plus the market value of the fish still in the pond.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}