import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Canonly — governed content for regulated brands",
  description: "Legal approves once. Marketing composes freely. AI answers cite the result.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-tint">{children}</body>
    </html>
  );
}
