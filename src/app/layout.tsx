import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/lib/auth-context";
import HistoryLogoutGuard from "@/components/historyguid";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0e1a" },
  ],
};

export const metadata: Metadata = {
  title: {
    default: "InvoiceIQ — AI-Powered Invoice Intelligence Platform",
    template: "%s | InvoiceIQ",
  },
  description:
    "Production-grade AI fintech platform for intelligent invoice processing, real-time fraud detection, GST analytics, spending predictions, and automated financial insights. Process thousands of invoices with enterprise-grade accuracy.",
  keywords: [
    "invoice",
    "AI",
    "fintech",
    "fraud detection",
    "GST",
    "expense management",
    "financial analytics",
    "OCR",
    "machine learning",
  ],
  authors: [{ name: "InvoiceIQ Team" }],
  creator: "InvoiceIQ",
  publisher: "InvoiceIQ",
  robots: "index, follow",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://invoiceiq.app",
    siteName: "InvoiceIQ",
    title: "InvoiceIQ — AI-Powered Invoice Intelligence Platform",
    description:
      "Process invoices with AI. Detect fraud. Predict spending. All in one platform.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "InvoiceIQ",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "InvoiceIQ — AI-Powered Invoice Intelligence",
    description: "Process invoices with AI. Detect fraud. Predict spending.",
  },
  icons: {
    icon: "",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            
            {/* 🔥 THIS IS THE IMPORTANT ADDITION */}
            <HistoryLogoutGuard />

            {children}
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}