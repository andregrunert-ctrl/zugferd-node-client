export const DEFAULT_UPGRADE_URL = "https://e-rechnung-cloud.de/#pricing";
export const LEITWEG_REGIONS = {
    "01": "Schleswig-Holstein",
    "02": "Freie und Hansestadt Hamburg",
    "03": "Niedersachsen",
    "04": "Freie Hansestadt Bremen",
    "05": "Nordrhein-Westfalen",
    "06": "Hessen",
    "07": "Rheinland-Pfalz",
    "08": "Baden-Württemberg",
    "09": "Freistaat Bayern",
    "10": "Saarland",
    "11": "Berlin",
    "12": "Brandenburg",
    "13": "Mecklenburg-Vorpommern",
    "14": "Freistaat Sachsen",
    "15": "Sachsen-Anhalt",
    "16": "Freistaat Thüringen",
    "99": "Bund / Bundesverwaltung"
};
export class ZugferdClient {
    apiKey;
    baseUrl;
    headers;
    isTestMode;
    constructor(options = {}) {
        this.apiKey = options.apiKey || "zg_test_ouroboros_001";
        this.baseUrl = (options.baseUrl || "https://e-rechnung-cloud.de").replace(/\/+$/, "");
        this.headers = options.headers || {};
        this.isTestMode =
            this.apiKey === "zg_test_ouroboros_001" ||
                this.apiKey === "api_key_test_public" ||
                this.apiKey.startsWith("zg_test_");
        const isInternalCi = typeof globalThis !== "undefined" &&
            globalThis.process?.env &&
            (globalThis.process.env.ZUGFERD_INTERNAL_CI === "1" ||
                globalThis.process.env.ZUGFERD_INTERNAL_CI === "true");
        if (this.isTestMode && !options.suppressTestWarning && !isInternalCi && typeof console !== "undefined") {
            console.warn(`[zugferd-client] Kostenloser Testmodus aktiv (Test-Wasserzeichen & 5 Req/Min). Live-API-Key ohne Wasserzeichen (100 Rechnungen für 10 € ohne Abo): ${DEFAULT_UPGRADE_URL}`);
        }
    }
    getHeaders(contentType) {
        const headers = {
            "User-Agent": "zugferd-client-node/0.1.2",
            "X-API-Key": this.apiKey,
            ...this.headers
        };
        const procEnv = typeof globalThis !== "undefined" ? globalThis.process?.env : undefined;
        if (procEnv && (procEnv.ZUGFERD_INTERNAL_CI === "1" || procEnv.ZUGFERD_INTERNAL_CI === "true")) {
            headers["X-Internal-Check"] = "true";
        }
        if (contentType) {
            headers["Content-Type"] = contentType;
        }
        return headers;
    }
    buildHttpError(action, status, errorText) {
        const upgradeHint = status === 401 || status === 402 || status === 429
            ? ` -> Live-API-Key / Guthaben ohne Abo holen (100 Rechnungen für 10 €): ${DEFAULT_UPGRADE_URL}`
            : "";
        return new Error(`Fehler bei ${action} (${status}): ${errorText}${upgradeHint}`);
    }
    async generateInvoice(data) {
        const url = `${this.baseUrl}/v1/invoice/generate`;
        const response = await fetch(url, {
            method: "POST",
            headers: this.getHeaders("application/json"),
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw this.buildHttpError("ZUGFeRD-Generierung", response.status, errorText);
        }
        const buffer = await response.arrayBuffer();
        return new Uint8Array(buffer);
    }
    async generateXRechnung(data) {
        const url = `${this.baseUrl}/v1/invoice/xrechnung`;
        const response = await fetch(url, {
            method: "POST",
            headers: this.getHeaders("application/json"),
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw this.buildHttpError("XRechnung-Generierung", response.status, errorText);
        }
        return await response.text();
    }
    async embedInvoice(pdfFile, data) {
        const url = `${this.baseUrl}/v1/invoice/embed`;
        const formData = new FormData();
        const blob = pdfFile instanceof Blob ? pdfFile : new Blob([pdfFile], { type: "application/pdf" });
        formData.append("file", blob, "source.pdf");
        formData.append("invoice_data", JSON.stringify(data));
        const response = await fetch(url, {
            method: "POST",
            headers: this.getHeaders(),
            body: formData
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw this.buildHttpError("ZUGFeRD-Einbettung", response.status, errorText);
        }
        const buffer = await response.arrayBuffer();
        return new Uint8Array(buffer);
    }
    async validateInvoice(file, filename = "invoice.pdf") {
        const url = `${this.baseUrl}/v1/invoice/validate`;
        const formData = new FormData();
        const contentType = filename.toLowerCase().endsWith(".xml") ? "application/xml" : "application/pdf";
        const blob = file instanceof Blob ? file : new Blob([file], { type: contentType });
        formData.append("file", blob, filename);
        const response = await fetch(url, {
            method: "POST",
            headers: this.getHeaders(),
            body: formData
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw this.buildHttpError("E-Rechnung-Validierung", response.status, errorText);
        }
        return (await response.json());
    }
    async getBillingStatus() {
        const url = `${this.baseUrl}/v1/invoice/billing/status`;
        const response = await fetch(url, {
            method: "GET",
            headers: this.getHeaders()
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw this.buildHttpError("Statusabfrage", response.status, errorText);
        }
        return (await response.json());
    }
    static calculateLeitwegId(rawId) {
        const trimmed = rawId.trim();
        const parts = trimmed.split("-");
        const clean = trimmed.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
        if (clean.length < 4) {
            return {
                is_valid: false,
                region: "Unbekannt",
                grob: trimmed,
                fein: "-",
                check: "",
                message: "Zu kurz (mindestens 4 Zeichen erforderlich)"
            };
        }
        const regionCode = clean.substring(0, 2);
        const regionName = LEITWEG_REGIONS[regionCode] || `Sonstige Körperschaft (${regionCode})`;
        let grob = "";
        let fein = "";
        let checkDigit = "";
        let isFull = false;
        if (parts.length >= 3) {
            grob = parts[0];
            fein = parts.slice(1, -1).join("-");
            checkDigit = parts[parts.length - 1];
            isFull = checkDigit.length === 2 && !isNaN(parseInt(checkDigit, 10));
        }
        else if (parts.length === 2) {
            grob = parts[0];
            if (parts[1].length === 2 && !isNaN(parseInt(parts[1], 10))) {
                checkDigit = parts[1];
                isFull = true;
            }
            else {
                fein = parts[1];
            }
        }
        else {
            grob = trimmed;
        }
        const calcCheck = (baseClean) => {
            let numStr = "";
            for (const char of baseClean) {
                if (char >= "0" && char <= "9") {
                    numStr += char;
                }
                else if (char >= "A" && char <= "Z") {
                    numStr += (char.charCodeAt(0) - 65 + 10).toString();
                }
            }
            if (!numStr)
                return "00";
            const fullNum = BigInt(numStr + "00");
            const remainder = fullNum % 97n;
            const check = (98n - remainder) % 97n;
            return check < 10n ? "0" + check.toString() : check.toString();
        };
        if (isFull) {
            let numStr = "";
            for (const char of clean) {
                if (char >= "0" && char <= "9") {
                    numStr += char;
                }
                else if (char >= "A" && char <= "Z") {
                    numStr += (char.charCodeAt(0) - 65 + 10).toString();
                }
            }
            const isValid = BigInt(numStr) % 97n === 1n;
            const baseForCalc = clean.substring(0, clean.length - 2);
            const expectedCheck = calcCheck(baseForCalc);
            return {
                is_valid: isValid,
                region: `${regionName} (${regionCode})`,
                grob: grob,
                fein: fein || "-",
                check: checkDigit,
                expected_check: expectedCheck,
                message: isValid
                    ? "Gültige Leitweg-ID nach DIN EN 16931-1 & KoSIT"
                    : `Ungültige Prüfziffer! Erwartet: ${expectedCheck}, Gefunden: ${checkDigit}`
            };
        }
        else {
            const calculated = calcCheck(clean);
            return {
                is_valid: true,
                region: `${regionName} (${regionCode})`,
                grob: grob,
                fein: fein || "-",
                check: calculated,
                expected_check: calculated,
                message: `Prüfziffer ${calculated} erfolgreich nach ISO 7064 MOD 97-10 berechnet`
            };
        }
    }
}
