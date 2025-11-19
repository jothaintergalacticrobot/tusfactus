import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TusFactus - Generador de Facturas Gratis Online | Crear Facturas PDF",
  description: "Crea facturas profesionales gratis en segundos. Generador de facturas online gratuito con descarga PDF instantánea. Sin registro, fácil y rápido.",
  keywords: [
    "generador de facturas",
    "crear facturas gratis",
    "facturas online",
    "factura PDF gratis",
    "hacer facturas",
    "plantilla factura",
    "generador facturas España",
    "factura gratis",
    "crear factura PDF",
    "invoice generator español"
  ],
  authors: [{ name: "TusFactus" }],
  creator: "TusFactus",
  publisher: "TusFactus",
  metadataBase: new URL("https://www.tusfactus.com"),
  alternates: {
    canonical: "https://www.tusfactus.com",
  },
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: "https://www.tusfactus.com",
    title: "TusFactus - Generador de Facturas Gratis Online",
    description: "Crea facturas profesionales gratis en segundos. Generador de facturas online gratuito con descarga PDF instantánea.",
    siteName: "TusFactus",
    images: [
      {
        url: "/logo-factus-ok.png",
        width: 1200,
        height: 630,
        alt: "TusFactus - Generador de Facturas",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TusFactus - Generador de Facturas Gratis Online",
    description: "Crea facturas profesionales gratis en segundos. Sin registro.",
    images: ["/logo-factus-ok.png"],
  },
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
  verification: {
    google: "tu-codigo-de-verificacion-aqui",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-icon.png" />
      </head>
      <body>{children}</body>
    </html>
  );
}
