import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://adhd-test-app-9ovm.vercel.app"),

  title: "ADHD 테스트 해보기",
  description: "간단하게 ADHD 여부를 테스트해보세요.",

  openGraph: {
    title: "ADHD 테스트 해보기",
    description: "간단하게 ADHD 여부를 테스트해보세요.",
    siteName: "ADHD Test",
    images: [
      {
        url: "https://adhd-test-app-9ovm.vercel.app/logo.png?v=2", // 👉 이렇게 써도 됨 (metadataBase 덕분)
        width: 1200,
        height: 630,
      },
    ],
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}