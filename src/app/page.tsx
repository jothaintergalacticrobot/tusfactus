"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";
import { track } from "@vercel/analytics";

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
    const recomposed = `${integer}.${decimal}`;
    const parsed = parseFloat(recomposed);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  const parsed = parseFloat(normalized);
  return Number.isNaN(parsed) ? 0 : parsed;
};

type PercentField = "discount" | "vat" | "irpf";

const t = {
  es: {
    title: "Generador de facturas",
    number: "Número",
    issueDate: "Fecha de emisión",
    dueDate: "Vencimiento",
    currency: "Moneda",
    yourData: "Tus datos",
    clientData: "Datos del cliente",
    name: "Nombre / Empresa",
    clientName: "Nombre empresa o comercial",
    nif: "NIF",
    phone: "Teléfono",
    email: "Email",
    address: "Dirección",
    city: "Población",
    postalCode: "Código postal",
    country: "País",
    iban: "IBAN",
    concepts: "Conceptos",
    concept: "Concepto",
    unitPrice: "Precio/Uni",
    qty: "Cant.",
    discount: "Dto %",
    vat: "IVA %",
    irpf: "IRPF %",
    amount: "Importe",
    notes: "Notas",
    defaultNotes: "Gracias por su confianza.",
    addConcept: "+ Añadir nuevo concepto",
    createAndDownload: "Crear y descargar",
    emptyForm: "Introduce al menos un dato para generar la factura.",
    totalsTaxBase: "Base imponible",
    totalsVat: "IVA total",
    totalsIrpf: "IRPF total",
    totalsTotal: "TOTAL",
    language: "Idioma",
    theme: "Tema",
    themeLight: "Claro",
    themeDark: "Oscuro",
    pdfError: "Error al generar la factura. Por favor, inténtalo de nuevo.",
  },
  en: {
    title: "Invoice generator",
    number: "Number",
    issueDate: "Issue date",
    dueDate: "Due date",
    currency: "Currency",
    yourData: "Your details",
    clientData: "Client details",
    name: "Name / Company",
    clientName: "Client / Company name",
    nif: "Tax ID",
    phone: "Phone",
    email: "Email",
    address: "Address",
    city: "City",
    postalCode: "Postal code",
    country: "Country",
    iban: "IBAN",
    concepts: "Items",
    concept: "Item",
    unitPrice: "Unit price",
    qty: "Qty",
    discount: "Disc %",
    vat: "VAT %",
    irpf: "Withholding %",
    amount: "Amount",
    notes: "Notes",
    defaultNotes: "Thank you for your business.",
    addConcept: "+ Add new item",
    createAndDownload: "Create and download",
    emptyForm: "Enter at least one field before generating the invoice.",
    totalsTaxBase: "Tax base",
    totalsVat: "VAT total",
    totalsIrpf: "Withholding total",
    totalsTotal: "TOTAL",
    language: "Language",
    theme: "Theme",
    themeLight: "Light",
    themeDark: "Dark",
    pdfError: "Error generating invoice. Please try again.",
  },
  ca: {
    title: "Generador de factures",
    number: "Número",
    issueDate: "Data d'emissió",
    dueDate: "Venciment",
    currency: "Moneda",
    yourData: "Les teves dades",
    clientData: "Dades del client",
    name: "Nom / Empresa",
    clientName: "Nom empresa o comercial",
    nif: "NIF",
    phone: "Telèfon",
    email: "Email",
    address: "Adreça",
    city: "Població",
    postalCode: "Codi postal",
    country: "País",
    iban: "IBAN",
    concepts: "Conceptes",
    concept: "Concepte",
    unitPrice: "Preu/Uni",
    qty: "Quant.",
    discount: "Dte %",
    vat: "IVA %",
    irpf: "IRPF %",
    amount: "Import",
    notes: "Notes",
    defaultNotes: "Gràcies per la confiança.",
    addConcept: "+ Afegir nou concepte",
    createAndDownload: "Crear i descarregar",
    emptyForm: "Introdueix com a mínim una dada per generar la factura.",
    totalsTaxBase: "Base imposable",
    totalsVat: "IVA total",
    totalsIrpf: "IRPF total",
    totalsTotal: "TOTAL",
    language: "Idioma",
    theme: "Tema",
    themeLight: "Clar",
    themeDark: "Fosc",
    pdfError: "Error en generar la factura. Siusplau, torna-ho a intentar.",
  },
};

type LineItem = {
  id: number;
  description: string;
  unitPrice: string;
  quantity: string;
  discount: string;
  vat: string;
  irpf: string;
};

type Party = {
  name: string;
  nif: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  iban?: string;
};

const normalizeString = (value?: string | null) => (value ?? "").trim();

// FUNCIONES AUXILIARES PARA GENERAR PDF CON DISEÑO MEJORADO
const generatePDFHeader = (
  doc: jsPDF,
  tr: typeof t.es,
  data: {
    invoiceNumber: string;
    issueDate: string;
    dueDate: string;
  },
  marginLeft: number,
  marginRight: number,
  cursorY: number
) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  const infoX = pageWidth - marginRight - 65;
  const infoY = cursorY;
  
  doc.setFillColor(250, 250, 250);
  doc.roundedRect(infoX - 3, infoY - 3, 68, 32, 2, 2, 'F');
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(115, 115, 115);
  
  let infoLineY = infoY;
  
  doc.text(tr.number.toUpperCase(), infoX, infoLineY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(23, 23, 23);
  doc.text(data.invoiceNumber || "-", infoX, infoLineY + 4);
  
  infoLineY += 10;
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(115, 115, 115);
  doc.text(tr.issueDate.toUpperCase(), infoX, infoLineY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(23, 23, 23);
  doc.text(data.issueDate || "-", infoX, infoLineY + 4);
  
  infoLineY += 10;
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(115, 115, 115);
  doc.text(tr.dueDate.toUpperCase(), infoX, infoLineY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(23, 23, 23);
  doc.text(data.dueDate || "-", infoX, infoLineY + 4);

  return cursorY + 40;
};

const generatePDFPartyDetails = (
  doc: jsPDF,
  seller: Party,
  client: Party,
  tr: typeof t.es,
  marginLeft: number,
  marginRight: number,
  cursorY: number
) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const columnWidth = (pageWidth - marginLeft - marginRight - 10) / 2;
  
  doc.setFillColor(250, 250, 250);
  doc.roundedRect(marginLeft, cursorY, columnWidth, 50, 2, 2, 'F');
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.5);
  doc.roundedRect(marginLeft, cursorY, columnWidth, 50, 2, 2, 'S');
  
  const clientX = marginLeft + columnWidth + 10;
  doc.setFillColor(250, 250, 250);
  doc.roundedRect(clientX, cursorY, columnWidth, 50, 2, 2, 'F');
  doc.setDrawColor(229, 231, 235);
  doc.roundedRect(clientX, cursorY, columnWidth, 50, 2, 2, 'S');
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(23, 23, 23);
  doc.text(tr.yourData.toUpperCase(), marginLeft + 3, cursorY + 6);
  doc.text(tr.clientData.toUpperCase(), clientX + 3, cursorY + 6);
  
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.3);
  doc.line(marginLeft + 3, cursorY + 8, marginLeft + columnWidth - 3, cursorY + 8);
  doc.line(clientX + 3, cursorY + 8, clientX + columnWidth - 3, cursorY + 8);
  
  const sellerLines = [
    seller.name,
    seller.nif,
    seller.address,
    `${seller.postalCode} ${seller.city}`.trim(),
    seller.country,
    seller.phone,
    seller.email,
    seller.iban,
  ].filter(Boolean) as string[];

  const clientLines = [
    client.name,
    client.nif,
    client.address,
    `${client.postalCode} ${client.city}`.trim(),
    client.country,
    client.phone,
    client.email,
  ].filter(Boolean) as string[];

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(23, 23, 23);
  
  let sellerY = cursorY + 12;
  sellerLines.forEach((line) => {
    if (sellerY < cursorY + 47) {
      doc.text(line, marginLeft + 3, sellerY);
      sellerY += 4;
    }
  });
  
  let clientY = cursorY + 12;
  clientLines.forEach((line) => {
    if (clientY < cursorY + 47) {
      doc.text(line, clientX + 3, clientY);
      clientY += 4;
    }
  });

  return cursorY + 55;
};

const generatePDFItemsTable = (
  doc: jsPDF,
  items: LineItem[],
  itemCalculations: any[],
  tr: typeof t.es,
  formatDecimal: (value: number) => string,
  formatPercent: (value: number) => string,
  formatAmount: (value: number) => string,
  marginLeft: number,
  marginRight: number,
  cursorY: number,
  pageHeight: number,
  bottomMargin: number,
  topMargin: number
) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const tableWidth = pageWidth - marginLeft - marginRight;
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(23, 23, 23);
  doc.text(tr.concepts.toUpperCase(), marginLeft, cursorY);
  cursorY += 8;

  const header = [
    tr.concept,
    tr.qty,
    tr.unitPrice,
    tr.discount,
    tr.vat,
    tr.irpf,
    tr.amount,
  ];

  const rows = itemCalculations.map((calc, index) => {
    const item = items[index];
    return [
      item.description || "-",
      formatDecimal(calc.qty),
      formatDecimal(calc.price),
      formatPercent(calc.discount),
      formatPercent(calc.vat),
      formatPercent(calc.irpf),
      formatAmount(calc.lineTotal),
    ];
  });

  const colWidths = [50, 12, 20, 15, 15, 15, 33];
  let tableY = cursorY;

  const columnOffset = (index: number) =>
    colWidths.slice(0, index).reduce((a, b) => a + b, 0);

  const ensureTableSpace = (heightNeeded: number) => {
    if (tableY + heightNeeded > pageHeight - bottomMargin) {
      doc.addPage();
      tableY = topMargin;
      drawTableHeader();
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(23, 23, 23);
    }
  };

  const drawTableHeader = () => {
    doc.setFillColor(13, 148, 136);
    doc.roundedRect(marginLeft, tableY, tableWidth, 8, 1, 1, 'F');
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    
    header.forEach((text, i) => {
      const x = marginLeft + columnOffset(i) + 2;
      if (i === header.length - 1) {
        doc.text(text, marginLeft + tableWidth - 5, tableY + 5, { align: 'right' });
      } else {
        doc.text(text, x, tableY + 5);
      }
    });
    
    tableY += 9;
  };

  ensureTableSpace(12);
  drawTableHeader();

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(23, 23, 23);
  const lineHeight = 6;

  rows.forEach((row, rowIndex) => {
    const cellLines = row.map(
      (cell, i) =>
        doc.splitTextToSize(String(cell), colWidths[i] - 3) as string[]
    );
    const maxLines = Math.max(1, ...cellLines.map((lines) => lines.length));
    const rowHeight = maxLines * lineHeight;

    ensureTableSpace(rowHeight + 2);

    if (rowIndex % 2 === 0) {
      doc.setFillColor(250, 250, 250);
      doc.rect(marginLeft, tableY, tableWidth, rowHeight, 'F');
    }

    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.2);
    doc.line(marginLeft, tableY + rowHeight, marginLeft + tableWidth, tableY + rowHeight);

    cellLines.forEach((lines, i) => {
      const offset = columnOffset(i);
      const x = marginLeft + offset + 2;
      
      lines.forEach((line: string, idx: number) => {
        if (i === cellLines.length - 1) {
          doc.text(line, marginLeft + tableWidth - 5, tableY + 4 + lineHeight * idx, { align: 'right' });
        } else {
          doc.text(line, x, tableY + 4 + lineHeight * idx);
        }
      });
    });

    tableY += rowHeight;
  });

  return tableY + 5;
};

const generatePDFTotals = (
  doc: jsPDF,
  totals: { base: number; vatTotal: number; irpfTotal: number; total: number },
  tr: typeof t.es,
  formatAmount: (value: number) => string,
  marginLeft: number,
  marginRight: number,
  cursorY: number
) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const totalsWidth = 70;
  const totalsX = pageWidth - marginRight - totalsWidth;
  
  doc.setFillColor(250, 250, 250);
  doc.roundedRect(totalsX, cursorY, totalsWidth, 42, 2, 2, 'F');
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.5);
  doc.roundedRect(totalsX, cursorY, totalsWidth, 42, 2, 2, 'S');
  
  const totalRows = [
    { label: tr.totalsTaxBase, value: totals.base },
    { label: tr.totalsVat, value: totals.vatTotal },
    { label: tr.totalsIrpf, value: totals.irpfTotal },
    { label: tr.totalsTotal, value: totals.total, isTotal: true },
  ];

  let totalY = cursorY + 6;

  totalRows.forEach(({ label, value, isTotal }) => {
    if (isTotal) {
      doc.setDrawColor(13, 148, 136);
      doc.setLineWidth(0.8);
      doc.line(totalsX + 3, totalY - 2, totalsX + totalsWidth - 3, totalY - 2);
      totalY += 3;
    }
    
    doc.setFont("helvetica", isTotal ? "bold" : "normal");
    doc.setFontSize(isTotal ? 11 : 9);
    doc.setTextColor(isTotal ? 23 : 115, isTotal ? 23 : 115, isTotal ? 23 : 115);
    
    doc.text(label, totalsX + 3, totalY);
    doc.text(formatAmount(value), totalsX + totalsWidth - 3, totalY, { align: 'right' });
    
    totalY += isTotal ? 10 : 8;
  });

  return cursorY + 45;
};

export default function InvoicePage() {
  const [language, setLanguage] = useState<Language>("es");
  const [currency, setCurrency] = useState<CurrencyCode>("EUR");
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [dueDate, setDueDate] = useState("");

  const [seller, setSeller] = useState<Party>({
    name: "",
    nif: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    postalCode: "",
    country: "",
    iban: "",
  });

  const [client, setClient] = useState<Party>({
    name: "",
    nif: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    postalCode: "",
    country: "",
  });

  const [items, setItems] = useState<LineItem[]>([
    {
      id: 1,
      description: "",
      unitPrice: "",
      quantity: "",
      discount: "",
      vat: "21",
      irpf: "0",
    },
  ]);

  const [notes, setNotes] = useState("");
  const [downloadError, setDownloadError] = useState("");

  const tr = t[language];
  const locale = localeMap[language];

  const amountFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    [locale, currency]
  );

  const decimalFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }),
    [locale]
  );

  const formatAmount = useCallback(
    (value: number) => amountFormatter.format(value),
    [amountFormatter]
  );
  const formatDecimal = useCallback(
    (value: number) => (Number.isFinite(value) ? decimalFormatter.format(value) : "0"),
    [decimalFormatter]
  );
  const formatPercent = useCallback(
    (value: number) => `${Number.isFinite(value) ? decimalFormatter.format(value) : "0"}%`,
    [decimalFormatter]
  );

  const getNumericValue = useCallback((value: string) => parseNumberFromInput(value), []);
  const getNonNegativeValue = useCallback(
    (value: string) => Math.max(0, getNumericValue(value)),
    [getNumericValue]
  );
  const getPercentageValue = useCallback(
    (value: string) => Math.max(0, Math.min(100, getNumericValue(value))),
    [getNumericValue]
  );

  const itemCalculations = useMemo(() => {
    return items.map((item) => {
      const price = getNonNegativeValue(item.unitPrice);
      const qty = getNonNegativeValue(item.quantity);
      const discount = getPercentageValue(item.discount);
      const vat = getPercentageValue(item.vat);
      const irpf = getPercentageValue(item.irpf);

      const base = price * qty * (1 - discount / 100);
      const lineVat = base * (vat / 100);
      const lineIrpf = base * (irpf / 100);
      const lineTotal = base + lineVat - lineIrpf;

      return {
        id: item.id,
        price,
        qty,
        discount,
        vat,
        irpf,
        base,
        lineVat,
        lineIrpf,
        lineTotal,
      };
    });
  }, [items, getNonNegativeValue, getPercentageValue]);

  const totals = useMemo(() => {
    let base = 0;
    let vatTotal = 0;
    let irpfTotal = 0;

    itemCalculations.forEach((calc) => {
      base += calc.base;
      vatTotal += calc.lineVat;
      irpfTotal += calc.lineIrpf;
    });

    const total = base + vatTotal - irpfTotal;

    return { base, vatTotal, irpfTotal, total };
  }, [itemCalculations]);

  const hasFormData = useMemo(() => {
    const hasAnyValue = (obj: Record<string, any>) =>
      Object.values(obj).some((val) => String(val || "").trim().length > 0);

    return (
      hasAnyValue(seller) ||
      hasAnyValue(client) ||
      [invoiceNumber, issueDate, dueDate, notes].some((v) => v.trim()) ||
      items.some((item) =>
        ["description", "unitPrice", "quantity", "discount"].some((key) =>
          String(item[key as keyof LineItem] || "").trim()
        )
      )
    );
  }, [seller, client, invoiceNumber, issueDate, dueDate, notes, items]);

  useEffect(() => {
    if (hasFormData && downloadError) {
      setDownloadError("");
    }
  }, [hasFormData, downloadError]);

  const updateItem = useCallback((id: number, field: keyof LineItem, value: string) => {
    const numericFields: (keyof LineItem)[] = [
      "unitPrice",
      "quantity",
      "discount",
      "vat",
      "irpf",
    ];
    const isNumericField = numericFields.includes(field);
    const sanitizedValue = isNumericField ? sanitizeNumericInput(value) : value;

    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, [field]: sanitizedValue } : item
      )
    );
  }, []);

  const clampPercentField = useCallback(
    (id: number, field: PercentField) => {
      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                [field]: (() => {
                  const raw = item[field].trim();
                  if (!raw) return "";
                  const clamped = getPercentageValue(raw);
                  return formatDecimal(clamped);
                })(),
              }
            : item
        )
      );
    },
    [getPercentageValue, formatDecimal]
  );

  const addItem = useCallback(() => {
    setItems((prev) => [
      ...prev,
      {
        id: Date.now(),
        description: "",
        unitPrice: "",
        quantity: "",
        discount: "",
        vat: "21",
        irpf: "0",
      },
    ]);
    
    // Track añadir concepto
    track('concept_added', { total_concepts: items.length + 1 });
  }, [items.length]);

  const removeItem = useCallback((id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    
    // Track eliminar concepto
    track('concept_removed', { total_concepts: items.length - 1 });
  }, [items.length]);

  const handleSellerChange = useCallback((field: keyof Party, value: string) => {
    setSeller((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleClientChange = useCallback((field: keyof Party, value: string) => {
    setClient((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleDownload = useCallback(() => {
    if (!hasFormData) {
      setDownloadError(tr.emptyForm);
      return;
    }

    try {
      setDownloadError("");
      const doc = new jsPDF();

      const marginLeft = 15;
      const marginRight = 15;
      const pageHeight = doc.internal.pageSize.getHeight();
      const topMargin = 20;
      const bottomMargin = 20;

      const ensureSpace = (cursor: number, heightNeeded: number) => {
        if (cursor + heightNeeded > pageHeight - bottomMargin) {
          doc.addPage();
          return topMargin;
        }
        return cursor;
      };

      let cursorY = topMargin;

      cursorY = generatePDFHeader(
        doc,
        tr,
        { invoiceNumber, issueDate, dueDate },
        marginLeft,
        marginRight,
        cursorY
      );

      cursorY = ensureSpace(cursorY, 55);
      cursorY = generatePDFPartyDetails(
        doc,
        seller,
        client,
        tr,
        marginLeft,
        marginRight,
        cursorY
      );

      cursorY = ensureSpace(cursorY, 20);
      cursorY = generatePDFItemsTable(
        doc,
        items,
        itemCalculations,
        tr,
        formatDecimal,
        formatPercent,
        formatAmount,
        marginLeft,
        marginRight,
        cursorY,
        pageHeight,
        bottomMargin,
        topMargin
      );

      cursorY = ensureSpace(cursorY, 45);
      cursorY = generatePDFTotals(
        doc,
        totals,
        tr,
        formatAmount,
        marginLeft,
        marginRight,
        cursorY
      );

      if (notes.trim()) {
        cursorY = ensureSpace(cursorY, 20);
        const pageWidth = doc.internal.pageSize.getWidth();
        const notesWidth = pageWidth - marginLeft - marginRight;
        
        doc.setFillColor(250, 250, 250);
        const split = doc.splitTextToSize(notes, notesWidth - 6);
        const notesHeight = split.length * 4 + 10;
        
        doc.roundedRect(marginLeft, cursorY, notesWidth, notesHeight, 2, 2, 'F');
        doc.setDrawColor(229, 231, 235);
        doc.setLineWidth(0.5);
        doc.roundedRect(marginLeft, cursorY, notesWidth, notesHeight, 2, 2, 'S');
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(115, 115, 115);
        doc.text(tr.notes.toUpperCase(), marginLeft + 3, cursorY + 5);
        
        cursorY += 9;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(23, 23, 23);
        doc.text(split, marginLeft + 3, cursorY);
      }

      const safeNumber = invoiceNumber || "sin-numero";
      doc.save(`factura-${safeNumber}.pdf`);
      
      // ✅ TRACK EVENTO: FACTURA GENERADA
      track('invoice_generated', {
        currency: currency,
        language: language,
        items_count: items.length,
        has_notes: notes.trim().length > 0,
        has_invoice_number: invoiceNumber.trim().length > 0,
        has_dates: (issueDate.trim().length > 0 || dueDate.trim().length > 0),
        total_amount: totals.total,
      });
      
    } catch (error) {
      console.error("Error generando PDF:", error);
      setDownloadError(tr.pdfError);
      
      // Track error
      track('pdf_generation_error');
    }
  }, [
    hasFormData,
    tr,
    invoiceNumber,
    issueDate,
    dueDate,
    seller,
    client,
    itemCalculations,
    items,
    totals,
    notes,
    formatDecimal,
    formatPercent,
    formatAmount,
    currency,
    language,
  ]);

  return (
    <div className={`app-shell app-shell--${theme}`}>
      <div className="app-shell__inner">
        <header className="app-header">
          <div className="app-logo">
            <img
              src="/logo-factus-ok.png"
              alt="TusfactUS"
              style={{ height: "100%", width: "auto", objectFit: "contain" }}
            />
          </div>

          <div className="app-header__controls">
            <div className="control-group">
              <label className="control-label" htmlFor="language-select">
                {tr.language}
              </label>
              <select
                id="language-select"
                className="control-select"
                value={language}
                onChange={(e) => {
                  const newLang = e.target.value as Language;
                  setLanguage(newLang);
                  // ✅ TRACK CAMBIO DE IDIOMA
                  track('language_changed', { language: newLang });
                }}
              >
                {Object.entries(languageLabel).map(([code, label]) => (
                  <option key={code} value={code}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="control-group">
              <label className="control-label" htmlFor="currency-select">
                {tr.currency}
              </label>
              <select
                id="currency-select"
                className="control-select"
                value={currency}
                onChange={(e) => {
                  const newCurrency = e.target.value as CurrencyCode;
                  setCurrency(newCurrency);
                  // ✅ TRACK CAMBIO DE MONEDA
                  track('currency_changed', { currency: newCurrency });
                }}
              >
                {(Object.keys(currencyLabel) as CurrencyCode[]).map((code) => (
                  <option key={code} value={code}>
                    {currencyLabel[code]}
                  </option>
                ))}
              </select>
            </div>

            <div className="control-group">
              <span className="control-label">{tr.theme}</span>
              <button
                type="button"
                className={`theme-toggle theme-toggle--${theme}`}
                onClick={() => {
                  const newTheme = theme === "light" ? "dark" : "light";
                  setTheme(newTheme);
                  // ✅ TRACK CAMBIO DE TEMA
                  track('theme_changed', { theme: newTheme });
                }}
                aria-pressed={theme === "dark"}
                aria-label={theme === "light" ? tr.themeDark : tr.themeLight}
              >
                <span
                  className={`theme-toggle__knob ${
                    theme === "dark" ? "theme-toggle__knob--right" : ""
                  }`}
                />
                <span className="sr-only">
                  {theme === "light" ? tr.themeLight : tr.themeDark}
                </span>
              </button>
            </div>
          </div>
        </header>

        <section className="card card--top-grid">
          <div className="field">
            <label htmlFor="invoice-number">{tr.number}</label>
            <input
              id="invoice-number"
              type="text"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="issue-date">{tr.issueDate}</label>
            <input
              id="issue-date"
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="due-date">{tr.dueDate}</label>
            <input
              id="due-date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </section>

        <section className="card card--two-columns">
          <div className="card-column">
            <h2 className="card-title">{tr.yourData}</h2>
            <div className="field-grid">
              <div className="field">
                <label htmlFor="seller-name">{tr.name}</label>
                <input
                  id="seller-name"
                  type="text"
                  value={seller.name}
                  onChange={(e) => handleSellerChange("name", e.target.value)}
                  placeholder={tr.name}
                />
              </div>
              <div className="field">
                <label htmlFor="seller-nif">{tr.nif}</label>
                <input
                  id="seller-nif"
                  type="text"
                  value={seller.nif}
                  onChange={(e) => handleSellerChange("nif", e.target.value)}
                  placeholder="X1234567Z"
                />
              </div>
              <div className="field">
                <label htmlFor="seller-phone">{tr.phone}</label>
                <input
                  id="seller-phone"
                  type="tel"
                  value={seller.phone}
                  onChange={(e) => handleSellerChange("phone", e.target.value)}
                  placeholder="+34 ..."
                />
              </div>
              <div className="field">
                <label htmlFor="seller-email">{tr.email}</label>
                <input
                  id="seller-email"
                  type="email"
                  value={seller.email}
                  onChange={(e) => handleSellerChange("email", e.target.value)}
                  placeholder="email@dominio.com"
                />
              </div>
              <div className="field">
                <label htmlFor="seller-address">{tr.address}</label>
                <input
                  id="seller-address"
                  type="text"
                  value={seller.address}
                  onChange={(e) => handleSellerChange("address", e.target.value)}
                  placeholder="Calle, número"
                />
              </div>
              <div className="field">
                <label htmlFor="seller-city">{tr.city}</label>
                <input
                  id="seller-city"
                  type="text"
                  value={seller.city}
                  onChange={(e) => handleSellerChange("city", e.target.value)}
                  placeholder={tr.city}
                />
              </div>
              <div className="field">
                <label htmlFor="seller-postal">{tr.postalCode}</label>
                <input
                  id="seller-postal"
                  type="text"
                  value={seller.postalCode}
                  onChange={(e) =>
                    handleSellerChange("postalCode", e.target.value)
                  }
                  placeholder="08001"
                />
              </div>
              <div className="field">
                <label htmlFor="seller-country">{tr.country}</label>
                <input
                  id="seller-country"
                  type="text"
                  value={seller.country}
                  onChange={(e) =>
                    handleSellerChange("country", e.target.value)
                  }
                  placeholder="España"
                />
              </div>
              <div className="field field--full">
                <label htmlFor="seller-iban">{tr.iban}</label>
                <input
                  id="seller-iban"
                  type="text"
                  value={seller.iban}
                  onChange={(e) => handleSellerChange("iban", e.target.value)}
                  placeholder="ES00 0000 0000 0000 0000 0000"
                />
              </div>
            </div>
          </div>

          <div className="card-column">
            <h2 className="card-title">{tr.clientData}</h2>
            <div className="field-grid">
              <div className="field">
                <label htmlFor="client-name">{tr.clientName}</label>
                <input
                  id="client-name"
                  type="text"
                  value={client.name}
                  onChange={(e) => handleClientChange("name", e.target.value)}
                  placeholder="Cliente"
                />
              </div>
              <div className="field">
                <label htmlFor="client-nif">{tr.nif}</label>
                <input
                  id="client-nif"
                  type="text"
                  value={client.nif}
                  onChange={(e) => handleClientChange("nif", e.target.value)}
                  placeholder="B12345678"
                />
              </div>
              <div className="field">
                <label htmlFor="client-phone">{tr.phone}</label>
                <input
                  id="client-phone"
                  type="tel"
                  value={client.phone}
                  onChange={(e) => handleClientChange("phone", e.target.value)}
                  placeholder="+34 ..."
                />
              </div>
              <div className="field">
                <label htmlFor="client-email">{tr.email}</label>
                <input
                  id="client-email"
                  type="email"
                  value={client.email}
                  onChange={(e) => handleClientChange("email", e.target.value)}
                  placeholder="email@cliente.com"
                />
              </div>
              <div className="field">
                <label htmlFor="client-address">{tr.address}</label>
                <input
                  id="client-address"
                  type="text"
                  value={client.address}
                  onChange={(e) =>
                    handleClientChange("address", e.target.value)
                  }
                  placeholder="Calle, número"
                />
              </div>
              <div className="field">
                <label htmlFor="client-city">{tr.city}</label>
                <input
                  id="client-city"
                  type="text"
                  value={client.city}
                  onChange={(e) => handleClientChange("city", e.target.value)}
                  placeholder={tr.city}
                />
              </div>
              <div className="field">
                <label htmlFor="client-postal">{tr.postalCode}</label>
                <input
                  id="client-postal"
                  type="text"
                  value={client.postalCode}
                  onChange={(e) =>
                    handleClientChange("postalCode", e.target.value)
                  }
                  placeholder="08001"
                />
              </div>
              <div className="field">
                <label htmlFor="client-country">{tr.country}</label>
                <input
                  id="client-country"
                  type="text"
                  value={client.country}
                  onChange={(e) =>
                    handleClientChange("country", e.target.value)
                  }
                  placeholder="España"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <h2 className="card-title">{tr.concepts}</h2>
          </div>
          <div className="items-table">
            <div className="items-table__header">
              <span>{tr.concept}</span>
              <span>{tr.unitPrice}</span>
              <span>{tr.qty}</span>
              <span>{tr.discount}</span>
              <span>{tr.vat}</span>
              <span>{tr.irpf}</span>
              <span>{tr.amount}</span>
              <span />
            </div>
            <div className="items-table__body">
              {items.map((item, index) => {
                const calc = itemCalculations[index];
                return (
                  <div key={item.id} className="items-table__row">
                    <input
                      type="text"
                      placeholder={tr.concept}
                      value={item.description}
                      onChange={(e) =>
                        updateItem(item.id, "description", e.target.value)
                      }
                      aria-label={`${tr.concept} ${index + 1}`}
                    />
                    <input
                      type="text"
                      inputMode="decimal"
                      pattern="[0-9.,]*"
                      value={item.unitPrice}
                      onChange={(e) =>
                        updateItem(item.id, "unitPrice", e.target.value)
                      }
                      aria-label={`${tr.unitPrice} ${index + 1}`}
                    />
                    <input
                      type="text"
                      inputMode="decimal"
                      pattern="[0-9.,]*"
                      value={item.quantity}
                      onChange={(e) =>
                        updateItem(item.id, "quantity", e.target.value)
                      }
                      aria-label={`${tr.qty} ${index + 1}`}
                    />
                    <input
                      type="text"
                      inputMode="decimal"
                      pattern="[0-9.,]*"
                      value={item.discount}
                      onChange={(e) =>
                        updateItem(item.id, "discount", e.target.value)
                      }
                      onBlur={() => clampPercentField(item.id, "discount")}
                      aria-label={`${tr.discount} ${index + 1}`}
                    />
                    <input
                      type="text"
                      inputMode="decimal"
                      pattern="[0-9.,]*"
                      value={item.vat}
                      onChange={(e) =>
                        updateItem(item.id, "vat", e.target.value)
                      }
                      onBlur={() => clampPercentField(item.id, "vat")}
                      aria-label={`${tr.vat} ${index + 1}`}
                    />
                    <input
                      type="text"
                      inputMode="decimal"
                      pattern="[0-9.,]*"
                      value={item.irpf}
                      onChange={(e) =>
                        updateItem(item.id, "irpf", e.target.value)
                      }
                      onBlur={() => clampPercentField(item.id, "irpf")}
                      aria-label={`${tr.irpf} ${index + 1}`}
                    />
                    <div className="items-table__amount">
                      {formatAmount(calc.lineTotal || 0)}
                    </div>
                    <button
                      type="button"
                      className="items-table__remove"
                      onClick={() => removeItem(item.id)}
                      aria-label={`Eliminar concepto: ${
                        item.description || "Sin descripción"
                      }`}
                      title="Eliminar concepto"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <button type="button" className="btn-secondary" onClick={addItem}>
            {tr.addConcept}
          </button>
        </section>

        <section className="bottom-grid">
          <div className="card">
            <div className="field field--full">
              <label htmlFor="notes">{tr.notes}</label>
              <textarea
                id="notes"
                rows={4}
                placeholder={tr.defaultNotes}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <div className="bottom-right">
            <div className="card card--totals">
              <dl className="totals">
                <div className="totals__row">
                  <dt>{tr.totalsTaxBase}</dt>
                  <dd>{formatAmount(totals.base)}</dd>
                </div>
                <div className="totals__row">
                  <dt>{tr.totalsVat}</dt>
                  <dd>{formatAmount(totals.vatTotal)}</dd>
                </div>
                <div className="totals__row">
                  <dt>{tr.totalsIrpf}</dt>
                  <dd>{formatAmount(totals.irpfTotal)}</dd>
                </div>
                <div className="totals__row totals__row--total">
                  <dt>{tr.totalsTotal}</dt>
                  <dd>{formatAmount(totals.total)}</dd>
                </div>
              </dl>
            </div>

            <button
              type="button"
              className="btn-primary"
              onClick={handleDownload}
              disabled={!hasFormData}
            >
              {tr.createAndDownload}
            </button>
            {downloadError && !hasFormData && (
              <p className="form-warning" role="alert">
                {downloadError}
              </p>
            )}
          </div>
        </section>

        <footer className="app-footer">
          <p>
            Esta web no guarda ninguna información de tus facturas. Todos los
            datos se procesan únicamente en tu navegador.
          </p>
        </footer>
      </div>
    </div>
  );
}
