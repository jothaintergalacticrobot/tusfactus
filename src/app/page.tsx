"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";

type Language = "es" | "en" | "ca";
type CurrencyCode = "EUR" | "USD" | "GBP" | "JPY" | "CHF" | "MXN";

const currencyLabel: Record<CurrencyCode, string> = {
  EUR: "EUR €",
  USD: "USD $",
  GBP: "GBP £",
  JPY: "JPY ¥",
  CHF: "CHF",
  MXN: "MXN $",
};

const languageLabel: Record<Language, string> = {
  es: "Español",
  en: "English",
  ca: "Català",
};

const localeMap: Record<Language, string> = {
  es: "es-ES",
  en: "en-US",
  ca: "ca-ES",
};

const sanitizeNumericInput = (value: string) => value.replace(/[^\d.,]/g, "");

const parseNumberFromInput = (input: string) => {
  if (!input.trim()) return 0;
  const normalized = input
    .replace(/\s/g, "")
    .replace(/,/g, ".")
    .replace(/[^\d.-]/g, "");

  if (!normalized) return 0;

  const parts = normalized.split(".");
  if (parts.length > 2) {
    const decimal = parts.pop();
    const integer = parts.join("");
    return parseFloat(integer + "." + decimal);
  }

  return parseFloat(normalized);
};

const formatNumberForDisplay = (
  num: number,
  lang: Language,
  currency: CurrencyCode
) => {
  const locale = localeMap[lang];
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(num);
};

const i18n: Record<Language, Record<string, string>> = {
  es: {
    invoiceNumber: "Número",
    issueDate: "Fecha de emisión",
    dueDate: "Vencimiento",
    yourData: "Tus datos",
    clientData: "Datos del cliente",
    nameCompany: "Nombre / Empresa",
    nif: "NIF",
    phone: "Teléfono",
    email: "Email",
    address: "Dirección",
    city: "Población",
    postalCode: "Código postal",
    country: "País",
    iban: "IBAN",
    items: "Partidas",
    addItem: "Añadir partida",
    description: "Descripción",
    quantity: "Cantidad",
    price: "Precio",
    discount: "Descuento",
    tax: "IVA",
    amount: "Importe",
    subtotal: "Subtotal",
    totalDiscount: "Descuento total",
    totalTax: "IVA total",
    total: "Total",
    downloadPDF: "Descargar factura",
    notes: "Notas adicionales",
    theme: "Tema",
    language: "Idioma",
    currency: "Moneda",
    clientName: "Nombre empresa o comercial",
  },
  en: {
    invoiceNumber: "Number",
    issueDate: "Issue date",
    dueDate: "Due date",
    yourData: "Your data",
    clientData: "Client data",
    nameCompany: "Name / Company",
    nif: "Tax ID",
    phone: "Phone",
    email: "Email",
    address: "Address",
    city: "City",
    postalCode: "Postal code",
    country: "Country",
    iban: "IBAN",
    items: "Items",
    addItem: "Add item",
    description: "Description",
    quantity: "Qty",
    price: "Price",
    discount: "Disc.",
    tax: "Tax",
    amount: "Amount",
    subtotal: "Subtotal",
    totalDiscount: "Total discount",
    totalTax: "Total tax",
    total: "Total",
    downloadPDF: "Download invoice",
    notes: "Additional notes",
    theme: "Theme",
    language: "Language",
    currency: "Currency",
    clientName: "Business or trade name",
  },
  ca: {
    invoiceNumber: "Número",
    issueDate: "Data d'emissió",
    dueDate: "Venciment",
    yourData: "Les teves dades",
    clientData: "Dades del client",
    nameCompany: "Nom / Empresa",
    nif: "NIF",
    phone: "Telèfon",
    email: "Email",
    address: "Adreça",
    city: "Població",
    postalCode: "Codi postal",
    country: "País",
    iban: "IBAN",
    items: "Partides",
    addItem: "Afegir partida",
    description: "Descripció",
    quantity: "Quantitat",
    price: "Preu",
    discount: "Descompte",
    tax: "IVA",
    amount: "Import",
    subtotal: "Subtotal",
    totalDiscount: "Descompte total",
    totalTax: "IVA total",
    total: "Total",
    downloadPDF: "Descarregar factura",
    notes: "Notes addicionals",
    theme: "Tema",
    language: "Idioma",
    currency: "Moneda",
    clientName: "Nom empresa o comercial",
  },
};

interface InvoiceItem {
  description: string;
  quantity: string;
  price: string;
  discount: string;
  tax: string;
}

export default function Home() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [lang, setLang] = useState<Language>("es");
  const [currency, setCurrency] = useState<CurrencyCode>("EUR");

  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [dueDate, setDueDate] = useState("");

  const [ownerName, setOwnerName] = useState("");
  const [ownerNif, setOwnerNif] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerAddress, setOwnerAddress] = useState("");
  const [ownerCity, setOwnerCity] = useState("");
  const [ownerPostalCode, setOwnerPostalCode] = useState("");
  const [ownerCountry, setOwnerCountry] = useState("");
  const [ownerIban, setOwnerIban] = useState("");

  const [clientName, setClientName] = useState("");
  const [clientNif, setClientNif] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [clientCity, setClientCity] = useState("");
  const [clientPostalCode, setClientPostalCode] = useState("");
  const [clientCountry, setClientCountry] = useState("");

  const [items, setItems] = useState<InvoiceItem[]>([
    { description: "", quantity: "", price: "", discount: "", tax: "" },
  ]);

  const [notes, setNotes] = useState("");

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as
      | "light"
      | "dark"
      | null;
    if (savedTheme) setTheme(savedTheme);

    const savedLang = localStorage.getItem("lang") as Language | null;
    if (savedLang) setLang(savedLang);

    const savedCurrency = localStorage.getItem("currency") as
      | CurrencyCode
      | null;
    if (savedCurrency) setCurrency(savedCurrency);
  }, []);

  useEffect(() => {
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("lang", lang);
  }, [lang]);

  useEffect(() => {
    localStorage.setItem("currency", currency);
  }, [currency]);

  const t = i18n[lang];

  const addItem = useCallback(() => {
    setItems((prev) => [
      ...prev,
      { description: "", quantity: "", price: "", discount: "", tax: "" },
    ]);
  }, []);

  const removeItem = useCallback((index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateItem = useCallback(
    (
      index: number,
      field: keyof InvoiceItem,
      value: string,
      isNumeric = false
    ) => {
      setItems((prev) => {
        const updated = [...prev];
        const sanitizedValue = isNumeric ? sanitizeNumericInput(value) : value;
        updated[index] = { ...updated[index], [field]: sanitizedValue };
        return updated;
      });
    },
    []
  );

  const totals = useMemo(() => {
    let subtotal = 0;
    let totalDiscountAmount = 0;
    let totalTaxAmount = 0;

    items.forEach((item) => {
      const qty = parseNumberFromInput(item.quantity);
      const price = parseNumberFromInput(item.price);
      const discountPct = parseNumberFromInput(item.discount);
      const taxPct = parseNumberFromInput(item.tax);

      const lineSubtotal = qty * price;
      const lineDiscount = lineSubtotal * (discountPct / 100);
      const lineAfterDiscount = lineSubtotal - lineDiscount;
      const lineTax = lineAfterDiscount * (taxPct / 100);

      subtotal += lineSubtotal;
      totalDiscountAmount += lineDiscount;
      totalTaxAmount += lineTax;
    });

    const total = subtotal - totalDiscountAmount + totalTaxAmount;

    return {
      subtotal,
      totalDiscountAmount,
      totalTaxAmount,
      total,
    };
  }, [items]);

  const canDownload =
    invoiceNumber.trim() !== "" &&
    ownerName.trim() !== "" &&
    clientName.trim() !== "" &&
    items.some((i) => i.description.trim() !== "");

  const generatePDF = useCallback(() => {
    if (!canDownload) return;

    const doc = new jsPDF();
    const margin = 14;
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = margin;

    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text(`${t.invoiceNumber}: ${invoiceNumber}`, margin, y);
    y += 10;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");

    if (issueDate) {
      doc.text(`${t.issueDate}: ${issueDate}`, margin, y);
      y += 5;
    }
    if (dueDate) {
      doc.text(`${t.dueDate}: ${dueDate}`, margin, y);
      y += 5;
    }
    y += 6;

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(t.yourData, margin, y);
    y += 5;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    if (ownerName) {
      doc.text(ownerName, margin, y);
      y += 4;
    }
    if (ownerNif) {
      doc.text(`${t.nif}: ${ownerNif}`, margin, y);
      y += 4;
    }
    if (ownerAddress) {
      doc.text(ownerAddress, margin, y);
      y += 4;
    }
    if (ownerCity || ownerPostalCode) {
      doc.text(`${ownerPostalCode} ${ownerCity}`, margin, y);
      y += 4;
    }
    if (ownerCountry) {
      doc.text(ownerCountry, margin, y);
      y += 4;
    }
    if (ownerPhone) {
      doc.text(`${t.phone}: ${ownerPhone}`, margin, y);
      y += 4;
    }
    if (ownerEmail) {
      doc.text(ownerEmail, margin, y);
      y += 4;
    }
    if (ownerIban) {
      doc.text(`${t.iban}: ${ownerIban}`, margin, y);
      y += 4;
    }
    y += 6;

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(t.clientData, margin, y);
    y += 5;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    if (clientName) {
      doc.text(clientName, margin, y);
      y += 4;
    }
    if (clientNif) {
      doc.text(`${t.nif}: ${clientNif}`, margin, y);
      y += 4;
    }
    if (clientAddress) {
      doc.text(clientAddress, margin, y);
      y += 4;
    }
    if (clientCity || clientPostalCode) {
      doc.text(`${clientPostalCode} ${clientCity}`, margin, y);
      y += 4;
    }
    if (clientCountry) {
      doc.text(clientCountry, margin, y);
      y += 4;
    }
    if (clientPhone) {
      doc.text(`${t.phone}: ${clientPhone}`, margin, y);
      y += 4;
    }
    if (clientEmail) {
      doc.text(clientEmail, margin, y);
      y += 4;
    }

    y += 8;

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(t.items, margin, y);
    y += 6;

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");

    const colDesc = margin;
    const colQty = margin + 80;
    const colPrice = margin + 100;
    const colDisc = margin + 120;
    const colTax = margin + 140;
    const colAmount = margin + 160;

    doc.text(t.description, colDesc, y);
    doc.text(t.quantity, colQty, y);
    doc.text(t.price, colPrice, y);
    doc.text(t.discount, colDisc, y);
    doc.text(t.tax, colTax, y);
    doc.text(t.amount, colAmount, y);
    y += 5;

    doc.setFont("helvetica", "normal");

    items.forEach((item) => {
      const qty = parseNumberFromInput(item.quantity);
      const price = parseNumberFromInput(item.price);
      const discountPct = parseNumberFromInput(item.discount);
      const taxPct = parseNumberFromInput(item.tax);

      const lineSubtotal = qty * price;
      const lineDiscount = lineSubtotal * (discountPct / 100);
      const lineAfterDiscount = lineSubtotal - lineDiscount;
      const lineTax = lineAfterDiscount * (taxPct / 100);
      const lineTotal = lineAfterDiscount + lineTax;

      doc.text(item.description || "-", colDesc, y);
      doc.text(item.quantity || "0", colQty, y);
      doc.text(formatNumberForDisplay(price, lang, currency), colPrice, y);
      doc.text(item.discount ? `${item.discount}%` : "0%", colDisc, y);
      doc.text(item.tax ? `${item.tax}%` : "0%", colTax, y);
      doc.text(formatNumberForDisplay(lineTotal, lang, currency), colAmount, y);

      y += 5;
    });

    y += 6;

    doc.setFont("helvetica", "bold");
    doc.text(
      `${t.subtotal}: ${formatNumberForDisplay(totals.subtotal, lang, currency)}`,
      margin + 120,
      y
    );
    y += 5;

    if (totals.totalDiscountAmount > 0) {
      doc.text(
        `${t.totalDiscount}: -${formatNumberForDisplay(totals.totalDiscountAmount, lang, currency)}`,
        margin + 120,
        y
      );
      y += 5;
    }

    if (totals.totalTaxAmount > 0) {
      doc.text(
        `${t.totalTax}: ${formatNumberForDisplay(totals.totalTaxAmount, lang, currency)}`,
        margin + 120,
        y
      );
      y += 5;
    }

    doc.setFontSize(12);
    doc.text(
      `${t.total}: ${formatNumberForDisplay(totals.total, lang, currency)}`,
      margin + 120,
      y
    );

    if (notes.trim()) {
      y += 10;
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text(t.notes, margin, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      const lines = doc.splitTextToSize(notes, pageWidth - 2 * margin);
      doc.text(lines, margin, y);
    }

    doc.save(`factura_${invoiceNumber || "draft"}.pdf`);
  }, [
    canDownload,
    invoiceNumber,
    issueDate,
    dueDate,
    ownerName,
    ownerNif,
    ownerPhone,
    ownerEmail,
    ownerAddress,
    ownerCity,
    ownerPostalCode,
    ownerCountry,
    ownerIban,
    clientName,
    clientNif,
    clientPhone,
    clientEmail,
    clientAddress,
    clientCity,
    clientPostalCode,
    clientCountry,
    items,
    notes,
    totals,
    t,
    lang,
    currency,
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            "name": "TusFactus - Generador de Facturas",
            "applicationCategory": "BusinessApplication",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "EUR"
            },
            "description": "Generador de facturas profesionales gratis online. Crea y descarga facturas en PDF instantáneamente sin registro.",
            "url": "https://www.tusfactus.com",
            "screenshot": "https://www.tusfactus.com/logo-factus-ok.png",
            "operatingSystem": "Web",
            "inLanguage": "es",
            "featureList": [
              "Generación de facturas PDF",
              "Descarga instantánea",
              "Sin registro requerido",
              "Modo oscuro",
              "Multimoneda"
            ]
          })
        }}
      />
      <div className={`app-shell app-shell--${theme}`}>
        <div className="app-shell__inner">
          <header className="app-header">
            <a
              href="https://www.tusfactus.com"
              className="app-logo"
              aria-label="TusFactus logo"
            >
              <img
                src="/logo-factus-ok.png"
                alt="TusFactus logo"
                width="180"
                height="48"
              />
            </a>

            <div className="app-header__controls">
              <div className="control-group">
                <label htmlFor="lang-select" className="control-label">
                  {t.language}
                </label>
                <select
                  id="lang-select"
                  className="control-select"
                  value={lang}
                  onChange={(e) => setLang(e.target.value as Language)}
                >
                  {(Object.keys(languageLabel) as Language[]).map((l) => (
                    <option key={l} value={l}>
                      {languageLabel[l]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="control-group">
                <label htmlFor="currency-select" className="control-label">
                  {t.currency}
                </label>
                <select
                  id="currency-select"
                  className="control-select"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                >
                  {(Object.keys(currencyLabel) as CurrencyCode[]).map((c) => (
                    <option key={c} value={c}>
                      {currencyLabel[c]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="control-group">
                <label htmlFor="theme-toggle" className="control-label">
                  {t.theme}
                </label>
                <button
                  id="theme-toggle"
                  className="theme-toggle"
                  onClick={() =>
                    setTheme((prev) => (prev === "light" ? "dark" : "light"))
                  }
                  aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
                >
                  <span className="sr-only">
                    {theme === "light" ? "Dark mode" : "Light mode"}
                  </span>
                  <span
                    className={`theme-toggle__knob ${
                      theme === "dark" ? "theme-toggle__knob--right" : ""
                    }`}
                  />
                </button>
              </div>
            </div>
          </header>

          <div className="card card--top-grid">
            <div className="field">
              <label htmlFor="invoice-number">{t.invoiceNumber}</label>
              <input
                id="invoice-number"
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="issue-date">{t.issueDate}</label>
              <input
                id="issue-date"
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="due-date">{t.dueDate}</label>
              <input
                id="due-date"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div className="card card--two-columns">
            <div className="card-column">
              <h2 className="card-title">{t.yourData}</h2>
              <div className="field-grid">
                <div className="field">
                  <label htmlFor="owner-name">{t.nameCompany}</label>
                  <input
                    id="owner-name"
                    type="text"
                    placeholder={t.nameCompany}
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="owner-nif">{t.nif}</label>
                  <input
                    id="owner-nif"
                    type="text"
                    placeholder="X1234567Z"
                    value={ownerNif}
                    onChange={(e) => setOwnerNif(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="owner-phone">{t.phone}</label>
                  <input
                    id="owner-phone"
                    type="tel"
                    placeholder="+34 ..."
                    value={ownerPhone}
                    onChange={(e) => setOwnerPhone(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="owner-email">{t.email}</label>
                  <input
                    id="owner-email"
                    type="email"
                    placeholder="email@dominio.com"
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="owner-address">{t.address}</label>
                  <input
                    id="owner-address"
                    type="text"
                    placeholder={t.address}
                    value={ownerAddress}
                    onChange={(e) => setOwnerAddress(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="owner-city">{t.city}</label>
                  <input
                    id="owner-city"
                    type="text"
                    placeholder={t.city}
                    value={ownerCity}
                    onChange={(e) => setOwnerCity(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="owner-postal-code">{t.postalCode}</label>
                  <input
                    id="owner-postal-code"
                    type="text"
                    placeholder="08001"
                    value={ownerPostalCode}
                    onChange={(e) => setOwnerPostalCode(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="owner-country">{t.country}</label>
                  <input
                    id="owner-country"
                    type="text"
                    placeholder="España"
                    value={ownerCountry}
                    onChange={(e) => setOwnerCountry(e.target.value)}
                  />
                </div>
                <div className="field field--full">
                  <label htmlFor="owner-iban">{t.iban}</label>
                  <input
                    id="owner-iban"
                    type="text"
                    placeholder="ES00 0000 0000 0000 0000 0000"
                    value={ownerIban}
                    onChange={(e) => setOwnerIban(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="card-column">
              <h2 className="card-title">{t.clientData}</h2>
              <div className="field-grid">
                <div className="field">
                  <label htmlFor="client-name">{t.clientName}</label>
                  <input
                    id="client-name"
                    type="text"
                    placeholder={t.clientName}
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="client-nif">{t.nif}</label>
                  <input
                    id="client-nif"
                    type="text"
                    placeholder="B12345678"
                    value={clientNif}
                    onChange={(e) => setClientNif(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="client-phone">{t.phone}</label>
                  <input
                    id="client-phone"
                    type="tel"
                    placeholder="+34 ..."
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="client-email">{t.email}</label>
                  <input
                    id="client-email"
                    type="email"
                    placeholder="email@cliente.com"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="client-address">{t.address}</label>
                  <input
                    id="client-address"
                    type="text"
                    placeholder={t.address}
                    value={clientAddress}
                    onChange={(e) => setClientAddress(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="client-city">{t.city}</label>
                  <input
                    id="client-city"
                    type="text"
                    placeholder={t.city}
                    value={clientCity}
                    onChange={(e) => setClientCity(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="client-postal-code">{t.postalCode}</label>
                  <input
                    id="client-postal-code"
                    type="text"
                    placeholder="08001"
                    value={clientPostalCode}
                    onChange={(e) => setClientPostalCode(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="client-country">{t.country}</label>
                  <input
                    id="client-country"
                    type="text"
                    placeholder="España"
                    value={clientCountry}
                    onChange={(e) => setClientCountry(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h2 className="card-title">{t.items}</h2>
              <button className="btn-secondary" onClick={addItem}>
                {t.addItem}
              </button>
            </div>

            <div className="items-table">
              <div className="items-table__header">
                <span>{t.description}</span>
                <span>{t.quantity}</span>
                <span>{t.price}</span>
                <span>{t.discount}</span>
                <span>{t.tax}</span>
                <span>{t.amount}</span>
                <span />
              </div>
              <div className="items-table__body">
                {items.map((item, index) => {
                  const qty = parseNumberFromInput(item.quantity);
                  const price = parseNumberFromInput(item.price);
                  const discountPct = parseNumberFromInput(item.discount);
                  const taxPct = parseNumberFromInput(item.tax);

                  const lineSubtotal = qty * price;
                  const lineDiscount = lineSubtotal * (discountPct / 100);
                  const lineAfterDiscount = lineSubtotal - lineDiscount;
                  const lineTax = lineAfterDiscount * (taxPct / 100);
                  const lineTotal = lineAfterDiscount + lineTax;

                  return (
                    <div key={index} className="items-table__row">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) =>
                          updateItem(index, "description", e.target.value)
                        }
                        placeholder={t.description}
                      />
                      <input
                        type="text"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(index, "quantity", e.target.value, true)
                        }
                        placeholder="1"
                      />
                      <input
                        type="text"
                        value={item.price}
                        onChange={(e) =>
                          updateItem(index, "price", e.target.value, true)
                        }
                        placeholder="0"
                      />
                      <input
                        type="text"
                        value={item.discount}
                        onChange={(e) =>
                          updateItem(index, "discount", e.target.value, true)
                        }
                        placeholder="0"
                      />
                      <input
                        type="text"
                        value={item.tax}
                        onChange={(e) =>
                          updateItem(index, "tax", e.target.value, true)
                        }
                        placeholder="0"
                      />
                      <div className="items-table__amount">
                        {formatNumberForDisplay(lineTotal, lang, currency)}
                      </div>
                      {items.length > 1 && (
                        <button
                          className="items-table__remove"
                          onClick={() => removeItem(index)}
                          aria-label={`Remove item ${index + 1}`}
                        >
                          ×
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="bottom-grid">
            <div className="card">
              <h2 className="card-title">{t.notes}</h2>
              <div className="field">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t.notes}
                />
              </div>
            </div>

            <div className="bottom-right">
              <div className="card card--totals">
                <dl className="totals">
                  <div className="totals__row">
                    <dt>{t.subtotal}</dt>
                    <dd>
                      {formatNumberForDisplay(totals.subtotal, lang, currency)}
                    </dd>
                  </div>
                  {totals.totalDiscountAmount > 0 && (
                    <div className="totals__row">
                      <dt>{t.totalDiscount}</dt>
                      <dd>
                        -
                        {formatNumberForDisplay(
                          totals.totalDiscountAmount,
                          lang,
                          currency
                        )}
                      </dd>
                    </div>
                  )}
                  {totals.totalTaxAmount > 0 && (
                    <div className="totals__row">
                      <dt>{t.totalTax}</dt>
                      <dd>
                        {formatNumberForDisplay(
                          totals.totalTaxAmount,
                          lang,
                          currency
                        )}
                      </dd>
                    </div>
                  )}
                  <div className="totals__row totals__row--total">
                    <dt>{t.total}</dt>
                    <dd>
                      {formatNumberForDisplay(totals.total, lang, currency)}
                    </dd>
                  </div>
                </dl>
              </div>

              <button
                className="btn-primary"
                onClick={generatePDF}
                disabled={!canDownload}
              >
                {t.downloadPDF}
              </button>
            </div>
          </div>

          <footer className="app-footer">
            © {new Date().getFullYear()} TusFactus
          </footer>
        </div>
      </div>
    </>
  );
}
