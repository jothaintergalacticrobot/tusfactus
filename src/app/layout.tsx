import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TusfactUS - Generador de Facturas Online Gratis",
  description: "Crea y descarga tus facturas profesionales sin guardar datos en el servidor. Generador gratuito con soporte para múltiples idiomas y monedas.",
  keywords: [
    "generador facturas",
    "factura online",
    "crear facturas gratis",
    "invoice generator",
    "generador facturas españa",
    "facturas profesionales",
    "facturación online",
    "facturas sin registro",
  ],
  authors: [{ name: "TusfactUS" }],
  creator: "TusfactUS",
  publisher: "TusfactUS",
  
  // ✅ FAVICON E ICONOS
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "32x32" },
    ],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
  },
  
  // ✅ OPEN GRAPH (Facebook, LinkedIn, WhatsApp)
  openGraph: {
    type: "website",
    locale: "es_ES",
    alternateLocale: ["en_US", "ca_ES"],
    url: "https://www.tusfactus.com",
    title: "TusfactUS - Generador de Facturas Online Gratis",
    description: "Crea facturas profesionales en segundos. 100% privado, sin registro, sin guardar datos en el servidor.",
    siteName: "TusfactUS",
    images: [
      {
        url: "https://www.tusfactus.com/logo-factus-ok.png",
        width: 1200,
        height: 630,
        alt: "TusfactUS - Generador de Facturas",
      },
    ],
  },
  
  // ✅ TWITTER CARDS
  twitter: {
    card: "summary_large_image",
    title: "TusfactUS - Generador de Facturas Online",
    description: "Crea facturas profesionales sin guardar datos en el servidor. Multiidioma y gratis.",
    images: ["https://www.tusfactus.com/logo-factus-ok.png"],
  },
  
  // ✅ ROBOTS (SEO)
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  
  // ✅ MANIFEST PARA PWA
  manifest: "/manifest.json",
  
  // ✅ CANONICAL Y ALTERNATIVAS
  metadataBase: new URL("https://www.tusfactus.com"),
  alternates: {
    canonical: "https://www.tusfactus.com",
    languages: {
      "es-ES": "https://www.tusfactus.es",
      "en-US": "https://www.tusfactus.com/en",
      "ca-ES": "https://www.tusfactus.com/ca",
    },
  },
  
  category: "Business",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
