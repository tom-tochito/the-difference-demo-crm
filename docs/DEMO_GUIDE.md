# Freight Operations: demonstration, benefits and roadmap

## The proposition

Freight decisions are often spread across rate sheets, messages, carrier systems and spreadsheets. Freight Operations demonstrates how one connected workflow could help importers compare like-for-like logistics costs, prepare shipments more reliably and understand the value of a managed service.

The platform's commercial opportunity is to earn transparent service fees and supplier-to-customer gross margin while delivering a lower overall cost or a better service outcome. Margin is not net profit: support, integration, insurance, finance and overhead costs still matter. The demonstration does not establish market rates or guaranteed savings.

## Ten-minute live walkthrough

Open the login page and use the account shortcuts. All demo passwords are `demo2026!`. Use separate browser profiles if you want client and platform views side by side.

### 0:00–1:30 — An importer sees a better choice

Sign in as **Alder & Finch · Admin** (`admin@alder.example`). The landing page contains only the company's records. Open **Savings studio**, select `SAVE-CONSOLIDATE` and compare the baseline and alternatives.

At source revision 1:

- Baseline: £4,800 for separate ocean movements + £1,200 handling/documentation = **£6,000**.
- Consolidated option: £3,300 freight + £650 handling + £250 platform fee = **£4,200**.
- Estimated importer saving: **£1,800 / 30%** after the platform fee.
- Delivery trade-off: 38 days versus the 35-day direct-ocean alternative.

Figures change deterministically after a simulated rates refresh. Always narrate the values visible on screen. Goods value, duties, taxes and insurance are excluded from both sides. Alternative options must not be added together as cumulative savings.

Click **Request this option**. Note the actual enquiry reference shown in the register. The request persists and saves the source revision and original assumptions.

### 1:30–3:00 — A comparison becomes an operational record

Sign out and choose **Platform superadmin** (`superadmin@freight.example`). Open the enquiry just created, select **Prepare quote**, review the itemised charges and simulate sending it. Nothing is emailed.

Return as Alder & Finch Admin, open Quotations and **Accept quote & book**. Repeating acceptance returns the same booking. Signing in as an ordinary user demonstrates that financial approval belongs to the client admin.

### 3:00–4:30 — Assign the work

As superadmin, open the booking, simulate confirmation, then **Plan / open shipment**. Note the generated shipment reference. Repeating conversion opens the same shipment.

As Alder & Finch Admin, open **Team & access**. Assign the linked enquiry to the Logistics user. The assignment grants visibility along the connected enquiry, quote, booking and shipment journey. Existing unrelated records remain unavailable unless separately assigned.

Sign in as **Alder & Finch · Logistics** (`logistics@alder.example`). Find the new shipment. The account can work on the shipment but cannot manage rates, issue invoices, change milestones or approve quotations.

### 4:30–6:00 — Documents and tracking stay connected

Upload a small fictional PDF, image or text attachment from the shipment page. It appears as **Awaiting approval**. As superadmin, review and approve that shared document; then simulate one tracking update.

Return as the assigned client user. The approved attachment and customer-visible tracking update appear without manual re-entry. Reload to demonstrate persistence. Internal notes, other clients' work and unshared documents are absent from the client response.

Existing operational examples remain available to superadmin:

- `SHP-OCEAN-APPROVAL`: document review.
- `SHP-DELAY-FOLLOWUP`: delayed freight and follow-up tasks.
- `SHP-AIR-ARRIVAL`: imminent arrival.
- `SHP-DELIVERED-DUE` / `INV-00004`: delivered freight with an outstanding invoice.
- `ENQ-DEMO-START`: a separate convertible sales example.

### 6:00–7:30 — Show both sides of the economics

As superadmin, create and issue an invoice for the new shipment, then record a partial demo payment. The client sees the issued invoice and remaining balance. No payment is collected.

Return to `SAVE-CONSOLIDATE` as superadmin. At revision 1 the internal supplier cost is **£3,500**, selling price is **£4,200** and estimated gross margin is **£700**. The £250 platform fee is included in selling price; adding it again would overstate margin.

The importer can save £1,800 in this fictional comparison while the platform earns £700 gross margin. Neither figure is a claim about real service economics. Currency views stay separate; invoice revenue and payment receipts are distinct.

### 7:30–9:00 — Show data provenance and isolation

Open **Data sources**. Explain the sample carrier rates, schedules, movement signals, port/document signals and importer cost history. Each exposes its source, coverage, observed time, validity and revision.

Simulate a rate refresh. Open comparisons reprice, but the saved request and accepted booking do not silently change. A stale browser request is rejected until the updated comparison is reviewed.

Sign in as **Northstar · Admin** (`admin@northstar.example`). Alder & Finch work is unavailable. Northstar has its own `SAVE-SERVICE` scenario: an ocean alternative for non-urgent replenishment, with the transit-time trade-off visible.

### 9:00–10:00 — Close with the delivery roadmap

Open **Demo guide**. Explain what works today, what is simulated and the evidence needed before running a commercial service. Finish on the concrete proposition: comparable costs, clearer responsibilities, fewer disconnected handovers and measurable platform economics.

## Capabilities and benefits

| Capability | Importer benefit | Platform benefit | Current demonstration |
| --- | --- | --- | --- |
| Cost comparison and fee breakdown | Understand the full comparable logistics price | Explain pricing and service value | Interactive fictional alternatives |
| Consolidation and service alternatives | Identify capacity and timing trade-offs | Build coordinated supplier demand | Three saved scenarios |
| Shared operational records | Less repeated entry and fewer handover gaps | Repeatable enquiry-to-invoice process | Persisted, reactive workflow |
| Documents and tasks | Prepare before deadlines and reduce avoidable delays | Structured review and follow-up | Real uploads, simulated operational events |
| Client workspaces and assignments | Control who sees and acts on work | Repeatable client onboarding | Server-enforced roles and job access |
| Provenance and source freshness | Know what a decision is based on | Track quality and refresh assumptions | Deterministic simulated feeds |
| Invoicing and economics | Understand charges and balances | Separate revenue, receipts, cost and margin | Demo invoices and payments |

These are potential benefits to validate in a pilot, not promised business results.

## Roadmap to a real platform

1. **Validate a narrow commercial proposition.** Choose a small set of lanes, importer profiles and service levels. Establish baseline costs, exclusions, lead-time targets and an agreed savings measurement method. Secure operational fulfilment partners and identify who owns each escalation.
2. **Secure data rights and build ingestion.** Negotiate carrier/forwarder rates, schedule feeds and tracking access. Confirm licensing and permitted reuse. Build adapters with currency/unit normalisation, surcharge rules, expiry, deduplication, provenance, retries and quality monitoring. Only compare offers that meet the same cargo and service constraints.
3. **Harden identity and tenancy.** Replace public credentials with private invitations, recovery, MFA/SSO, session revocation and auditable access changes. Add production-scale pagination, tenant quotas, retention controls, managed attachment delivery, backups and tested restore procedures.
4. **Integrate execution and finance.** Connect booking and tracking providers, document exchange and notification channels. Introduce payment/invoicing integrations with reconciliation, idempotency, refunds and explicit approval rules. Determine the contractual, insurance, customs and data-protection responsibilities for the chosen operating model.
5. **Run a measured pilot.** Track actual landed/logistics costs against agreed baselines, actual delivery performance, avoided fees with evidence, document turnaround, gross margin, cost to serve, retention and repeat bookings. Do not count forecast savings as realised savings.
6. **Expand selectively.** Add more lanes, suppliers, analytics and automation only when source quality, fulfilment reliability and unit economics support expansion. Subscription or managed-service tiers are future pricing options to test, not currently implemented billing products.

## Current boundaries

Working: authentication, backend permissions, persistent domain edits, customer search, linked workflow conversion, real attachment storage, printable samples and deterministic calculations.

Simulated: rates, schedules, carrier milestones, booking confirmations, invitation emails, invoice sending and payment receipts. No live carrier, customs, banking or email service is connected.

The demo is publicly accessible through advertised accounts. Use fictional data. Saved register views are device-local. Storage links act as bearer links; production delivery would need a stronger file-access strategy. Operations snapshots and assignments are bounded for demo scale. The data-source panel demonstrates aggregation concepts rather than claiming external integrations already exist.
