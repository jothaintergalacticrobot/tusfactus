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
  ],
  metadataBase: new URL("https://www.tusfactus.com"),
  alternates: {
    canonical: "https://www.tusfactus.com",
  },
  openGraph: {
    type: "website",
    locale: "es_ES",
    url: "https://www.tusfactus.com",
    title: "TusFactus - Generador de Facturas Gratis Online",
    description: "Crea facturas profesionales gratis en segundos.",
    siteName: "TusFactus",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
