# zugferd-client

> Offizieller TypeScript & Node.js Client für die [E-Rechnung Cloud API](https://e-rechnung-cloud.de). Erstelle, erweitere und validiere rechtskonforme deutsche und europäische E-Rechnungen (**ZUGFeRD 2.2 / Factur-X & XRechnung**) nach **EN 16931**.

Zero Dependencies. Nativer `fetch`-Support (Node.js 18+, Bun, Deno, Next.js, Cloudflare Workers, Vercel, Browser).

---

## 📦 Installation

```bash
npm install zugferd-client
# oder
pnpm add zugferd-client
# oder
yarn add zugferd-client
```

---

## ⚡ Schnellstart

Du kannst die API sofort und ohne Registrierung mit unserem öffentlichen Test-Key `zg_test_ouroboros_001` nutzen:

### 1. ZUGFeRD 2.2 / Factur-X PDF/A-3 erstellen (TypeScript / ESM)

```typescript
import { ZugferdClient } from "zugferd-client";
import * as fs from "node:fs/promises";

const client = new ZugferdClient({
  apiKey: "zg_test_ouroboros_001" // Kostenloser Test-Key
});

async function main() {
  const pdfBytes = await client.generateInvoice({
    invoice_number: "RE-2026-001",
    issue_date: "2026-10-21",
    currency: "EUR",
    seller: {
      name: "Muster GmbH",
      street: "Hauptstraße 1",
      zip_code: "10115",
      city: "Berlin",
      country: "DE",
      vat_id: "DE123456789",
      iban: "DE12345678901234567890"
    },
    buyer: {
      name: "Kunde AG",
      street: "Industriestraße 4",
      zip_code: "80331",
      city: "München",
      country: "DE"
    },
    line_items: [
      {
        description: "IT-Beratung & Cloud-Services 2026",
        quantity: 10,
        unit_price: 120.0,
        tax_rate_percent: 19.0
      }
    ]
  });

  await fs.writeFile("rechnung.pdf", Buffer.from(pdfBytes));
  console.log("Valide ZUGFeRD-Rechnung erfolgreich gespeichert! 🎉");
}

main();
```

---

### 2. Reine XRechnung für Behörden (B2G XML) generieren

```typescript
const xmlString = await client.generateXRechnung({
  invoice_number: "XREC-2026-001",
  issue_date: "2026-10-21",
  currency: "EUR",
  buyer_reference: "04011000-1234512345-06", // Behörden Leitweg-ID (BT-10)
  seller: {
    name: "IT Solutions GmbH",
    street: "Musterstraße 42",
    zip_code: "10115",
    city: "Berlin",
    country: "DE",
    vat_id: "DE123456789",
    iban: "DE12345678901234567890"
  },
  buyer: {
    name: "Öffentlicher Auftraggeber (Behörde)",
    street: "Rathausplatz 1",
    zip_code: "28195",
    city: "Bremen",
    country: "DE"
  },
  line_items: [
    {
      description: "Dienstleistung nach DIN EN 16931",
      quantity: 1,
      unit_price: 150.0,
      tax_rate_percent: 19.0
    }
  ]
});

console.log(xmlString); // UN/CEFACT CII XML
```

---

### 3. E-Rechnung validieren (Zero-Data RAM Parsing)

```typescript
const validation = await client.validateInvoice(fileBytes, "rechnung.pdf");

if (validation.is_valid) {
  console.log("Rechnung ist EN-16931-konform:", validation.format_detected);
} else {
  console.error("Validierungsfehler:", validation.errors);
}
```

---

### 4. Leitweg-ID lokal prüfen & berechnen (ISO 7064 MOD 97-10)

```typescript
const result = ZugferdClient.calculateLeitwegId("04011000-1234512345-06");
console.log(result.is_valid); // true
console.log(result.region);   // Freie Hansestadt Bremen (04)
console.log(result.check);    // 06
```

---

## 🛡️ Rechtlicher Hinweis (§ 23 MarkenG)

ZUGFeRD ist eine eingetragene Marke der AWV e.V. Dieses Projekt ist unabhängig. Die Nennung der Marke erfolgt ausschließlich zur beschreibenden Angabe der Formatkompatibilität im Sinne von § 23 Abs. 1 Nr. 3 MarkenG.

---

## 📄 Lizenz

MIT License &copy; 2026 [E-Rechnung Cloud API](https://e-rechnung-cloud.de).
