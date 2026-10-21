export interface Address {
    name: string;
    street: string;
    city: string;
    zip_code: string;
    country: string;
}
export interface Seller extends Address {
    vat_id: string;
    iban: string;
}
export interface Buyer extends Address {
}
export interface LineItem {
    description: string;
    quantity: number;
    unit_price: number;
    tax_rate_percent: number;
}
export interface InvoiceRequest {
    invoice_number: string;
    issue_date: string;
    buyer_reference?: string;
    seller: Seller;
    buyer: Buyer;
    line_items: LineItem[];
    currency?: string;
    logo_url?: string;
    total_net_amount?: number;
    tax_amounts?: Record<string, number>;
    total_gross_amount?: number;
}
export interface ValidationResponse {
    is_valid: boolean;
    format_detected?: string;
    errors?: string[];
    message?: string;
}
export interface BillingStatusResponse {
    credits_remaining: number | string;
    total_invoices_generated: number;
    tier: string;
    is_active: boolean;
    customer_email?: string;
}
export interface LeitwegIdResult {
    is_valid: boolean;
    region: string;
    grob: string;
    fein: string;
    check: string;
    expected_check?: string;
    message: string;
}
export interface ClientOptions {
    apiKey?: string;
    baseUrl?: string;
}
export declare const LEITWEG_REGIONS: Record<string, string>;
export declare class ZugferdClient {
    apiKey: string;
    baseUrl: string;
    constructor(options?: ClientOptions);
    private getHeaders;
    generateInvoice(data: InvoiceRequest): Promise<Uint8Array>;
    generateXRechnung(data: InvoiceRequest): Promise<string>;
    embedInvoice(pdfFile: Blob | Uint8Array | ArrayBuffer, data: InvoiceRequest): Promise<Uint8Array>;
    validateInvoice(file: Blob | Uint8Array | ArrayBuffer, filename?: string): Promise<ValidationResponse>;
    getBillingStatus(): Promise<BillingStatusResponse>;
    static calculateLeitwegId(rawId: string): LeitwegIdResult;
}
