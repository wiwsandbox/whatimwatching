import type { Metadata, Viewport } from "next";
import { Playfair_Display, DM_Sans } from "next/font/google";
import "./globals.css";
import { AppProvider } from "@/lib/store";
import { AuthProvider } from "@/lib/authContext";
import ToastDisplay from "@/components/ToastDisplay";
import ServiceWorkerRegistration from "@/components/ServiceWorkerRegistration";
import PushSetup from "@/components/PushSetup";
import SplashScreen from "@/components/SplashScreen";
import OnboardingTrigger from "@/components/OnboardingTrigger";

const playfair = Playfair_Display({
  weight: "900",
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "wiw",
  description: "Share what you're watching with people you trust",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "wiw",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#ff5757",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${playfair.variable} ${dmSans.variable}`}>
      <body className="min-h-screen" style={{ background: "var(--bg)", color: "var(--text-primary)" }}>
        <SplashScreen />
        <div className="mx-auto w-full max-w-[390px] min-h-screen relative overflow-x-hidden" style={{ background: "var(--bg)" }}>
          <AuthProvider>
            <AppProvider>
              {children}
              <ToastDisplay />
              <OnboardingTrigger />
            </AppProvider>
            <PushSetup />
          </AuthProvider>
          <ServiceWorkerRegistration />
        </div>
      </body>
    </html>
  );
}
