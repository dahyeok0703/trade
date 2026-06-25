import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { Toaster } from "@/components/ui/sonner";
import { env } from "@/lib/env";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const SITE_NAME = "TradeDocs";
const TITLE = "TradeDocs — 수출 서류 자동화";
const DESCRIPTION =
  "주문서 하나로 인보이스·패킹리스트를 한 번에. 서류 간 숫자 불일치는 규칙 기반으로 자동 점검하는 소규모 수출자용 서류 자동화 도구.";

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_APP_URL),
  title: {
    default: TITLE,
    template: "%s · TradeDocs",
  },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: ["수출 서류", "인보이스", "패킹리스트", "Commercial Invoice", "Packing List", "무역 서류 자동화"],
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: TITLE,
    description: DESCRIPTION,
    locale: "ko_KR",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
