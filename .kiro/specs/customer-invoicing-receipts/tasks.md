# Implementation Plan

- [ ] 1. Set up test infrastructure and configuration
- [ ] 1.1 Configure Vitest with memory optimization
  - Set up vitest.config.ts with NODE_OPTIONS memory allocation
  - Configure test pool with forks and singleFork for memory management
  - Set up coverage thresholds (100% services, 95% models, 90% API, 85% global)
  - Configure test timeouts (60s test, 30s hooks)
  - _Requirements: Testing infrastructure_

- [ ] 1.2 Create test data management utilities
  - Implement TestDataManager class for lifecycle management
  - Create test data generators with unique identifiers
  - Implement automatic cleanup functions
  - Create test organization and user factories
  - Ensure idempotency with unique prefixes per run
  - _Requirements: Testing infrastructure_

- [ ] 1.3 Set up integration test configuration
  - Configure real Supabase test database connection
  - Set up isolated test schema
  - Configure real Stripe test mode API keys
  - Configure real Vercel KV test database
  - Set up test email provider (sandbox mode)
  - Document required environment variables
  - _Requirements: Testing infrastructure_

- [ ] 1.4 Set up E2E test configuration with Clerk
  - Install @clerk/testing package
  - Configure Playwright with Clerk authentication
  - Create Clerk test user setup utilities
  - Implement test data seeding for E2E tests
  - Configure parallel execution support
  - _Requirements: Testing infrastructure_

- [ ] 1.5 Create fast-check arbitraries for property testing
  - Create lineItemArbitrary generator
  - Create invoiceArbitrary generator
  - Create addressArbitrary generator
  - Create paymentArbitrary generator
  - Configure property test runs (minimum 100 iterations)
  - _Requirements: Testing infrastructure_

- [ ] 2. Set up database schema and migrations
- [ ] 2.1 Create invoices table with all fields and indexes
  - Define Drizzle schema in `apps/web/lib/database/schema/invoicing.ts`
  - Follow existing schema naming conventions (snake_case)
  - Include status enum, currency, amounts in cents, customer info
  - Add foreign keys to existing `organizations` and `users` tables
  - Add indexes on invoice_number, customer_id, status, issue_date, organization_id
  - Add composite index on (organization_id, status, issue_date)
  - _Requirements: 1.1, 1.2, 1.3, 1.5, 2.1, 2.2_

- [ ] 2.2 Create line_items table with relationships
  - Define Drizzle schema for line_items table
  - Include type enum, pricing fields, period dates, usage fields
  - Add foreign key to invoices with cascade delete
  - Add index on invoice_id and sort_order
  - _Requirements: 3.1, 3.2, 3.4, 3.5_

- [ ] 2.3 Create receipts table
  - Define Drizzle schema for receipts table
  - Include payment details, external references, delivery status
  - Add indexes on receipt_number, invoice_id, customer_id
  - _Requirements: 4.1, 4.2, 4.3_

- [ ] 2.4 Create credit_notes table
  - Define Drizzle schema for credit_notes table
  - Include refund details, status, type enum
  - Add indexes on credit_note_number, invoice_id
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [ ] 2.5 Create tax_rates table
  - Define Drizzle schema for tax_rates table
  - Include jurisdiction fields, rate, validity dates, rules
  - Add indexes on country, state, effective_from, effective_to
  - _Requirements: 2.4, 2.7_

- [ ] 2.6 Create invoice_templates table
  - Define Drizzle schema for invoice_templates table
  - Include branding fields, company info, layout preferences
  - Add index on organization_id and is_default
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 2.7 Create invoice_audit_log table
  - Define Drizzle schema for audit log table
  - Include action type, actor info, changes JSON, context
  - Add indexes on invoice_id, created_at, action
  - Implement partitioning by date for performance
  - _Requirements: 11.1, 11.2, 11.3, 11.4_

- [ ] 2.8 Create database migration files
  - Generate migration SQL from Drizzle schemas using existing migration system
  - Follow existing migration naming conventions
  - Test migrations on development database
  - Verify all indexes and constraints are created
  - Verify foreign key relationships to existing tables
  - Test rollback functionality
  - _Requirements: All database requirements_

- [ ] 2.9 Write property test for database schema integrity
  - **Property 1: Invoice number uniqueness and format**
  - **Property 2: Invoice completeness**
  - **Validates: Requirements 1.2, 1.3**


- [ ] 3. Implement core data models and validation schemas
- [ ] 3.1 Create TypeScript interfaces for all models
  - Define Invoice, LineItem, Receipt, CreditNote, TaxRate interfaces
  - Define supporting types (Address, InvoiceTotals, TaxCalculation, etc.)
  - Export all types from central models file
  - _Requirements: 1.3, 2.2, 3.1, 4.2, 8.1_

- [ ] 3.2 Create Zod validation schemas
  - Define CreateInvoiceSchema, UpdateInvoiceSchema
  - Define LineItemSchema with type-specific validation
  - Define ReceiptSchema, CreditNoteSchema
  - Define TaxRateSchema, InvoiceTemplateSchema
  - Include currency validation, amount validation (positive integers)
  - _Requirements: 1.3, 2.2, 3.1, 4.2_

- [ ] 3.3 Write property test for validation schemas
  - **Property 9: Integer storage for amounts**
  - **Property 10: Currency formatting**
  - **Validates: Requirements 2.2, 2.3**

- [ ] 3.4 Create invoice status state machine
  - Define valid status transitions (draft → issued → paid/overdue/void/refunded)
  - Implement state transition validation function
  - Define allowed operations per status
  - _Requirements: 1.5, 1.6, 1.7, 1.8_

- [ ] 3.5 Write property test for state machine
  - **Property 4: Initial invoice status**
  - **Property 5: Payment status transition**
  - **Property 7: Invoice mutability by status**
  - **Validates: Requirements 1.5, 1.6, 1.8**

- [ ] 4. Implement repository layer
- [ ] 4.1 Create InvoiceRepository
  - Implement create, update, findById, findByNumber methods
  - Implement findByCustomer, findOverdue, findByStatus methods
  - Use Drizzle ORM for all database operations
  - Include proper error handling and logging
  - _Requirements: 1.1, 1.2, 1.7_

- [ ] 4.2 Create LineItemRepository
  - Implement create, update, findById, findByInvoice methods
  - Implement delete with cascade handling
  - Handle sort_order management
  - _Requirements: 3.1, 3.7_

- [ ] 4.3 Create ReceiptRepository
  - Implement create, findById, findByNumber methods
  - Implement findByInvoice, findByCustomer methods
  - _Requirements: 4.1, 4.2, 4.3_

- [ ] 4.4 Create CreditNoteRepository
  - Implement create, findById, findByNumber methods
  - Implement findByInvoice methods
  - _Requirements: 8.1, 8.4_

- [ ] 4.5 Create TaxRateRepository
  - Implement create, update, findById methods
  - Implement findByJurisdiction with date filtering
  - Implement findEffectiveRate for specific date
  - _Requirements: 2.4, 2.7_

- [ ] 4.6 Create InvoiceTemplateRepository
  - Implement create, update, findById methods
  - Implement findByOrganization, findDefault methods
  - _Requirements: 6.2, 6.5_

- [ ] 4.7 Write integration tests for all repositories (REAL DATABASE)
  - Use real Supabase test database with isolated schema
  - Create test data manager for lifecycle management
  - Test CRUD operations with automatic cleanup
  - Test query filters and pagination
  - Test error handling for not found cases
  - Ensure tests are idempotent and support parallel execution
  - Use unique identifiers per test run
  - _Requirements: All repository requirements_

- [ ] 5. Implement TaxService
- [ ] 5.1 Implement tax calculation logic
  - Create calculateTax method with jurisdiction lookup
  - Implement getTaxRate with historical rate support
  - Handle tax-exempt customers
  - Calculate tax per line item
  - _Requirements: 2.4, 2.5, 2.7_

- [ ] 5.2 Write property test for tax calculations
  - **Property 11: Tax rate application by jurisdiction**
  - **Property 12: Tax exemption by validation**
  - **Property 14: Historical tax rate application**
  - **Validates: Requirements 2.4, 2.5, 2.7**

- [ ] 5.3 Implement EU VAT validation and reverse charge
  - Create validateTaxId method with VIES integration
  - Implement isReverseChargeApplicable logic
  - Handle B2B vs B2C scenarios
  - _Requirements: 2.6_

- [ ] 5.4 Write property test for EU reverse charge
  - **Property 13: EU reverse charge mechanism**
  - **Validates: Requirements 2.6**

- [ ] 5.5 Implement tax reporting
  - Create generateTaxReport method
  - Implement aggregateTaxByJurisdiction
  - Support date range filtering
  - _Requirements: 2.8, 10.5_

- [ ] 5.6 Write property test for tax aggregation
  - **Property 15: Tax aggregation consistency**
  - **Property 74: Tax report aggregation**
  - **Validates: Requirements 2.8, 10.5**

- [ ] 6. Implement InvoiceService core functionality
- [ ] 6.1 Implement invoice creation
  - Create createInvoice method with validation
  - Generate unique invoice number (INV-{YEAR}-{SEQUENCE})
  - Set initial status to draft
  - Handle customer currency selection
  - Store amounts in cents
  - _Requirements: 1.1, 1.2, 1.3, 1.5, 2.1, 2.2_

- [ ] 5.2 Write property test for invoice creation
  - **Property 1: Invoice number uniqueness and format**
  - **Property 3: Charge consolidation**
  - **Property 8: Currency selection**
  - **Validates: Requirements 1.2, 1.4, 2.1**

- [ ] 5.3 Implement line item management
  - Create addLineItem, updateLineItem, removeLineItem methods
  - Handle sort_order automatically
  - Validate line item types and required fields
  - _Requirements: 3.1, 3.4, 3.5, 3.7_

- [ ] 5.4 Write property test for line items
  - **Property 16: Subscription line item completeness**
  - **Property 19: Usage line item structure**
  - **Property 20: Discount representation**
  - **Property 22: Line item ordering**
  - **Validates: Requirements 3.1, 3.4, 3.5, 3.7**

- [ ] 5.5 Implement proration calculations
  - Create calculateProration method
  - Calculate based on days used / total days
  - Handle month boundaries correctly
  - Round to nearest cent
  - _Requirements: 3.2, 3.3_

- [ ] 5.6 Write property test for proration
  - **Property 17: Proration calculation accuracy**
  - **Property 18: Plan change line item separation**
  - **Validates: Requirements 3.2, 3.3**

- [ ] 5.7 Implement invoice totals calculation
  - Create calculateTotals method
  - Sum line items for subtotal
  - Calculate tax using TaxService
  - Apply discounts
  - Calculate final total
  - _Requirements: 3.8_

- [ ] 5.8 Write property test for totals calculation
  - **Property 23: Line item calculation order**
  - Test that total = subtotal + tax - discount
  - **Validates: Requirements 3.8**

- [ ] 5.9 Implement invoice status management
  - Create markAsPaid, markAsOverdue, voidInvoice methods
  - Validate state transitions
  - Record status change timestamps
  - Create audit log entries
  - _Requirements: 1.6, 1.7, 1.8_

- [ ] 5.10 Write property test for status management
  - **Property 6: Overdue status detection**
  - **Validates: Requirements 1.7**

- [ ] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Implement ReceiptService
- [ ] 7.1 Implement receipt generation
  - Create generateReceipt method
  - Generate unique receipt number (RCT-{YEAR}-{SEQUENCE})
  - Extract payment details from payment data
  - Link to invoice
  - Set generation timestamp
  - _Requirements: 4.1, 4.2, 4.3_

- [ ] 7.2 Write property test for receipt generation
  - **Property 24: Receipt generation timing**
  - **Property 25: Receipt completeness**
  - **Property 26: Receipt number uniqueness and format**
  - **Validates: Requirements 4.1, 4.2, 4.3**

- [ ] 7.3 Implement partial payment handling
  - Handle partial payment amounts
  - Update invoice paid_cents
  - Calculate remaining balance
  - _Requirements: 4.6_

- [ ] 7.4 Write property test for partial payments
  - **Property 29: Partial payment receipt accuracy**
  - **Validates: Requirements 4.6**

- [ ] 7.5 Implement multi-invoice payment handling
  - Generate separate receipts for each invoice
  - Allocate payment amounts correctly
  - _Requirements: 4.7_

- [ ] 7.6 Write property test for multi-invoice payments
  - **Property 30: Multi-invoice payment receipts**
  - **Validates: Requirements 4.7**

- [ ] 8. Implement PDFService with Vercel Blob Storage
- [ ] 8.1 Set up PDF generation library and storage
  - Install and configure pdf-lib or puppeteer
  - Set up Vercel Blob Storage for PDF storage
  - Create base PDF template structure
  - Set up font loading and styling
  - Implement CDN-backed PDF serving
  - _Requirements: 6.8_

- [ ] 8.2 Implement invoice PDF generation
  - Create generateInvoicePDF method
  - Apply invoice template (logo, colors, company info)
  - Render invoice header with invoice number, dates
  - Render customer information
  - Render line items table
  - Render totals section
  - Render footer with payment terms
  - _Requirements: 5.3, 6.2, 6.3, 6.4_

- [ ] 8.3 Write property test for PDF generation
  - **Property 34: PDF generation performance**
  - **Property 45: Template version immutability**
  - **Validates: Requirements 5.3, 6.7**

- [ ] 8.4 Implement receipt PDF generation
  - Create generateReceiptPDF method
  - Include payment details, invoice reference
  - Apply template styling
  - _Requirements: 4.5_

- [ ] 8.5 Implement credit note PDF generation
  - Create generateCreditNotePDF method
  - Reference original invoice
  - Show credited amount and reason
  - _Requirements: 8.5_

- [ ] 8.6 Implement template management
  - Create getTemplate, updateTemplate methods
  - Handle template versioning
  - Implement previewTemplate with sample data
  - _Requirements: 6.5, 6.6, 6.7_

- [ ] 8.7 Write property test for template isolation
  - **Property 43: Template isolation by organization**
  - **Validates: Requirements 6.5**

- [ ] 9. Implement EmailService
- [ ] 9.1 Set up email provider integration
  - Configure SendGrid or similar email service
  - Set up email templates
  - Configure retry logic with exponential backoff
  - _Requirements: 4.4, 4.8_

- [ ] 9.2 Implement invoice email sending
  - Create sendInvoiceEmail method
  - Include HTML and PDF attachment
  - Include invoice summary and payment link
  - Track delivery status
  - _Requirements: 9.1, 9.4_

- [ ] 9.3 Write property test for invoice emails
  - **Property 62: Invoice issuance notification**
  - **Property 65: Invoice email content**
  - **Validates: Requirements 9.1, 9.4**

- [ ] 9.4 Implement receipt email sending
  - Create sendReceiptEmail method
  - Include HTML and PDF attachment
  - Send within 5 minutes of receipt creation
  - _Requirements: 4.4, 4.5, 9.7_

- [ ] 9.5 Write property test for receipt emails
  - **Property 27: Receipt email delivery timing**
  - **Property 28: Receipt email format**
  - **Validates: Requirements 4.4, 4.5**

- [ ] 9.6 Implement reminder and overdue emails
  - Create sendReminderEmail method
  - Create sendOverdueNotice method
  - Implement scheduling logic (7 days before, 1/7/14 days after)
  - Consolidate multiple unpaid invoices
  - _Requirements: 9.2, 9.3, 9.5_

- [ ] 9.7 Write property test for reminders
  - **Property 63: Due date reminder scheduling**
  - **Property 64: Overdue notice schedule**
  - **Property 66: Multi-invoice reminder consolidation**
  - **Validates: Requirements 9.2, 9.3, 9.5**

- [ ] 9.8 Implement retry logic
  - Implement exponential backoff for failed emails
  - Log failures after max retries
  - Queue for manual intervention
  - _Requirements: 4.8_

- [ ] 9.9 Write property test for email retry
  - **Property 31: Receipt email retry behavior**
  - **Validates: Requirements 4.8**

- [ ] 9.10 Implement email tracking
  - Track delivery status and open rates
  - Store tracking data in database
  - _Requirements: 9.6_

- [ ] 10. Implement CreditNoteService
- [ ] 10.1 Implement credit note creation
  - Create issueCreditNote method
  - Generate unique credit note number (CN-{YEAR}-{SEQUENCE})
  - Reference original invoice
  - Match line items for refunds
  - _Requirements: 8.1, 8.4, 8.6_

- [ ] 10.2 Write property test for credit notes
  - **Property 54: Credit note invoice reference**
  - **Property 57: Credit note number uniqueness**
  - **Validates: Requirements 8.1, 8.4**

- [ ] 10.3 Implement refund processing
  - Handle full and partial refunds
  - Update invoice status appropriately
  - Calculate adjusted balances
  - Integrate with payment gateway for refund initiation
  - _Requirements: 8.2, 8.3, 8.6_

- [ ] 10.4 Write property test for refunds
  - **Property 55: Full refund credit note**
  - **Property 56: Partial refund credit note**
  - **Validates: Requirements 8.2, 8.3**

- [ ] 10.5 Implement credit balance management
  - Update customer account balance
  - Apply credits to future invoices
  - Track credit usage
  - _Requirements: 8.7_

- [ ] 10.6 Write property test for credit application
  - **Property 60: Credit balance application**
  - **Validates: Requirements 8.7**

- [ ] 11. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. Implement AccountingService
- [ ] 12.1 Set up accounting system integrations
  - Implement QuickBooks Online API client
  - Implement Xero API client
  - Implement generic webhook client
  - Handle OAuth authentication
  - _Requirements: 7.3_

- [ ] 12.2 Implement invoice sync
  - Create syncInvoice method
  - Map line items to accounting categories
  - Include all required data (customer, items, tax, payment)
  - Handle sync timing (within 15 minutes of payment)
  - _Requirements: 7.1, 7.2, 7.4_

- [ ] 12.3 Write property test for accounting sync
  - **Property 46: Accounting sync timing**
  - **Property 47: Accounting category mapping**
  - **Property 49: Sync data completeness**
  - **Validates: Requirements 7.1, 7.2, 7.4**

- [ ] 12.4 Implement credit note sync
  - Create syncCreditNote method
  - Map to credit memo or negative invoice
  - _Requirements: 7.6_

- [ ] 12.5 Implement retry and error handling
  - Implement exponential backoff (up to 5 retries)
  - Detect authentication failures
  - Alert administrators on final failure
  - _Requirements: 7.5, 7.8_

- [ ] 12.6 Write property test for sync retry
  - **Property 50: Accounting sync retry behavior**
  - **Property 53: Authentication failure detection**
  - **Validates: Requirements 7.5, 7.8**

- [ ] 12.7 Implement sync status tracking
  - Store sync status and timestamp
  - Display in invoice details
  - _Requirements: 7.7_

- [ ] 13. Implement Stripe payment integration
- [ ] 13.1 Set up Stripe webhook handlers
  - Handle payment_intent.succeeded event
  - Handle charge.refunded event
  - Verify webhook signatures
  - Implement idempotency for webhook processing
  - _Requirements: 1.6, 8.6_

- [ ] 13.2 Implement payment processing
  - Create payment intent for invoices
  - Handle payment confirmation
  - Generate receipts automatically
  - Update invoice status
  - _Requirements: 1.6, 4.1_

- [ ] 13.3 Implement refund processing
  - Initiate refunds through Stripe
  - Track refund status
  - Update credit notes with refund details
  - _Requirements: 8.6_

- [ ] 13.4 Write integration tests for Stripe (REAL STRIPE TEST MODE)
  - Use real Stripe test mode API with test keys
  - Test webhook handling with real test events
  - Test payment flow end-to-end with test cards
  - Test refund flow with real refund processing
  - Manage test data lifecycle (create and cleanup)
  - Ensure idempotency across multiple test runs
  - _Requirements: 1.6, 4.1, 8.6_

- [ ] 14. Implement API routes
- [ ] 14.1 Create invoice API routes
  - POST /api/invoices - Create invoice
  - GET /api/invoices/:id - Get invoice
  - PATCH /api/invoices/:id - Update invoice (draft only)
  - POST /api/invoices/:id/issue - Issue invoice
  - POST /api/invoices/:id/void - Void invoice
  - POST /api/invoices/:id/mark-paid - Mark as paid
  - GET /api/invoices/:id/pdf - Download PDF
  - GET /api/invoices - List invoices with filters
  - _Requirements: 1.1, 1.2, 1.3, 1.6, 1.7, 1.8, 5.3_

- [ ] 14.2 Create receipt API routes
  - POST /api/receipts - Generate receipt
  - GET /api/receipts/:id - Get receipt
  - GET /api/receipts/:id/pdf - Download PDF
  - GET /api/receipts - List receipts
  - _Requirements: 4.1, 4.2_

- [ ] 14.3 Create credit note API routes
  - POST /api/credit-notes - Create credit note
  - GET /api/credit-notes/:id - Get credit note
  - GET /api/credit-notes/:id/pdf - Download PDF
  - GET /api/credit-notes - List credit notes
  - _Requirements: 8.1, 8.2, 8.3_

- [ ] 14.4 Create analytics API routes
  - GET /api/analytics/invoices - Invoice analytics
  - GET /api/analytics/revenue - Revenue breakdown
  - GET /api/analytics/tax - Tax reports
  - GET /api/analytics/customers - Customer analytics
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 14.5 Create bulk operations API routes
  - POST /api/invoices/bulk/send-reminders
  - POST /api/invoices/bulk/mark-paid
  - POST /api/invoices/bulk/void
  - POST /api/invoices/bulk/export
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.6_

- [ ] 14.6 Write integration tests for API routes (REAL SERVICES)
  - Use real Supabase database for data operations
  - Use real Clerk authentication in tests
  - Test all endpoints with valid and invalid inputs
  - Test authentication and authorization with real Clerk tokens
  - Test error responses
  - Manage test data lifecycle with automatic cleanup
  - Ensure tests are idempotent and support parallel execution
  - _Requirements: All API requirements_

- [ ] 15. Implement customer portal pages
- [ ] 15.1 Create invoice list page
  - Display invoices sorted by date (newest first)
  - Show invoice number, date, amount, status, download button
  - Implement filtering (date range, status, amount)
  - Highlight unpaid invoices with "Pay Now" button
  - _Requirements: 5.1, 5.2, 5.5, 5.7_

- [ ] 15.2 Write property test for invoice list
  - **Property 32: Invoice list sorting**
  - **Property 33: Invoice list item completeness**
  - **Validates: Requirements 5.1, 5.2**

- [ ] 15.3 Create invoice detail page
  - Display all invoice information
  - Show all line items in table
  - Display payment history
  - Show related receipts and credit notes
  - Include download PDF button
  - _Requirements: 5.4, 8.8_

- [ ] 15.4 Write property test for invoice details
  - **Property 35: Invoice detail completeness**
  - **Property 61: Credit note history visibility**
  - **Validates: Requirements 5.4, 8.8**

- [ ] 15.5 Implement payment flow
  - "Pay Now" button redirects to Stripe checkout
  - Pre-select invoice for payment
  - Handle payment success callback
  - _Requirements: 5.6_

- [ ] 15.6 Implement receipt access
  - Allow downloading receipts for paid invoices
  - Restrict access to unpaid invoices
  - _Requirements: 5.8_

- [ ] 15.7 Write E2E tests for customer portal (CLERK AUTH + REAL DATA)
  - Use official @clerk/testing utilities for authentication
  - Seed test data with unique identifiers per run
  - Test complete user journey: view invoices → view details → pay → download receipt
  - Test filtering and search
  - Clean up all test data after test completion
  - Ensure tests are idempotent and support parallel execution
  - Follow Clerk E2E testing guidelines
  - _Requirements: 5.1-5.8_

- [ ] 16. Implement admin dashboard pages
- [ ] 16.1 Create invoice management page
  - List all invoices with filters
  - Bulk selection and actions
  - Create new invoice form
  - Edit draft invoices
  - Void invoices with reason
  - _Requirements: 1.1, 1.8, 12.1_

- [ ] 16.2 Create template management page
  - Upload logo with dimension validation
  - Configure company information
  - Select color schemes
  - Edit footer text
  - Preview template with sample invoice
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.6_

- [ ] 16.3 Create analytics dashboard
  - Display invoice analytics with charts
  - Show revenue breakdown
  - Display payment patterns
  - Show customer analytics
  - Display tax reports
  - Export reports in CSV/Excel/PDF
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

- [ ] 16.4 Write property test for analytics
  - **Property 70: Invoice analytics totals**
  - **Property 71: Revenue breakdown accuracy**
  - **Property 72: Payment pattern metrics**
  - **Validates: Requirements 10.1, 10.2, 10.3**

- [ ] 16.4 Create audit log viewer
  - Display audit trail for invoices
  - Show all operations chronologically
  - Filter by action type, user, date
  - Export audit logs
  - _Requirements: 11.1, 11.2, 11.5, 11.7_

- [ ] 17. Implement bulk operations
- [ ] 17.1 Implement bulk reminder sending
  - Queue emails for selected invoices
  - Rate limit sending (10 per second)
  - Track progress
  - Report success/failure counts
  - _Requirements: 12.2, 12.3, 12.7_

- [ ] 17.2 Write property test for bulk reminders
  - **Property 88: Bulk email rate limiting**
  - **Property 90: Bulk operation partial failure handling**
  - **Validates: Requirements 12.3, 12.5**

- [ ] 17.3 Implement bulk export
  - Generate ZIP with individual PDFs
  - Include summary CSV
  - Handle large exports asynchronously
  - _Requirements: 12.4_

- [ ] 17.4 Write property test for bulk export
  - **Property 89: Bulk export format**
  - **Validates: Requirements 12.4**

- [ ] 17.5 Implement bulk status updates
  - Bulk mark as paid
  - Bulk void with confirmation and reason
  - Validate operations per invoice
  - _Requirements: 12.1, 12.6_

- [ ] 17.6 Write property test for bulk operations
  - **Property 86: Bulk action availability**
  - **Property 87: Bulk operation async processing**
  - **Property 93: Bulk operation rate limiting**
  - **Validates: Requirements 12.1, 12.2, 12.8**

- [ ] 18. Implement background jobs and scheduling (Vercel-specific)
- [ ] 18.1 Set up job queue with Vercel KV
  - Use existing Vercel KV (Redis) instance
  - Set up job queue using Vercel KV
  - Implement job processors
  - Implement retry logic with exponential backoff
  - Implement idempotent job handlers
  - _Requirements: 4.4, 7.1, 9.2, 9.3_

- [ ] 18.2 Create Vercel Cron jobs
  - Configure vercel.json with cron schedules
  - Daily cron: Check for overdue invoices (0 0 * * *)
  - Daily cron: Send due date reminders (0 9 * * *)
  - 5-minute cron: Process pending jobs (*/5 * * * *)
  - Implement cron endpoints in app/api/cron/
  - Add CRON_SECRET verification for security
  - _Requirements: 1.7, 7.1, 9.2, 9.3_

- [ ] 18.3 Create async job handlers
  - PDF generation job (30s timeout)
  - Email sending job with retry
  - Accounting sync job with retry
  - Bulk operation job (batched processing)
  - Implement job status tracking
  - _Requirements: 4.4, 5.3, 7.1, 12.2_

- [ ] 18.4 Write integration tests for jobs (REAL VERCEL KV)
  - Use real Vercel KV for job queue testing
  - Test job scheduling and execution
  - Test retry logic with real failures
  - Test error handling
  - Test idempotency across multiple runs
  - Clean up test jobs after completion
  - _Requirements: All async requirements_

- [ ] 19. Implement audit logging
- [ ] 19.1 Create audit logging middleware
  - Log all invoice operations
  - Capture user ID, timestamp, action, changes
  - Store IP address and user agent
  - _Requirements: 11.1, 11.4_

- [ ] 19.2 Write property test for audit logging
  - **Property 78: Audit log completeness**
  - **Property 79: Audit history chronological ordering**
  - **Validates: Requirements 11.1, 11.2**

- [ ] 19.3 Implement audit log queries
  - Query by invoice ID
  - Query by user ID
  - Query by action type
  - Query by date range
  - _Requirements: 11.2, 11.5_

- [ ] 19.4 Implement audit log export
  - Export in CSV/JSON format
  - Include all audit trail data
  - Support date range filtering
  - _Requirements: 11.7_

- [ ] 20. Implement caching layer with Vercel KV
- [ ] 20.1 Set up Vercel KV caching
  - Use existing Vercel KV (Redis) instance
  - Implement cache service with consistent key patterns
  - Set up cache invalidation strategies
  - Implement cache warming for frequently accessed data
  - _Requirements: Performance optimization_

- [ ] 20.2 Cache tax rates
  - Cache by jurisdiction with 1 hour TTL
  - Invalidate on tax rate updates
  - Use cache key pattern: `tax:{jurisdiction}:{date}`
  - _Requirements: 2.4_

- [ ] 20.3 Cache invoice templates
  - Cache by organization ID
  - Invalidate on template updates
  - Use cache key pattern: `template:{orgId}`
  - _Requirements: 6.2_

- [ ] 20.4 Store PDFs in Vercel Blob Storage
  - Use Vercel Blob Storage instead of caching
  - Store PDFs with public CDN access
  - Implement PDF cleanup on invoice deletion
  - Use blob key pattern: `invoices/{invoiceId}.pdf`
  - _Requirements: 5.3_

- [ ] 21. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 22. Performance optimization and monitoring (Vercel-specific)
- [ ] 22.1 Add database indexes and optimize queries
  - Verify all indexes are created
  - Add composite index on (organization_id, status, issue_date)
  - Analyze query performance with EXPLAIN
  - Optimize N+1 queries
  - Leverage Supabase connection pooling
  - _Requirements: Performance optimization_

- [ ] 22.2 Implement monitoring with Vercel Analytics
  - Integrate with Vercel Analytics for function metrics
  - Track API response times by endpoint
  - Monitor PDF generation performance
  - Track email delivery rates
  - Alert on failed accounting syncs
  - Monitor payment gateway errors
  - Use existing Sentry integration for error tracking
  - Implement custom metrics tracking
  - _Requirements: Performance optimization_

- [ ] 22.3 Load testing with realistic scenarios
  - Test invoice generation under load (target: <2s)
  - Test bulk operations with large datasets (1000+ invoices)
  - Test concurrent PDF generation
  - Test Vercel function timeout limits
  - Optimize bottlenecks
  - Verify Vercel KV performance under load
  - _Requirements: Performance optimization_

- [ ] 22.4 Write performance tests (REAL SERVICES)
  - Test invoice generation < 2 seconds with real database
  - Test PDF generation < 3 seconds with real storage
  - Test receipt generation < 60 seconds end-to-end
  - Test bulk operations efficiency
  - Measure p50, p95, p99 latencies
  - Verify no memory leaks during extended runs
  - _Requirements: 4.1, 5.3_

- [ ] 23. Security hardening
- [ ] 23.1 Implement rate limiting
  - Rate limit API endpoints
  - Rate limit bulk operations
  - Rate limit email sending
  - _Requirements: 12.8_

- [ ] 23.2 Implement data encryption
  - Encrypt sensitive fields (tax IDs, payment details)
  - Use HTTPS for all communications
  - _Requirements: Security considerations_

- [ ] 23.3 Implement authorization checks
  - Verify organization membership for all operations
  - Restrict customer portal to invoice owners
  - Require admin permissions for sensitive operations
  - _Requirements: Security considerations_

- [ ] 23.4 Write security tests
  - Test authorization on all endpoints
  - Test rate limiting
  - Test input validation
  - _Requirements: Security considerations_

- [ ] 24. Documentation and Vercel deployment
- [ ] 24.1 Write API documentation
  - Document all endpoints with examples
  - Include request/response schemas
  - Document error codes
  - Document Vercel-specific considerations (timeouts, limits)
  - _Requirements: All API requirements_

- [ ] 24.2 Write user documentation
  - Customer portal user guide
  - Admin dashboard user guide
  - Invoice template customization guide
  - _Requirements: User experience_

- [ ] 24.3 Configure Vercel deployment
  - Update vercel.json with function timeouts
  - Configure Vercel Cron schedules
  - Set up Vercel KV for caching and jobs
  - Set up Vercel Blob Storage for PDFs
  - Configure environment variables via Phase.dev
  - Set up preview deployments
  - Configure production deployment settings
  - _Requirements: Deployment_

- [ ] 24.4 Set up monitoring and alerting
  - Configure existing Sentry integration
  - Set up Vercel Analytics
  - Configure alerts for critical failures
  - Set up Slack/email notifications for errors
  - Monitor function execution times
  - Track cache hit rates
  - _Requirements: Monitoring_
