import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "شجرة العائلة",
  description: "أرشيف شجرة العائلة الخاص بك",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ar" dir="rtl" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
