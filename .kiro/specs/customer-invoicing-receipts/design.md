# Design Document

## Overview

The Customer Invoicing & Receipts system is a comprehensive financial document management solution that handles invoice generation, receipt processing, tax compliance, and accounting integration for C9D.AI. The system is designed as a modular, event-driven architecture that integrates with Stripe for payment processing, supports multiple currencies and tax jurisdictions, generates professional PDF documents, and provides both customer-facing and administrative interfaces.

### Key Design Goals

1. **Financial Accuracy**: Ensure all calculations are precise using integer arithmetic (cents) to prevent rounding errors
2. **Compliance**: Support international tax regulations (VAT, GST, sales tax) with proper documentation
3. **Scalability**: Handle high volumes of invoices with efficient batch processing and caching
4. **Auditability**: Maintain complete audit trails for all financial operations
5. **Integration**: Seamless integration with Stripe, accounting systems, and email delivery
6. **User Experience**: Professional document generation and intuitive customer portal

## Architecture

### System Architecture

The system follows a layered architecture with clear separation of concerns, deployed on Vercel with Next.js App Router:

```
┌─────────────────────────────────────────────────────────────┐
│                     Presentation Layer                       │
│  ┌──────────────────┐         ┌──────────────────┐         │
│  │  Admin Dashboard │         │  Customer Portal │         │
│  │  - Invoice Mgmt  │         │  - View Invoices │         │
│  │  - Analytics     │         │  - Download PDFs │         │
│  │  - Templates     │         │  - Payment       │         │
│  └──────────────────┘         └──────────────────┘         │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                API Layer (Next.js App Router)                │
│  app/api/invoices/*  app/api/receipts/*  app/api/billing/*  │
│  - Server Components for data fetching                       │
│  - API Routes for mutations                                  │
│  - Clerk authentication middleware                           │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                      Service Layer                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Invoice    │  │   Receipt    │  │     Tax      │     │
│  │   Service    │  │   Service    │  │   Service    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │     PDF      │  │    Email     │  │  Accounting  │     │
│  │   Service    │  │   Service    │  │   Service    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    Repository Layer                          │
│  Invoice Repo  │  Receipt Repo  │  Tax Rate Repo            │
│  - Drizzle ORM for type-safe queries                         │
│  - Zod schemas for validation                                │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    Data Layer (Supabase)                     │
│  invoices  │  line_items  │  receipts  │  tax_rates         │
│  - PostgreSQL with Row Level Security                        │
│  - Existing schema integration                               │
│  - Connection pooling via Supabase                           │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                   External Integrations                      │
│  Stripe  │  QuickBooks  │  Xero  │  Email (SendGrid)        │
│  Redis (Vercel KV) for caching and job queues               │
└─────────────────────────────────────────────────────────────┘
```

### Deployment Architecture (Vercel)

**Vercel-Specific Considerations:**
- **Edge Functions**: Use for geographically distributed invoice access
- **Serverless Functions**: API routes with 30-second timeout for complex operations
- **Vercel KV (Redis)**: Caching layer and job queue management
- **Vercel Blob Storage**: PDF document storage with CDN distribution
- **Environment Variables**: Managed via Phase.dev integration
- **Build Optimization**: Turbo for monorepo build orchestration

**Function Timeout Strategy:**
- Standard API routes: 10 seconds (default)
- PDF generation: 30 seconds (configured)
- Bulk operations: Background jobs via Vercel Cron + Queue
- Email delivery: Async via queue (non-blocking)

### Integration with Existing Architecture

**Database Schema Integration:**
- Extend existing Supabase schema with new invoice tables
- Use existing `organizations` and `users` tables via foreign keys
- Maintain consistency with existing naming conventions (snake_case)
- Leverage existing RLS policies for organization isolation
- Use existing Drizzle ORM setup and migration patterns

**Authentication Integration:**
- Use existing Clerk setup for user authentication
- Leverage existing organization membership for access control
- Integrate with existing RBAC system for permissions
- Use existing middleware patterns for route protection

**Shared Infrastructure:**
- Use existing Redis (Vercel KV) instance for caching
- Integrate with existing email service configuration
- Use existing monitoring and error tracking (Sentry)
- Follow existing API response format conventions

### Event-Driven Workflows

The system uses event-driven architecture for asynchronous processing:

1. **Billing Event** → Invoice Generation → PDF Creation → Email Delivery
2. **Payment Success** → Receipt Generation → Invoice Update → Accounting Sync
3. **Refund Request** → Credit Note Creation → Payment Gateway → Email Notification

**Background Job Processing:**
- Use Vercel Cron for scheduled tasks (overdue checks, reminders)
- Use Vercel KV for job queue management
- Implement idempotent job handlers for retry safety
- Use webhook endpoints for external service callbacks


## Components and Interfaces

### Core Services

#### InvoiceService

Primary service for invoice lifecycle management.

```typescript
interface InvoiceService {
  // Invoice creation and management
  createInvoice(data: CreateInvoiceInput): Promise<Invoice>
  updateInvoice(id: string, data: UpdateInvoiceInput): Promise<Invoice>
  getInvoice(id: string): Promise<Invoice>
  listInvoices(filters: InvoiceFilters): Promise<PaginatedInvoices>
  
  // Status management
  markAsPaid(id: string, paymentData: PaymentData): Promise<Invoice>
  markAsOverdue(id: string): Promise<Invoice>
  voidInvoice(id: string, reason: string): Promise<Invoice>
  
  // Line item management
  addLineItem(invoiceId: string, item: LineItemInput): Promise<LineItem>
  updateLineItem(itemId: string, data: LineItemUpdate): Promise<LineItem>
  removeLineItem(itemId: string): Promise<void>
  
  // Calculations
  calculateTotals(invoice: Invoice): InvoiceTotals
  calculateProration(startDate: Date, endDate: Date, amount: number): number
  
  // Bulk operations
  bulkSendReminders(invoiceIds: string[]): Promise<BulkOperationResult>
  bulkExport(invoiceIds: string[]): Promise<ExportResult>
}
```

#### ReceiptService

Handles receipt generation and delivery.

```typescript
interface ReceiptService {
  // Receipt operations
  generateReceipt(paymentData: PaymentData): Promise<Receipt>
  getReceipt(id: string): Promise<Receipt>
  listReceipts(filters: ReceiptFilters): Promise<PaginatedReceipts>
  
  // Delivery
  sendReceipt(receiptId: string, email: string): Promise<DeliveryResult>
  resendReceipt(receiptId: string): Promise<DeliveryResult>
}
```

#### TaxService

Manages tax calculations and compliance.

```typescript
interface TaxService {
  // Tax calculation
  calculateTax(amount: number, jurisdiction: TaxJurisdiction): TaxCalculation
  getTaxRate(jurisdiction: TaxJurisdiction, date: Date): TaxRate
  
  // Tax validation
  validateTaxId(taxId: string, country: string): Promise<TaxIdValidation>
  isReverseChargeApplicable(customer: Customer): boolean
  
  // Reporting
  generateTaxReport(period: DateRange): Promise<TaxReport>
  aggregateTaxByJurisdiction(period: DateRange): Promise<TaxAggregation[]>
}
```

#### PDFService

Generates professional PDF documents.

```typescript
interface PDFService {
  // PDF generation
  generateInvoicePDF(invoice: Invoice, template: InvoiceTemplate): Promise<Buffer>
  generateReceiptPDF(receipt: Receipt, template: ReceiptTemplate): Promise<Buffer>
  generateCreditNotePDF(creditNote: CreditNote, template: InvoiceTemplate): Promise<Buffer>
  
  // Template management
  getTemplate(organizationId: string, type: DocumentType): Promise<Template>
  updateTemplate(organizationId: string, template: TemplateUpdate): Promise<Template>
  previewTemplate(template: Template, sampleData: any): Promise<Buffer>
}
```

#### EmailService

Handles email delivery with retry logic.

```typescript
interface EmailService {
  // Email operations
  sendInvoiceEmail(invoice: Invoice, recipient: string): Promise<EmailResult>
  sendReceiptEmail(receipt: Receipt, recipient: string): Promise<EmailResult>
  sendReminderEmail(invoice: Invoice, recipient: string): Promise<EmailResult>
  sendOverdueNotice(invoice: Invoice, recipient: string): Promise<EmailResult>
  
  // Bulk operations
  sendBulkEmails(emails: EmailData[]): Promise<BulkEmailResult>
  
  // Tracking
  trackEmailStatus(emailId: string): Promise<EmailStatus>
}
```

#### AccountingService

Integrates with external accounting systems.

```typescript
interface AccountingService {
  // Sync operations
  syncInvoice(invoice: Invoice): Promise<SyncResult>
  syncCreditNote(creditNote: CreditNote): Promise<SyncResult>
  syncPayment(payment: Payment): Promise<SyncResult>
  
  // Configuration
  configureIntegration(config: AccountingConfig): Promise<void>
  testConnection(): Promise<ConnectionStatus>
  
  // Mapping
  mapAccountingCategories(lineItems: LineItem[]): Promise<CategoryMapping[]>
}
```

### Repository Layer

#### InvoiceRepository

```typescript
interface InvoiceRepository {
  create(invoice: InvoiceInsert): Promise<Invoice>
  update(id: string, data: InvoiceUpdate): Promise<Invoice>
  findById(id: string): Promise<Invoice | null>
  findByNumber(invoiceNumber: string): Promise<Invoice | null>
  findByCustomer(customerId: string, filters?: InvoiceFilters): Promise<Invoice[]>
  findOverdue(asOfDate: Date): Promise<Invoice[]>
  findByStatus(status: InvoiceStatus): Promise<Invoice[]>
  delete(id: string): Promise<void>
}
```

#### LineItemRepository

```typescript
interface LineItemRepository {
  create(item: LineItemInsert): Promise<LineItem>
  update(id: string, data: LineItemUpdate): Promise<LineItem>
  findById(id: string): Promise<LineItem | null>
  findByInvoice(invoiceId: string): Promise<LineItem[]>
  delete(id: string): Promise<void>
}
```

#### ReceiptRepository

```typescript
interface ReceiptRepository {
  create(receipt: ReceiptInsert): Promise<Receipt>
  findById(id: string): Promise<Receipt | null>
  findByNumber(receiptNumber: string): Promise<Receipt | null>
  findByInvoice(invoiceId: string): Promise<Receipt[]>
  findByCustomer(customerId: string): Promise<Receipt[]>
}
```


## Data Models

### Database Schema

**Integration with Existing Schema:**
- All new tables follow existing naming conventions (snake_case)
- Foreign keys reference existing `organizations` and `users` tables
- Use existing Drizzle ORM patterns and migration structure
- Maintain consistency with existing RLS policies
- Extend existing audit logging patterns

**Schema Location:**
- Tables created in existing Supabase database
- Migrations managed via existing Drizzle migration system
- Schema files in `apps/web/lib/database/schema/invoicing.ts`

#### invoices

```typescript
interface Invoice {
  id: string                    // UUID primary key
  invoice_number: string        // Unique, format: INV-{YEAR}-{SEQUENCE}
  organization_id: string       // FK to existing organizations table
  customer_id: string           // FK to existing users table
  
  // Financial data (stored in cents)
  subtotal_cents: number        // Sum of line items before tax
  tax_cents: number             // Total tax amount
  discount_cents: number        // Total discounts applied
  total_cents: number           // Final amount due
  paid_cents: number            // Amount paid so far
  currency: string              // ISO 4217 code (USD, EUR, GBP)
  
  // Status and dates
  status: InvoiceStatus         // draft, issued, paid, overdue, void, refunded
  issue_date: Date              // When invoice was issued
  due_date: Date                // Payment due date
  paid_date: Date | null        // When fully paid
  
  // Customer information (denormalized for historical accuracy)
  customer_name: string
  customer_email: string
  billing_address: Address
  tax_id: string | null         // Customer's tax ID (VAT, EIN, etc.)
  
  // Billing period
  period_start: Date | null     // For subscription invoices
  period_end: Date | null       // For subscription invoices
  
  // Metadata
  notes: string | null          // Internal notes
  customer_notes: string | null // Notes visible to customer
  metadata: Record<string, any> // Additional custom data
  
  // Audit
  created_at: Date
  updated_at: Date
  created_by: string            // User ID who created
  voided_at: Date | null
  voided_by: string | null
  void_reason: string | null
}

type InvoiceStatus = 
  | 'draft'      // Being prepared, not sent
  | 'issued'     // Sent to customer, awaiting payment
  | 'paid'       // Fully paid
  | 'overdue'    // Past due date, unpaid
  | 'void'       // Cancelled/voided
  | 'refunded'   // Fully refunded
```

#### line_items

```typescript
interface LineItem {
  id: string                    // UUID primary key
  invoice_id: string            // FK to invoices
  
  // Item details
  description: string           // What is being charged
  type: LineItemType            // subscription, usage, one_time, discount, tax
  
  // Pricing (stored in cents)
  quantity: number              // Decimal quantity (e.g., 1.5 for prorated)
  unit_price_cents: number      // Price per unit
  amount_cents: number          // quantity × unit_price_cents
  
  // Subscription-specific
  period_start: Date | null     // For subscription items
  period_end: Date | null       // For subscription items
  is_prorated: boolean          // Whether this is a prorated charge
  
  // Usage-specific
  usage_metric: string | null   // e.g., "api_calls", "ai_tokens"
  usage_quantity: number | null // Actual usage amount
  
  // Tax
  taxable: boolean              // Whether tax applies
  tax_rate: number | null       // Tax rate applied (as decimal, e.g., 0.20 for 20%)
  tax_cents: number             // Tax amount for this item
  
  // Metadata
  metadata: Record<string, any>
  sort_order: number            // Display order
  
  // Audit
  created_at: Date
  updated_at: Date
}

type LineItemType = 
  | 'subscription'  // Recurring subscription charge
  | 'usage'         // Usage-based charge
  | 'one_time'      // One-time purchase
  | 'discount'      // Discount (negative amount)
  | 'credit'        // Credit applied (negative amount)
  | 'tax'           // Tax line item
```

#### receipts

```typescript
interface Receipt {
  id: string                    // UUID primary key
  receipt_number: string        // Unique, format: RCT-{YEAR}-{SEQUENCE}
  invoice_id: string            // FK to invoices
  organization_id: string       // FK to organizations
  customer_id: string           // FK to users/customers
  
  // Payment details
  amount_cents: number          // Amount paid (in cents)
  currency: string              // ISO 4217 code
  payment_date: Date            // When payment was received
  payment_method: string        // e.g., "card", "bank_transfer"
  payment_method_details: string // e.g., "Visa ****1234"
  
  // External references
  stripe_payment_intent_id: string | null
  stripe_charge_id: string | null
  transaction_id: string | null // Generic transaction reference
  
  // Customer information (denormalized)
  customer_name: string
  customer_email: string
  
  // Delivery
  email_sent: boolean
  email_sent_at: Date | null
  email_delivery_status: string | null
  
  // Metadata
  notes: string | null
  metadata: Record<string, any>
  
  // Audit
  created_at: Date
  updated_at: Date
}
```

#### credit_notes

```typescript
interface CreditNote {
  id: string                    // UUID primary key
  credit_note_number: string    // Unique, format: CN-{YEAR}-{SEQUENCE}
  invoice_id: string            // FK to original invoice
  organization_id: string       // FK to organizations
  customer_id: string           // FK to users/customers
  
  // Credit details
  amount_cents: number          // Credit amount (in cents)
  currency: string              // ISO 4217 code
  reason: string                // Why credit was issued
  type: CreditNoteType          // full_refund, partial_refund, adjustment
  
  // Status
  status: CreditNoteStatus      // draft, issued, applied
  issue_date: Date
  applied_date: Date | null     // When credit was applied
  
  // Refund details
  refund_initiated: boolean
  refund_completed: boolean
  refund_date: Date | null
  stripe_refund_id: string | null
  
  // Customer information (denormalized)
  customer_name: string
  customer_email: string
  
  // Metadata
  notes: string | null
  metadata: Record<string, any>
  
  // Audit
  created_at: Date
  updated_at: Date
  created_by: string
}

type CreditNoteType = 
  | 'full_refund'     // Full invoice refund
  | 'partial_refund'  // Partial invoice refund
  | 'adjustment'      // Billing adjustment/correction

type CreditNoteStatus = 
  | 'draft'    // Being prepared
  | 'issued'   // Sent to customer
  | 'applied'  // Applied to customer account
```

#### tax_rates

```typescript
interface TaxRate {
  id: string                    // UUID primary key
  organization_id: string       // FK to organizations
  
  // Jurisdiction
  country: string               // ISO 3166-1 alpha-2 code
  state: string | null          // State/province code
  jurisdiction_name: string     // Display name
  
  // Rate details
  tax_type: TaxType             // vat, gst, sales_tax
  rate: number                  // Tax rate as decimal (e.g., 0.20 for 20%)
  
  // Validity
  effective_from: Date          // When rate becomes effective
  effective_to: Date | null     // When rate expires (null = current)
  
  // Rules
  applies_to_b2b: boolean       // Applies to business customers
  applies_to_b2c: boolean       // Applies to consumer customers
  reverse_charge_eligible: boolean // EU reverse charge mechanism
  
  // Metadata
  description: string | null
  metadata: Record<string, any>
  
  // Audit
  created_at: Date
  updated_at: Date
}

type TaxType = 
  | 'vat'        // Value Added Tax (EU)
  | 'gst'        // Goods and Services Tax
  | 'sales_tax'  // US Sales Tax
  | 'other'      // Other tax types
```

#### invoice_templates

```typescript
interface InvoiceTemplate {
  id: string                    // UUID primary key
  organization_id: string       // FK to organizations
  
  // Branding
  logo_url: string | null       // Company logo
  primary_color: string         // Hex color for headers
  accent_color: string          // Hex color for accents
  
  // Company information
  company_name: string
  company_address: Address
  company_tax_id: string | null
  company_email: string | null
  company_phone: string | null
  company_website: string | null
  
  // Content
  header_text: string | null    // Custom header text
  footer_text: string | null    // Payment terms, disclaimers
  thank_you_message: string | null
  
  // Layout
  show_logo: boolean
  show_tax_id: boolean
  show_payment_terms: boolean
  date_format: string           // e.g., "MM/DD/YYYY", "DD/MM/YYYY"
  
  // Metadata
  is_default: boolean
  metadata: Record<string, any>
  
  // Audit
  created_at: Date
  updated_at: Date
}
```

#### invoice_audit_log

```typescript
interface InvoiceAuditLog {
  id: string                    // UUID primary key
  invoice_id: string            // FK to invoices
  
  // Action details
  action: AuditAction           // created, updated, paid, voided, etc.
  actor_id: string              // User who performed action
  actor_type: string            // user, system, api
  
  // Changes
  changes: Record<string, any>  // JSON diff of changes
  previous_status: InvoiceStatus | null
  new_status: InvoiceStatus | null
  
  // Context
  ip_address: string | null
  user_agent: string | null
  metadata: Record<string, any>
  
  // Timestamp
  created_at: Date
}

type AuditAction = 
  | 'created'
  | 'updated'
  | 'status_changed'
  | 'paid'
  | 'voided'
  | 'refunded'
  | 'viewed'
  | 'downloaded'
  | 'emailed'
```

### Supporting Types

```typescript
interface Address {
  line1: string
  line2: string | null
  city: string
  state: string | null
  postal_code: string
  country: string  // ISO 3166-1 alpha-2
}

interface InvoiceTotals {
  subtotal_cents: number
  tax_cents: number
  discount_cents: number
  total_cents: number
  amount_due_cents: number
}

interface TaxCalculation {
  tax_rate: number
  tax_amount_cents: number
  jurisdiction: TaxJurisdiction
  is_reverse_charge: boolean
}

interface TaxJurisdiction {
  country: string
  state: string | null
  tax_type: TaxType
}
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Invoice Generation Properties

**Property 1: Invoice number uniqueness and format**
*For any* set of generated invoices within the same year, all invoice numbers should be unique and follow the format "INV-{YEAR}-{SEQUENCE}" where sequence increments sequentially.
**Validates: Requirements 1.2**

**Property 2: Invoice completeness**
*For any* generated invoice, it should contain all required fields: customer information (name, billing address, tax ID), at least one line item with description and amount, subtotal, tax calculation, and total amount due.
**Validates: Requirements 1.3**

**Property 3: Charge consolidation**
*For any* set of charges occurring within the same billing period for the same customer, they should be consolidated into a single invoice with separate line items for each charge.
**Validates: Requirements 1.4**

**Property 4: Initial invoice status**
*For any* newly created invoice, its initial status should always be "draft" until payment processing completes.
**Validates: Requirements 1.5**

**Property 5: Payment status transition**
*For any* invoice that receives confirmed payment, its status should transition to "paid" and the payment date and method should be recorded.
**Validates: Requirements 1.6**

**Property 6: Overdue status detection**
*For any* invoice with a due date in the past and status not "paid", "void", or "refunded", the system should update its status to "overdue".
**Validates: Requirements 1.7**

**Property 7: Invoice mutability by status**
*For any* invoice, modifications should be allowed only when status is "draft", and prevented when status is "issued", "paid", "overdue", "void", or "refunded".
**Validates: Requirements 1.8**

### Currency and Tax Properties

**Property 8: Currency selection**
*For any* customer with a preferred currency setting, invoices generated for that customer should use their preferred currency; otherwise, the organization's default currency should be used.
**Validates: Requirements 2.1**

**Property 9: Integer storage for amounts**
*For any* monetary amount in the system (invoice totals, line item amounts, tax amounts), it should be stored as an integer representing the smallest currency unit (cents).
**Validates: Requirements 2.2**

**Property 10: Currency formatting**
*For any* monetary amount displayed to users, it should be formatted according to the currency's locale conventions (symbol placement, decimal separators, decimal places).
**Validates: Requirements 2.3**

**Property 11: Tax rate application by jurisdiction**
*For any* invoice with a customer billing address in a known tax jurisdiction, the appropriate tax rate for that jurisdiction should be applied to taxable line items.
**Validates: Requirements 2.4**

**Property 12: Tax exemption by validation**
*For any* customer with a validated tax ID, tax exemption should be applied to their invoices; customers without validated tax IDs should have tax applied normally.
**Validates: Requirements 2.5**

**Property 13: EU reverse charge mechanism**
*For any* invoice for an EU B2B customer with a valid VAT number, the reverse charge mechanism should be applied (tax rate 0%, VAT number displayed).
**Validates: Requirements 2.6**

**Property 14: Historical tax rate application**
*For any* invoice, the tax rate effective on the invoice date should be applied, not the current tax rate or service delivery date rate.
**Validates: Requirements 2.7**

**Property 15: Tax aggregation consistency**
*For any* set of invoices, the sum of tax amounts across all invoices should equal the aggregated tax amount when grouped by jurisdiction and period.
**Validates: Requirements 2.8**

### Line Item Properties

**Property 16: Subscription line item completeness**
*For any* subscription charge added to an invoice, the resulting line item should contain description, billing period start and end dates, quantity, unit price, and calculated total amount.
**Validates: Requirements 3.1**

**Property 17: Proration calculation accuracy**
*For any* subscription starting mid-period, the prorated charge should equal (unit price × days used) / total days in period, rounded to the nearest cent.
**Validates: Requirements 3.2**

**Property 18: Plan change line item separation**
*For any* subscription with a mid-period plan change, separate line items should be created for each plan period with correctly prorated amounts that sum to the expected total.
**Validates: Requirements 3.3**

**Property 19: Usage line item structure**
*For any* usage-based charge, the line item should include the usage metric name, quantity used, rate per unit, and calculated cost (quantity × rate).
**Validates: Requirements 3.4**

**Property 20: Discount representation**
*For any* discount or credit applied to an invoice, a negative line item should be created showing the reduction amount and reason.
**Validates: Requirements 3.5**

**Property 21: Credit note line item matching**
*For any* refund processed, the generated credit note should contain line items that match the original invoice items being refunded in description and amount.
**Validates: Requirements 3.6**

**Property 22: Line item ordering**
*For any* invoice with multiple line item types, they should be displayed in the order: subscriptions, usage charges, one-time purchases, discounts/credits, taxes.
**Validates: Requirements 3.7**

**Property 23: Line item calculation order**
*For any* line item with discounts, the calculation should follow: (quantity × unit price) - item discount, then tax should be calculated on the discounted amount.
**Validates: Requirements 3.8**

### Receipt Properties

**Property 24: Receipt generation timing**
*For any* successfully processed payment, a receipt should be generated within 60 seconds of payment confirmation.
**Validates: Requirements 4.1**

**Property 25: Receipt completeness**
*For any* generated receipt, it should include payment date, amount paid, payment method details (last 4 digits), invoice reference number, and transaction ID.
**Validates: Requirements 4.2**

**Property 26: Receipt number uniqueness and format**
*For any* set of generated receipts within the same year, all receipt numbers should be unique and follow the format "RCT-{YEAR}-{SEQUENCE}".
**Validates: Requirements 4.3**

**Property 27: Receipt email delivery timing**
*For any* created receipt, an email should be sent to the customer's email address within 5 minutes of receipt creation.
**Validates: Requirements 4.4**

**Property 28: Receipt email format**
*For any* receipt email sent, it should include both an HTML version for inline viewing and a PDF attachment for downloading.
**Validates: Requirements 4.5**

**Property 29: Partial payment receipt accuracy**
*For any* partial payment on an invoice, the receipt amount should equal the payment amount, and the invoice's remaining balance should equal original total minus payment amount.
**Validates: Requirements 4.6**

**Property 30: Multi-invoice payment receipts**
*For any* single transaction paying multiple invoices, separate receipts should be generated for each invoice with amounts matching the allocation to each invoice.
**Validates: Requirements 4.7**

**Property 31: Receipt email retry behavior**
*For any* receipt email that fails to send, the system should retry up to 3 times with exponential backoff (1s, 2s, 4s) before logging for manual intervention.
**Validates: Requirements 4.8**


### Customer Portal Properties

**Property 32: Invoice list sorting**
*For any* customer viewing their invoice list, invoices should be sorted by date in descending order (newest first).
**Validates: Requirements 5.1**

**Property 33: Invoice list item completeness**
*For any* invoice displayed in the customer portal list, it should show invoice number, date, amount, status, and a download action.
**Validates: Requirements 5.2**

**Property 34: PDF generation performance**
*For any* invoice PDF download request, the PDF should be generated and served within 3 seconds.
**Validates: Requirements 5.3**

**Property 35: Invoice detail completeness**
*For any* invoice detail view, it should display all line items, complete payment history, and all related receipts.
**Validates: Requirements 5.4**

**Property 36: Unpaid invoice prominence**
*For any* customer with unpaid invoices, those invoices should be prominently displayed with "Pay Now" actions available.
**Validates: Requirements 5.5**

**Property 37: Payment flow initiation**
*For any* "Pay Now" action clicked, the customer should be redirected to the payment gateway with the correct invoice pre-selected.
**Validates: Requirements 5.6**

**Property 38: Invoice filtering**
*For any* invoice search with filters (date range, status, amount range), only invoices matching all specified filter criteria should be returned.
**Validates: Requirements 5.7**

**Property 39: Receipt access control**
*For any* paid invoice, customers should be able to download the associated receipt; for unpaid invoices, receipt download should not be available.
**Validates: Requirements 5.8**

### Template Properties

**Property 40: Company information inclusion**
*For any* generated invoice, it should include all configured company information from the template (legal name, address, tax ID, contact details).
**Validates: Requirements 6.2**

**Property 41: Color scheme application**
*For any* invoice generated with a template, the selected color scheme should be applied to headers and accent elements.
**Validates: Requirements 6.3**

**Property 42: Footer customization**
*For any* invoice generated, it should include the customizable footer text configured in the template (payment terms, disclaimers, thank you message).
**Validates: Requirements 6.4**

**Property 43: Template isolation by organization**
*For any* two different organizations, their invoice templates should be completely separate and not affect each other.
**Validates: Requirements 6.5**

**Property 44: Template preview generation**
*For any* template being edited, a preview action should generate a sample invoice showing all customizations before saving.
**Validates: Requirements 6.6**

**Property 45: Template version immutability**
*For any* invoice generated with a template, updating the template afterward should not change the appearance of the already-generated invoice.
**Validates: Requirements 6.7**

### Accounting Integration Properties

**Property 46: Accounting sync timing**
*For any* invoice marked as paid, invoice data should be sent to the connected accounting system within 15 minutes.
**Validates: Requirements 7.1**

**Property 47: Accounting category mapping**
*For any* invoice synced to an accounting system, each line item should be mapped to the appropriate accounting category (revenue account, tax account).
**Validates: Requirements 7.2**

**Property 48: Multi-system integration support**
*For any* organization, the system should support configuring connections to QuickBooks Online, Xero, or generic webhook endpoints.
**Validates: Requirements 7.3**

**Property 49: Sync data completeness**
*For any* invoice synced to an accounting system, the data sent should include customer information, all line items, tax details, payment information, and invoice metadata.
**Validates: Requirements 7.4**

**Property 50: Accounting sync retry behavior**
*For any* accounting sync that fails, the system should retry up to 5 times with exponential backoff before alerting administrators.
**Validates: Requirements 7.5**

**Property 51: Credit note accounting sync**
*For any* issued credit note, it should be synced to the accounting system as a credit memo or negative invoice.
**Validates: Requirements 7.6**

**Property 52: Sync status visibility**
*For any* invoice with accounting integration enabled, the invoice detail view should display sync status and timestamp of last successful sync.
**Validates: Requirements 7.7**

**Property 53: Authentication failure detection**
*For any* accounting sync attempt with invalid credentials, the system should detect the authentication failure and notify administrators.
**Validates: Requirements 7.8**

### Credit Note and Refund Properties

**Property 54: Credit note invoice reference**
*For any* issued credit note, it should reference the original invoice ID and specify the credited amount.
**Validates: Requirements 8.1**

**Property 55: Full refund credit note**
*For any* full refund processed, a credit note should be generated for the entire invoice amount and the invoice status should be updated to "refunded".
**Validates: Requirements 8.2**

**Property 56: Partial refund credit note**
*For any* partial refund processed, a credit note should be generated for the partial amount and the invoice balance should be reduced by that amount.
**Validates: Requirements 8.3**

**Property 57: Credit note number uniqueness**
*For any* set of generated credit notes within the same year, all credit note numbers should be unique and follow the format "CN-{YEAR}-{SEQUENCE}".
**Validates: Requirements 8.4**

**Property 58: Credit note email delivery**
*For any* issued credit note, it should be automatically sent to the customer's email address with an explanation.
**Validates: Requirements 8.5**

**Property 59: Refund gateway integration**
*For any* refund processed, the system should initiate the refund through the payment gateway and track the refund status.
**Validates: Requirements 8.6**

**Property 60: Credit balance application**
*For any* applied credit note, the customer's account balance should be updated to reflect the credit amount available for future invoice offsets.
**Validates: Requirements 8.7**

**Property 61: Credit note history visibility**
*For any* invoice with related credit notes, viewing the invoice history should display all credit notes and their impact on the invoice balance.
**Validates: Requirements 8.8**

### Notification Properties

**Property 62: Invoice issuance notification**
*For any* issued invoice, an email notification should be sent to the customer within 5 minutes containing invoice details and payment link.
**Validates: Requirements 9.1**

**Property 63: Due date reminder scheduling**
*For any* unpaid invoice with a due date 7 days in the future, a reminder email should be sent to the customer.
**Validates: Requirements 9.2**

**Property 64: Overdue notice schedule**
*For any* invoice that becomes overdue, overdue notices should be sent on days 1, 7, and 14 after the due date.
**Validates: Requirements 9.3**

**Property 65: Invoice email content**
*For any* invoice notification email, it should include invoice summary, amount due, due date, and a "View Invoice" button linking to the customer portal.
**Validates: Requirements 9.4**

**Property 66: Multi-invoice reminder consolidation**
*For any* customer with multiple unpaid invoices, reminder emails should be consolidated into a single email with a summary table of all unpaid invoices.
**Validates: Requirements 9.5**

**Property 67: Email tracking**
*For any* invoice notification sent, the system should track email delivery status and open rates for monitoring purposes.
**Validates: Requirements 9.6**

**Property 68: Payment confirmation email**
*For any* invoice payment, a payment confirmation email should be sent with the receipt attached.
**Validates: Requirements 9.7**

**Property 69: Notification customization per organization**
*For any* organization, administrators should be able to customize email templates and reminder schedules independently of other organizations.
**Validates: Requirements 9.8**

### Analytics and Reporting Properties

**Property 70: Invoice analytics totals**
*For any* selected time period, the displayed total invoiced amount should equal the sum of all invoice totals in that period, and outstanding balance should equal total invoiced minus total paid.
**Validates: Requirements 10.1**

**Property 71: Revenue breakdown accuracy**
*For any* revenue report, the sum of revenue from subscriptions, usage charges, and one-time purchases should equal the total revenue for the period.
**Validates: Requirements 10.2**

**Property 72: Payment pattern metrics**
*For any* set of paid invoices, average days to payment should equal the sum of (paid_date - issue_date) divided by invoice count, and on-time payment rate should equal count of invoices paid by due date divided by total paid invoices.
**Validates: Requirements 10.3**

**Property 73: Customer analytics accuracy**
*For any* customer, their total revenue should equal the sum of all their paid invoice amounts, and invoice count should equal the number of invoices issued to them.
**Validates: Requirements 10.4**

**Property 74: Tax report aggregation**
*For any* tax report period, the sum of tax amounts across all jurisdictions should equal the total tax collected in that period.
**Validates: Requirements 10.5**

**Property 75: Report export completeness**
*For any* exported report in CSV, Excel, or PDF format, it should contain all relevant data fields from the report view.
**Validates: Requirements 10.6**

**Property 76: Invoice aging categorization**
*For any* outstanding invoice, it should be categorized into exactly one age bucket (0-30, 31-60, 61-90, 90+ days) based on days since issue date.
**Validates: Requirements 10.7**

**Property 77: Trend analysis calculations**
*For any* time-series trend report, the sum of invoice volumes across all time periods should equal the total invoice count, and average invoice value should equal total revenue divided by invoice count.
**Validates: Requirements 10.8**

### Audit and Compliance Properties

**Property 78: Audit log completeness**
*For any* invoice operation (create, update, status change), an audit log entry should be created containing action type, timestamp, user ID, and changed fields.
**Validates: Requirements 11.1**

**Property 79: Audit history chronological ordering**
*For any* invoice audit history view, all audit log entries should be displayed in chronological order from oldest to newest.
**Validates: Requirements 11.2**

**Property 80: Void workflow requirements**
*For any* invoice void operation, it should require a reason code and administrator approval, and all details should be logged in the audit trail.
**Validates: Requirements 11.3**

**Property 81: Access logging**
*For any* invoice view operation, an audit log entry should be created recording who viewed the invoice and when.
**Validates: Requirements 11.4**

**Property 82: Compliance report audit trails**
*For any* compliance report for a date range, it should include complete audit trails for all invoices within that range.
**Validates: Requirements 11.5**

**Property 83: Dispute record maintenance**
*For any* invoice dispute, all communications, adjustments, and resolutions should be recorded and maintained in the system.
**Validates: Requirements 11.6**

**Property 84: Audit export completeness**
*For any* audit export request, the exported data should include complete invoice records with full audit trails in the requested format.
**Validates: Requirements 11.7**

**Property 85: Archival audit trail preservation**
*For any* invoice archived due to age (>7 years), its complete audit trail should be preserved and remain accessible.
**Validates: Requirements 11.8**

### Bulk Operations Properties

**Property 86: Bulk action availability**
*For any* set of selected invoices, bulk actions (send reminders, mark as paid, void, export) should be available.
**Validates: Requirements 12.1**

**Property 87: Bulk operation async processing**
*For any* bulk operation initiated, it should be processed asynchronously with progress updates provided to the user.
**Validates: Requirements 12.2**

**Property 88: Bulk email rate limiting**
*For any* bulk reminder email operation, emails should be queued and sent at a controlled rate (e.g., max 10 per second) to avoid spam filtering.
**Validates: Requirements 12.3**

**Property 89: Bulk export format**
*For any* bulk invoice export, the result should be a ZIP file containing individual PDF invoices and a summary CSV file.
**Validates: Requirements 12.4**

**Property 90: Bulk operation partial failure handling**
*For any* bulk operation where some items fail, successful operations should complete and failures should be reported with specific error messages.
**Validates: Requirements 12.5**

**Property 91: Bulk void confirmation**
*For any* bulk void operation, it should require confirmation and reason codes that apply to all selected invoices.
**Validates: Requirements 12.6**

**Property 92: Bulk operation completion notification**
*For any* completed bulk operation, a summary email should be sent to the administrator showing success count, failure count, and details.
**Validates: Requirements 12.7**

**Property 93: Bulk operation rate limiting**
*For any* bulk operation, rate limiting should be implemented to prevent system overload (e.g., max 100 operations per minute per user).
**Validates: Requirements 12.8**


## Error Handling

### Error Types

The system defines specific error types for different failure scenarios:

```typescript
// Base error class
class InvoiceError extends AppError {
  constructor(message: string, public code: string, cause?: Error) {
    super(message, cause)
    this.name = 'InvoiceError'
  }
}

// Specific error types
class InvoiceNotFoundError extends InvoiceError {
  readonly statusCode = 404
  constructor(invoiceId: string) {
    super(`Invoice not found: ${invoiceId}`, 'INVOICE_NOT_FOUND')
  }
}

class InvalidInvoiceStateError extends InvoiceError {
  readonly statusCode = 400
  constructor(message: string) {
    super(message, 'INVALID_INVOICE_STATE')
  }
}

class TaxCalculationError extends InvoiceError {
  readonly statusCode = 500
  constructor(message: string, cause?: Error) {
    super(message, 'TAX_CALCULATION_ERROR', cause)
  }
}

class PDFGenerationError extends InvoiceError {
  readonly statusCode = 500
  constructor(message: string, cause?: Error) {
    super(message, 'PDF_GENERATION_ERROR', cause)
  }
}

class AccountingSyncError extends InvoiceError {
  readonly statusCode = 502
  constructor(message: string, cause?: Error) {
    super(message, 'ACCOUNTING_SYNC_ERROR', cause)
  }
}

class PaymentGatewayError extends InvoiceError {
  readonly statusCode = 502
  constructor(message: string, cause?: Error) {
    super(message, 'PAYMENT_GATEWAY_ERROR', cause)
  }
}
```

### Error Handling Strategies

#### Validation Errors
- Validate all input data using Zod schemas before processing
- Return clear, actionable error messages to users
- Log validation failures for monitoring

#### State Transition Errors
- Enforce valid state transitions using state machine pattern
- Prevent invalid operations (e.g., editing paid invoices)
- Provide clear error messages explaining why operation is not allowed

#### External Service Errors
- Implement retry logic with exponential backoff for transient failures
- Circuit breaker pattern for repeated failures
- Graceful degradation when external services are unavailable
- Queue operations for later retry when appropriate

#### Data Integrity Errors
- Use database transactions for multi-step operations
- Implement idempotency keys for payment operations
- Validate calculations before persisting
- Maintain audit trail of all changes

### Retry Strategies

```typescript
interface RetryConfig {
  maxAttempts: number
  initialDelay: number
  maxDelay: number
  backoffMultiplier: number
}

const RETRY_CONFIGS: Record<string, RetryConfig> = {
  email: {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 4000,
    backoffMultiplier: 2
  },
  accounting: {
    maxAttempts: 5,
    initialDelay: 2000,
    maxDelay: 32000,
    backoffMultiplier: 2
  },
  pdf: {
    maxAttempts: 2,
    initialDelay: 500,
    maxDelay: 1000,
    backoffMultiplier: 2
  }
}
```

## Testing Strategy

### Testing Philosophy

**CRITICAL REQUIREMENTS:**
- **100% Test Success Rate**: All tests must pass for tasks to be considered complete
- **Real Service Integration**: Integration tests MUST use real services (Supabase, Stripe, etc.)
- **Test Data Lifecycle Management**: Tests manage their own data without tainting datastores
- **Idempotency**: All tests support parallel execution and multiple runs
- **Isolation**: Each test is completely independent and self-contained

### Unit Testing

Unit tests will cover individual functions and methods in isolation:

- **Service methods**: Test business logic with mocked dependencies
- **Calculation functions**: Test tax calculations, proration, totals
- **Validation schemas**: Test Zod schemas with valid and invalid inputs
- **Utility functions**: Test formatting, number conversion, date handling
- **State machines**: Test valid and invalid state transitions

**Unit Test Requirements:**
- Use Vitest with proper memory allocation (`NODE_OPTIONS="--max-old-space-size=8192"`)
- Mock external dependencies (database, APIs) at service boundaries
- Test pure functions without mocks when possible
- Achieve 100% coverage for service layer (`lib/services/**`)

Example unit test:
```typescript
describe('InvoiceService.calculateProration', () => {
  it('should calculate correct prorated amount for mid-month start', () => {
    const startDate = new Date('2024-01-15')
    const endDate = new Date('2024-01-31')
    const monthlyAmount = 10000 // $100.00 in cents
    
    const prorated = InvoiceService.calculateProration(
      startDate,
      endDate,
      monthlyAmount
    )
    
    // 17 days out of 31 days = 17/31 * 10000 = 5484 cents
    expect(prorated).toBe(5484)
  })
})
```

### Property-Based Testing

Property-based tests will verify correctness properties using **fast-check** library:

- Generate random invoices, line items, payments
- Verify invariants hold across all generated inputs
- Test calculation properties (totals, taxes, proration)
- Test state machine properties
- Test data integrity properties
- Run minimum 100 iterations per property test

**Property Test Configuration:**
```typescript
import fc from 'fast-check'

// Configure for comprehensive testing
const propertyTestConfig = {
  numRuns: 100,
  seed: Date.now(), // For reproducibility
  verbose: true
}
```

Example property test:
```typescript
import fc from 'fast-check'

describe('Invoice Totals Property', () => {
  it('should maintain total = subtotal + tax - discount for all invoices', () => {
    fc.assert(
      fc.property(
        fc.array(lineItemArbitrary(), { minLength: 1, maxLength: 10 }),
        fc.float({ min: 0, max: 0.3 }), // tax rate
        fc.integer({ min: 0, max: 5000 }), // discount
        (lineItems, taxRate, discountCents) => {
          const invoice = createInvoiceWithItems(lineItems, taxRate, discountCents)
          const totals = InvoiceService.calculateTotals(invoice)
          
          // Property: total = subtotal + tax - discount
          expect(totals.total_cents).toBe(
            totals.subtotal_cents + totals.tax_cents - totals.discount_cents
          )
        }
      ),
      { numRuns: 100 }
    )
  })
})
```

### Integration Testing

**CRITICAL: Integration tests MUST use real services, not mocks.**

Integration tests will verify component interactions with real infrastructure:

- **Real Supabase Database**: Use test database with isolated schemas
- **Real Stripe API**: Use Stripe test mode with test API keys
- **Real Email Service**: Use test email provider or sandbox mode
- **Real Redis**: Use separate Redis database for tests

**Integration Test Requirements:**

1. **Test Data Management:**
```typescript
describe('Invoice Integration Tests', () => {
  let testOrgId: string
  let testUserId: string
  let testInvoiceIds: string[] = []
  
  beforeAll(async () => {
    // Create isolated test organization and user
    testOrgId = await createTestOrganization('test-org-' + Date.now())
    testUserId = await createTestUser('test-user-' + Date.now(), testOrgId)
  })
  
  afterEach(async () => {
    // Clean up test data after each test
    await cleanupTestInvoices(testInvoiceIds)
    testInvoiceIds = []
  })
  
  afterAll(async () => {
    // Clean up test organization and user
    await cleanupTestUser(testUserId)
    await cleanupTestOrganization(testOrgId)
  })
  
  it('should create invoice in real database', async () => {
    const invoice = await InvoiceService.create({
      organization_id: testOrgId,
      customer_id: testUserId,
      // ... invoice data
    })
    
    testInvoiceIds.push(invoice.id)
    
    // Verify in real database
    const retrieved = await InvoiceService.getById(invoice.id)
    expect(retrieved).toEqual(invoice)
  })
})
```

2. **Idempotency and Parallel Execution:**
```typescript
// Use unique identifiers for test isolation
const testPrefix = `test-${Date.now()}-${Math.random().toString(36).substring(7)}`

// All test data includes unique prefix
const testInvoiceNumber = `${testPrefix}-INV-001`
const testOrgName = `${testPrefix}-TestOrg`
```

3. **Real Service Configuration:**
```typescript
// __tests__/setup/integration-config.ts
export const integrationTestConfig = {
  supabase: {
    url: process.env.SUPABASE_TEST_URL!,
    serviceKey: process.env.SUPABASE_TEST_SERVICE_KEY!,
    schema: 'test_invoicing' // Isolated schema
  },
  stripe: {
    apiKey: process.env.STRIPE_TEST_SECRET_KEY!,
    publishableKey: process.env.STRIPE_TEST_PUBLISHABLE_KEY!
  },
  redis: {
    url: process.env.REDIS_TEST_URL!,
    db: 1 // Separate database for tests
  }
}
```

### End-to-End Testing

E2E tests will verify complete user workflows using Playwright:

**E2E Test Requirements:**

1. **Clerk Authentication (Official Guidelines):**
```typescript
import { test, expect } from '@playwright/test'
import { clerk } from '@clerk/testing/playwright'

test.describe('Invoice E2E Tests', () => {
  test.use({ 
    storageState: '.auth/user.json' // Clerk auth state
  })
  
  test.beforeEach(async ({ page }) => {
    // Setup Clerk test user
    await clerk.signIn({
      page,
      signInParams: {
        strategy: 'email_code',
        identifier: 'test@example.com'
      }
    })
  })
  
  test('should complete invoice payment flow', async ({ page }) => {
    // Test implementation with authenticated user
  })
})
```

2. **Test Data Seeding and Cleanup:**
```typescript
test.describe('Invoice Management E2E', () => {
  let testData: TestDataContext
  
  test.beforeAll(async () => {
    // Seed test data with unique identifiers
    testData = await seedTestData({
      prefix: `e2e-${Date.now()}`,
      organizations: 1,
      users: 2,
      invoices: 5
    })
  })
  
  test.afterAll(async () => {
    // Clean up all test data
    await cleanupTestData(testData)
  })
  
  test('should display invoices in customer portal', async ({ page }) => {
    // Test uses seeded data
    await page.goto(`/invoices/${testData.invoices[0].id}`)
    // ... assertions
  })
})
```

3. **Idempotency for Multiple Runs:**
```typescript
// Each test run uses unique identifiers
const runId = `run-${Date.now()}-${process.env.PLAYWRIGHT_WORKER_INDEX || 0}`

// Test data includes run ID for isolation
const testInvoice = {
  invoice_number: `${runId}-INV-001`,
  customer_email: `${runId}-customer@test.com`
}
```

**E2E Test Workflows:**
- **Invoice generation flow**: Billing event → Invoice → PDF → Email
- **Payment flow**: Customer portal → Payment → Receipt → Accounting sync
- **Refund flow**: Admin refund → Credit note → Payment gateway → Email
- **Bulk operations**: Select invoices → Bulk action → Progress → Completion

### Performance Testing

Performance tests will ensure system meets timing requirements:

- Invoice generation: < 2 seconds for typical invoice
- PDF generation: < 3 seconds per document
- Receipt generation: < 60 seconds after payment
- Email delivery: < 5 minutes for notifications
- Bulk operations: Handle 1000+ invoices efficiently

**Performance Test Requirements:**
- Run against real services in test environment
- Use realistic data volumes
- Measure p50, p95, p99 latencies
- Verify no memory leaks during extended runs

### Test Data Management

**Test Data Lifecycle:**

1. **Creation**: Generate unique test data per test run
2. **Usage**: Tests operate on isolated data
3. **Cleanup**: Automatic cleanup after test completion
4. **Verification**: Ensure no data leakage between tests

**Test Data Utilities:**
```typescript
// __tests__/utils/test-data-manager.ts
export class TestDataManager {
  private createdResources: Map<string, string[]> = new Map()
  
  async createTestOrganization(prefix: string): Promise<string> {
    const orgId = await createOrganization({ name: `${prefix}-org` })
    this.track('organizations', orgId)
    return orgId
  }
  
  async cleanup(): Promise<void> {
    // Clean up in reverse order of creation
    for (const [type, ids] of this.createdResources) {
      await this.cleanupResourceType(type, ids)
    }
    this.createdResources.clear()
  }
  
  private track(type: string, id: string): void {
    if (!this.createdResources.has(type)) {
      this.createdResources.set(type, [])
    }
    this.createdResources.get(type)!.push(id)
  }
}
```

### Test Data Generators

```typescript
// Arbitraries for property-based testing
const lineItemArbitrary = () => fc.record({
  description: fc.string({ minLength: 5, maxLength: 100 }),
  type: fc.constantFrom('subscription', 'usage', 'one_time'),
  quantity: fc.float({ min: 0.1, max: 100 }),
  unit_price_cents: fc.integer({ min: 100, max: 100000 }),
  taxable: fc.boolean()
})

const invoiceArbitrary = () => fc.record({
  customer_id: fc.uuid(),
  currency: fc.constantFrom('USD', 'EUR', 'GBP'),
  line_items: fc.array(lineItemArbitrary(), { minLength: 1, maxLength: 10 }),
  issue_date: fc.date(),
  due_date: fc.date()
})

const addressArbitrary = () => fc.record({
  line1: fc.string({ minLength: 5, maxLength: 50 }),
  city: fc.string({ minLength: 3, maxLength: 30 }),
  state: fc.option(fc.string({ minLength: 2, maxLength: 2 })),
  postal_code: fc.string({ minLength: 5, maxLength: 10 }),
  country: fc.constantFrom('US', 'GB', 'DE', 'FR', 'CA')
})
```

### Test Execution Requirements

**CI/CD Integration:**
```yaml
# All tests must pass for deployment
- name: Run Unit Tests
  run: NODE_OPTIONS="--max-old-space-size=8192" pnpm test --filter=@c9d/web
  
- name: Run Integration Tests
  run: NODE_OPTIONS="--max-old-space-size=8192" pnpm test:integration --filter=@c9d/web
  env:
    SUPABASE_TEST_URL: ${{ secrets.SUPABASE_TEST_URL }}
    STRIPE_TEST_SECRET_KEY: ${{ secrets.STRIPE_TEST_SECRET_KEY }}
    
- name: Run E2E Tests
  run: pnpm test:e2e --filter=@c9d/web
  env:
    CLERK_TEST_SECRET_KEY: ${{ secrets.CLERK_TEST_SECRET_KEY }}
```

**Success Criteria:**
- ✅ 100% of tests pass
- ✅ No test data pollution in datastores
- ✅ Tests run successfully in parallel
- ✅ Tests are idempotent across multiple runs
- ✅ All integration tests use real services
- ✅ All E2E tests follow Clerk authentication guidelines

## API Specifications

### Invoice API Endpoints

#### POST /api/invoices
Create a new invoice.

**Request:**
```typescript
{
  customer_id: string
  line_items: Array<{
    description: string
    type: 'subscription' | 'usage' | 'one_time'
    quantity: number
    unit_price_cents: number
    period_start?: string  // ISO 8601
    period_end?: string    // ISO 8601
  }>
  currency?: string  // Defaults to customer/org currency
  due_date?: string  // ISO 8601, defaults to issue_date + 30 days
  notes?: string
  metadata?: Record<string, any>
}
```

**Response:**
```typescript
{
  data: {
    id: string
    invoice_number: string
    status: 'draft'
    subtotal_cents: number
    tax_cents: number
    total_cents: number
    currency: string
    issue_date: string
    due_date: string
    line_items: LineItem[]
    // ... other fields
  }
}
```

#### GET /api/invoices/:id
Retrieve an invoice by ID.

**Response:**
```typescript
{
  data: {
    id: string
    invoice_number: string
    status: InvoiceStatus
    // ... all invoice fields
    line_items: LineItem[]
    receipts: Receipt[]
    credit_notes: CreditNote[]
  }
}
```

#### PATCH /api/invoices/:id
Update an invoice (draft only).

**Request:**
```typescript
{
  line_items?: LineItem[]
  due_date?: string
  notes?: string
  metadata?: Record<string, any>
}
```

#### POST /api/invoices/:id/issue
Issue a draft invoice (send to customer).

**Response:**
```typescript
{
  data: {
    id: string
    status: 'issued'
    issue_date: string
    email_sent: boolean
  }
}
```

#### POST /api/invoices/:id/void
Void an invoice.

**Request:**
```typescript
{
  reason: string
}
```

#### POST /api/invoices/:id/mark-paid
Manually mark an invoice as paid.

**Request:**
```typescript
{
  payment_date: string
  payment_method: string
  transaction_id?: string
  notes?: string
}
```

#### GET /api/invoices/:id/pdf
Download invoice PDF.

**Response:** PDF file (application/pdf)

#### GET /api/invoices
List invoices with filtering and pagination.

**Query Parameters:**
- `customer_id`: Filter by customer
- `status`: Filter by status
- `from_date`: Filter by issue date >= 
- `to_date`: Filter by issue date <=
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)

**Response:**
```typescript
{
  data: Invoice[]
  pagination: {
    page: number
    limit: number
    total: number
    total_pages: number
  }
}
```

### Receipt API Endpoints

#### POST /api/receipts
Generate a receipt for a payment.

**Request:**
```typescript
{
  invoice_id: string
  amount_cents: number
  payment_date: string
  payment_method: string
  payment_method_details: string
  stripe_payment_intent_id?: string
  transaction_id?: string
}
```

#### GET /api/receipts/:id
Retrieve a receipt by ID.

#### GET /api/receipts/:id/pdf
Download receipt PDF.

#### GET /api/receipts
List receipts with filtering.

### Credit Note API Endpoints

#### POST /api/credit-notes
Create a credit note.

**Request:**
```typescript
{
  invoice_id: string
  amount_cents: number
  reason: string
  type: 'full_refund' | 'partial_refund' | 'adjustment'
  initiate_refund?: boolean
}
```

#### GET /api/credit-notes/:id
Retrieve a credit note.

#### GET /api/credit-notes/:id/pdf
Download credit note PDF.

### Analytics API Endpoints

#### GET /api/analytics/invoices
Get invoice analytics.

**Query Parameters:**
- `from_date`: Start date
- `to_date`: End date
- `group_by`: 'day' | 'week' | 'month'

**Response:**
```typescript
{
  data: {
    total_invoiced_cents: number
    total_paid_cents: number
    outstanding_balance_cents: number
    invoice_count: number
    average_invoice_value_cents: number
    on_time_payment_rate: number
    average_days_to_payment: number
  }
}
```

#### GET /api/analytics/revenue
Get revenue breakdown.

#### GET /api/analytics/tax
Get tax reports by jurisdiction.

## Security Considerations

### Authentication and Authorization
- All API endpoints require authentication via Clerk
- Invoice access restricted to organization members
- Customer portal access restricted to invoice owner
- Admin operations require specific permissions

### Data Protection
- Encrypt sensitive data at rest (tax IDs, payment details)
- Use HTTPS for all communications
- Implement rate limiting on API endpoints
- Sanitize all user inputs

### Audit and Compliance
- Log all invoice operations with user attribution
- Maintain immutable audit trail
- Support data export for regulatory compliance
- Implement data retention policies

### Payment Security
- Never store full credit card numbers
- Use Stripe for PCI compliance
- Implement idempotency for payment operations
- Validate webhook signatures from payment gateway

## Performance Optimization

### Caching Strategy (Vercel KV / Redis)
- Cache tax rates by jurisdiction (1 hour TTL)
- Cache invoice templates (invalidate on update)
- Cache customer currency preferences
- Cache PDF documents (24 hour TTL)
- Use existing Redis instance (Vercel KV)
- Implement cache warming for frequently accessed data

**Cache Key Patterns:**
```typescript
const CACHE_KEYS = {
  taxRate: (jurisdiction: string, date: string) => `tax:${jurisdiction}:${date}`,
  template: (orgId: string) => `template:${orgId}`,
  invoice: (invoiceId: string) => `invoice:${invoiceId}`,
  pdf: (invoiceId: string) => `pdf:${invoiceId}`
}
```

### Database Optimization
- Index on invoice_number, customer_id, status, issue_date, organization_id
- Index on receipt_number, invoice_id
- Composite index on (organization_id, status, issue_date) for common queries
- Partition audit logs by date for performance
- Use database views for complex analytics queries
- Leverage Supabase connection pooling
- Use read replicas for analytics queries (if available)

### Async Processing (Vercel-Specific)

**Background Jobs:**
- Use Vercel Cron for scheduled tasks (max 1/minute on Hobby, configurable on Pro)
- Use Vercel KV for job queue management
- Implement webhook endpoints for long-running operations
- Use Vercel Edge Config for feature flags and configuration

**Job Queue Implementation:**
```typescript
// Use Vercel KV as job queue
export class JobQueue {
  private redis = createRedisClient()
  
  async enqueue(job: Job): Promise<void> {
    await this.redis.lpush('jobs:pending', JSON.stringify(job))
  }
  
  async process(): Promise<void> {
    const job = await this.redis.rpop('jobs:pending')
    if (job) {
      await this.executeJob(JSON.parse(job))
    }
  }
}
```

**Vercel Function Timeouts:**
- Standard routes: 10 seconds (sufficient for most operations)
- PDF generation: 30 seconds (configured in vercel.json)
- Bulk operations: Split into smaller batches, process via cron
- Email delivery: Async via queue (non-blocking)

**Vercel Cron Configuration:**
```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/check-overdue",
      "schedule": "0 0 * * *"
    },
    {
      "path": "/api/cron/send-reminders",
      "schedule": "0 9 * * *"
    },
    {
      "path": "/api/cron/process-jobs",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

### Vercel Blob Storage for PDFs

**PDF Storage Strategy:**
```typescript
import { put, del } from '@vercel/blob'

export class PDFStorageService {
  async storePDF(invoiceId: string, pdfBuffer: Buffer): Promise<string> {
    const blob = await put(`invoices/${invoiceId}.pdf`, pdfBuffer, {
      access: 'public',
      addRandomSuffix: false
    })
    return blob.url
  }
  
  async deletePDF(invoiceId: string): Promise<void> {
    await del(`invoices/${invoiceId}.pdf`)
  }
}
```

**Benefits:**
- CDN distribution for fast PDF access globally
- Automatic HTTPS and caching
- No serverless function timeout concerns
- Cost-effective storage

### Monitoring (Vercel Analytics + Existing Tools)

**Vercel Analytics Integration:**
- Track API route performance
- Monitor function execution times
- Track error rates by endpoint
- Monitor cache hit rates

**Custom Monitoring:**
- Track API response times
- Monitor PDF generation performance
- Track email delivery rates
- Alert on failed accounting syncs
- Monitor payment gateway errors
- Use existing Sentry integration for error tracking

**Performance Metrics:**
```typescript
// Track custom metrics
export async function trackMetric(name: string, value: number, tags?: Record<string, string>) {
  // Send to monitoring service (Vercel Analytics, Datadog, etc.)
  await fetch('/api/metrics', {
    method: 'POST',
    body: JSON.stringify({ name, value, tags, timestamp: Date.now() })
  })
}
```

### Build Optimization (Turbo)

**Turbo Configuration:**
- Use existing Turbo setup for monorepo builds
- Cache invoice service builds
- Parallel test execution
- Incremental builds for faster deployments

**Build Performance:**
```json
// turbo.json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**"]
    },
    "test": {
      "dependsOn": ["^build"],
      "cache": true
    }
  }
}
```

