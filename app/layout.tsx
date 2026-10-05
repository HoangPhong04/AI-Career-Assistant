import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Career Assistant",
  description: "Hệ thống hỗ trợ định hướng nghề nghiệp và phỏng vấn bằng AI",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
