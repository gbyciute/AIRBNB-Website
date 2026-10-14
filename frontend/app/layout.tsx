import { Geist_Mono, Noto_Sans, Roboto } from "next/font/google"
import type { Metadata } from "next"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { LanguageProvider } from "@/components/language-provider"
import { AuthGate } from "@/components/auth-gate"
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "MADEIRA CLEANING & CARE",
}

const robotoHeading = Roboto({subsets:['latin'],variable:'--font-heading'});

const notoSans = Noto_Sans({subsets:['latin'],variable:'--font-sans'})

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="pt-PT"
      suppressHydrationWarning
      className={cn("antialiased", fontMono.variable, "font-sans", notoSans.variable, robotoHeading.variable)}
    >
      <body>
        <ThemeProvider>
          <LanguageProvider>
            <AuthGate>{children}</AuthGate>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
