import type { Metadata } from "next";
import { AppSidebar } from "@/components/app-sidebar"
import ChatCard from "@/components/chat-input"
import { SiteHeader } from "@/components/site-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/provider/theme-provider";
import { Analytics } from '@vercel/analytics/react';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "QDoctor AI",
  description: "Your medical companion"
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SidebarProvider
            style={
              {
                "--sidebar-width": "calc(var(--spacing) * 72)",
                "--header-height": "calc(var(--spacing) * 12)",
              } as React.CSSProperties
            }
          >
            <AppSidebar variant="inset" />
            <SidebarInset>
              <SiteHeader />
              <div className="flex flex-1 flex-col">
                <div className="@container/main flex flex-1 flex-col gap-2">
                  <div className="h-full flex justify-center items-center">
                    {children}
                  </div>
                </div>
              </div>
            </SidebarInset>
          </SidebarProvider>
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
