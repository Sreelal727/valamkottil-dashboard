# Valamkottil · Sell-Through Dashboard

A browser-based sell-through & inventory intelligence dashboard for **Valamkottil**, a
single-outlet textile retailer running **Marg ERP 9+**. Marg has no API, so the app works
as a **manual upload overlay**: you export CSV/Excel from Marg, drop the files in, and the
dashboard cleans, stages, and visualises them — the same "upload daily report" model as the
PentaSky reference, adapted for one shop.

Everything runs **client-side** — files are parsed in the browser and cached in IndexedDB.
No server, no data leaves the machine.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
```

## The five pages

1. **Business Summary** — Sales Today, Avg/Day, Expected This Month (run-rate), Total Stock
   Value, Dead Stock Value, and a Data-Quality flag count. Monthly trend + top categories.
2. **Charts** — Sales by Category (donut, GST-prefix stripped), Category-wise Gross Profit %,
   Best Sellers, Cash vs Credit, monthly trend. No "Sales by Shop" or "Sales by Brand" (see below).
3. **Key Takeaways** — auto-written plain-English intelligence grouped into Today / This Month /
   Watchlist / Data Quality.
4. **Supplier Payables** — who the shop owes (from Sundry Creditors), top suppliers, indicative
   aging from batch invoice dates. This *replaces* PentaSky's "Money Owed by Shop" (opposite direction).
5. **Product & Stock** — Best Sellers, Reorder Soon (months-of-cover), Not Selling (aged stock),
   and a textile-specific Size/Variant view parsed from item names.

## Upload types (auto-detected by content, not filename)

| Type | Marg export | Used for |
|------|-------------|----------|
| Item-Wise Sales Summary | Party/Item Wise Sales Summary | Today's sales, category mix, best sellers |
| Daily Analysis | Daily Analysis print report | Cash/credit split, category GP%, headline bills |
| Ledger Summary | Item ledger, monthly columns | Month-over-month trend, velocity |
| Stock Report (snapshot) | Stock report, one row/item | Stock value, dead stock, data-quality flags |
| Stock Report (batch) | Stock report with batch detail | Supplier attribution, aging, reorder |
| Sundry Creditors | Trial balance / creditors | Supplier payables |

Re-uploading a corrected file for the same day **replaces** it (dedupe by report date / kind) —
totals never double.

## Data quirks handled

- **Junk banner rows** before the real header are detected programmatically, not hardcoded.
- **Padded / unit-laden numbers** (`"  4 PCS"`, `"       75963"`) are trimmed and cast.
- **GST-rate prefix** (`10% BAGGY`) is split into `gstRate` + `clean_category`.
- **Fixed-width Daily Analysis** is parsed with regex, stripping `Continued..N` / `Page No..N` / repeated headers.
- **Negative stock/value** (Marg oversell errors) are flagged as discrepancies, not silently summed.
- **Partial ledgers** are detected (when monthly totals fall far below observed daily sales) and
  excluded from averages/dead-stock so KPIs stay honest — with an on-screen note.

## Deliberately NOT built (this phase)

- **Brand analysis** — Marg's `Company` field just echoes the category, so it's untrustworthy.
  The app flags this and recommends tagging real brands at purchase entry.
- **Multi-shop comparisons** — single outlet.
- **Offer/promo engine, staff performance, payroll** — explicitly Phase 2.
- **Real-time sync** — Marg has no API; this is a manual upload-and-refresh tool.

## Stack

Vite + React + TypeScript · SheetJS (lazy-loaded) for parsing · Zustand + IndexedDB for staging ·
hand-built SVG charts (no chart lib) for a small bundle and an intentional, non-templated look.
