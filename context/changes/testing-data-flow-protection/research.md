# Research: Data Flow Protection — Risk #1

**Change**: testing-data-flow-protection  
**Created**: 2026-06-02  
**Branch**: master  
**Commit**: d3a54f866248b5417e526a007a16a9ff768bb87d  
**Focus**: Risk #1 from test-plan.md — CSV wrong column → false margins

## Executive Summary

**Where the risk flows through code:**
1. [src/lib/csv-parser.ts](src/lib/csv-parser.ts) `findColumn()` — fuzzy pattern matching auto-detects "Amount" column
2. [src/pages/api/upload-revenue.ts](src/pages/api/upload-revenue.ts) lines 98-104 — finds client/amount/date, defaults missing columns to fallback values
3. [src/pages/api/upload-revenue.ts](src/pages/api/upload-revenue.ts) lines 122-143 — parses amount with regex cleanup, inserts into `invoice_revenue` table
4. [supabase/migrations/20260601000002_add_margins_alerts_tables.sql](supabase/migrations/20260601000002_add_margins_alerts_tables.sql) lines 15-27 — `margin_amount` and `margin_percentage` GENERATED ALWAYS from revenue/cost

**What behavior proves protection:**
- **Observable at upload time**: Preview table (CSVPreviewTable) displays detected column names in header row — user sees "using column 'Price' as Amount" before confirming
- **Observable at assignment time**: Mapping confirmation UI (S-02 roadmap) shows column → field mapping with override option
- **Observable at calculation time**: Dashboard shows margin drill-down with source data (which upload, which row) — user can trace back to original CSV

**Cheapest test to catch the risk:**
Integration test: `POST /api/upload-revenue` with CSV containing wrong column name → assert response includes detected column name in preview + assert stored `raw_data` JSONB preserves original column names → verify margin calculation uses correct mapped amount, not wrong column.

## Risk #1 Deep Dive

### Risk Statement (from test-plan.md §2)

> **Paid user uploads revenue CSV → system parses wrong column as 'Amount' → margin calculations show false profit/loss → user makes bad business decision (fires profitable client)**
> 
> **Impact**: High — business decision based on false data  
> **Likelihood**: High — no column mapping UI yet (S-02 not implemented)  
> **Source**: PRD §5.1 (CSV upload requirement), hot-spot: src/pages/api/upload-revenue.ts (2 commits/30d)

### Code Path Analysis

#### Entry Point: CSV Upload API

**File**: [src/pages/api/upload-revenue.ts](src/pages/api/upload-revenue.ts)  
**Function**: `POST` handler  
**Flow**:
1. Extract authenticated user (lines 49-57)
2. Validate file size/type/structure (lines 59-77)
3. Parse CSV with papaparse wrapper (lines 79-87)
4. **Critical step**: Auto-detect columns (lines 98-104)

```typescript
// Lines 98-104 — auto-detection with NO user confirmation
const clientIndex = findColumn(headers, ['client', 'customer', 'klient']);
const amountIndex = findColumn(headers, ['amount', 'total', 'revenue', 'price', 'kwota']);
const dateIndex = findColumn(headers, ['date', 'invoice_date', 'data']);

// Fallback values if column not found
const clientName = clientIndex !== -1 ? row[clientIndex] : 'Unknown';
const amount = amountIndex !== -1 ? parseFloat(row[amountIndex].replace(/[^\d.-]/g, '')) : 0;
```

#### Pattern Matching Logic

**File**: [src/lib/csv-parser.ts](src/lib/csv-parser.ts)  
**Function**: `findColumn(headers: string[], patterns: string[]): number`  
**Lines**: 31-46  
**Behavior**:
- Case-insensitive exact match OR substring match
- Returns first matching column index
- Returns `-1` if no match found

**Critical flaw for Risk #1:**
```typescript
// Example: CSV has columns ["Client", "Description", "Price", "Date"]
// findColumn(headers, ['amount', 'total', 'revenue', 'price'])
// → Returns index 2 ("Price") — but "Price" might be unit price, not total amount
```

**Risk surfaces when:**
- CSV has both "Price" (unit) and "Total" (quantity × price) columns
- CSV has "Amount Paid" and "Amount Outstanding" columns
- CSV uses domain-specific naming ("Invoice Value", "Net Amount") not in pattern list

#### Data Storage

**File**: [src/pages/api/upload-revenue.ts](src/pages/api/upload-revenue.ts)  
**Lines**: 122-143  
**Destination**: `invoice_revenue` table  
**Columns written**:
- `amount` (NUMERIC) — mapped from detected column, regex-cleaned, parsed as float
- `raw_data` (JSONB) — stores entire original CSV row with original column names

**Mitigation already in place:**
- `raw_data` JSONB preserves original CSV row → allows post-upload correction
- Upload ID links transactions to source file → batch correction possible

#### Calculation Engine

**File**: [supabase/migrations/20260601000002_add_margins_alerts_tables.sql](supabase/migrations/20260601000002_add_margins_alerts_tables.sql)  
**Lines**: 15-27  
**Table**: `client_margins` (view or materialized view per roadmap S-04)  
**Calculation**:
```sql
margin_amount = total_revenue - total_cost
margin_percentage = (total_revenue - total_cost) / total_revenue * 100
```

**Risk realization:**
- If `amount` column contains wrong value (unit price instead of total), `total_revenue` is under-calculated
- Margin appears negative → user thinks client is unprofitable
- User fires client → loses profitable relationship

### Protection Behaviors (What Proves Defense)

From test-plan.md §2 "Risk Response Guidance" for Risk #1:

> **What would prove protection**: Mipmapped column with wrong name is rejected before calculation, OR preview shows warning "using column X as Amount — confirm?"
> 
> **Must challenge**: "User can see the preview" does not prove they noticed the wrong mapping

#### Protection Layer 1: Upload-Time Preview (Currently Implemented)

**Component**: [src/components/onboarding/CSVPreviewTable.tsx](src/components/onboarding/CSVPreviewTable.tsx)  
**Behavior**: Displays first 5 rows with **original headers** from CSV

**Current gap:**
- Preview shows raw data, but does NOT show **which column was detected as "Amount"**
- User sees preview table but has no visual cue that "Price" was selected instead of "Total"

**What would prove protection (improvement):**
- Preview header row highlights detected columns: `Client ✓`, `Price → Amount ⚠️`, `Date ✓`
- Warning badge: "⚠️ Using column 'Price' as Amount — is this correct?"
- Confirmation checkbox: "I confirm the amount column is correct"

#### Protection Layer 2: Column Mapping UI (S-02 Roadmap)

**Roadmap entry**: [context/foundation/roadmap.md](context/foundation/roadmap.md) S-02  
**Status**: ready (not started)  
**Planned behavior**:
- Interactive mapping UI: dropdown per required field (Client, Amount, Date)
- Preview updates live as user changes mapping
- Manual override: user selects correct column if auto-detection wrong

**What would prove protection:**
- User cannot proceed to step-3 without confirming mapping
- Mapping is stored in `uploads` table (new column: `column_mapping` JSONB)
- Dashboard drill-down shows mapping used for each upload

#### Protection Layer 3: Margin Drill-Down (S-05 Roadmap)

**Roadmap entry**: [context/foundation/roadmap.md](context/foundation/roadmap.md) S-05  
**Status**: proposed (blocked on alert threshold decision)  
**Planned behavior**:
- Dashboard shows margin per client with drill-down to source transactions
- User can see: "Margin for Client X = 15,234 PLN from 12 transactions (upload: revenue-2024-Q1.csv)"
- Click transaction → see original CSV row + detected mapping

**What would prove protection:**
- User can audit calculation: see which column was used as "Amount"
- User can re-upload with corrected mapping
- Historical correction: re-process upload with new mapping (updates all transactions from that upload)

### Cheapest Test Layer (Recommendation)

From test-plan.md §2 "Risk Response Guidance" for Risk #1:

> **Likely cheapest layer**: integration (upload → parse → map → validate flow)  
> **Anti-pattern to avoid**: Happy-path test with correct CSV — must test wrong mapping explicitly

#### Recommended Test: Integration

**Test file**: `tests/integration/csv-upload-wrong-column.test.ts`  
**Setup**:
1. Create test CSV with ambiguous columns:
   ```csv
   Client,Description,Unit Price,Quantity,Total Amount,Date
   Firma ABC,Consulting,500,10,5000,2024-01-15
   ```
2. Mock Supabase client (or use test database)
3. Authenticate test user

**Test cases**:
1. **Wrong column detection**:
   - Upload CSV
   - Assert: `findColumn()` returns index 2 ("Unit Price") not index 4 ("Total Amount")
   - Assert: stored `amount` = 500 (wrong!) not 5000 (correct)
   - Assert: `raw_data` JSONB contains `{"Unit Price": "500", "Total Amount": "5000"}`

2. **Preview shows detected column**:
   - Upload CSV
   - Assert: response `preview` includes header metadata: `{name: "Unit Price", detectedAs: "amount"}`
   - Assert: UI can render warning: "⚠️ Using column 'Unit Price' as Amount"

3. **Manual override (after S-02)**:
   - Upload CSV with `column_mapping: {amount: "Total Amount"}` in request body
   - Assert: stored `amount` = 5000 (correct)
   - Assert: `uploads.column_mapping` JSONB stores override

**Cost**: ~30 minutes to write, <1 second to run, no external dependencies

**Signal**: High — directly tests the failure scenario described in risk statement

#### Alternative: Unit Test (Lower Signal)

**Test file**: `tests/unit/csv-parser.test.ts`  
**Setup**: Mock CSV data as string array

**Test cases**:
1. **Pattern matching edge cases**:
   - Headers: `["Client", "Unit Price", "Total"]`
   - `findColumn(headers, ['amount', 'price'])` → returns 1 ("Unit Price")
   - Expected: User wants index 2 ("Total")

2. **Multiple matches**:
   - Headers: `["Amount Paid", "Amount Outstanding"]`
   - `findColumn(headers, ['amount'])` → returns 0 (first match)
   - Expected: User wants "Amount Paid" for revenue, but which one?

**Cost**: ~15 minutes to write, <100ms to run  
**Signal**: Medium — tests pattern logic but not end-to-end flow

**Why integration is cheaper per signal:**
- Unit test proves `findColumn()` works as coded
- Integration test proves `findColumn()` result is used correctly in upload → storage → calculation chain
- Integration test catches if mapping is lost between upload and storage

### Architectural Insights

#### Current Implementation Strengths

1. **Preservation of source data**:
   - `raw_data` JSONB stores entire CSV row → correction possible without re-upload
   - `upload_id` links transactions to source file → batch correction

2. **Explicit column patterns**:
   - Pattern arrays (`['amount', 'total', 'revenue', 'price']`) are readable and auditable
   - Easy to extend with domain-specific terms (e.g., `'faktura'`, `'invoice_value'`)

3. **Separation of concerns**:
   - Parsing logic isolated in `csv-parser.ts`
   - Upload orchestration in API route
   - Calculation in database (GENERATED columns)

#### Current Implementation Gaps

1. **No user confirmation of mapping**:
   - Auto-detection happens silently
   - User sees preview but no indication of which columns were selected
   - **Fix**: S-02 roadmap (column mapping UI)

2. **Pattern matching is greedy**:
   - First match wins → "Price" beats "Total" if "price" pattern comes first
   - No ranking/scoring (e.g., exact match > substring match)
   - **Fix**: Improve `findColumn()` to rank matches, prefer exact over substring

3. **No validation of detected values**:
   - If "amount" column contains text, `parseFloat()` returns `NaN` → stored as `0`
   - No warning to user that values are non-numeric
   - **Fix**: Add validation step after parsing, warn if >10% of amounts are 0 or NaN

4. **No post-upload correction flow**:
   - If user notices wrong mapping after upload, no UI to re-map
   - Requires re-upload with corrected CSV
   - **Fix**: S-05 roadmap (margin drill-down with re-processing option)

#### Recommended Architectural Improvements

1. **Return mapping metadata in upload response**:
   ```typescript
   return json({
     upload_id,
     preview: rows.slice(0, 5),
     detected_mapping: {
       client: { column: headers[clientIndex], pattern_matched: 'client' },
       amount: { column: headers[amountIndex], pattern_matched: 'price' },
       date: { column: headers[dateIndex], pattern_matched: 'date' }
     }
   });
   ```

2. **Store mapping in uploads table**:
   ```sql
   ALTER TABLE uploads ADD COLUMN column_mapping JSONB;
   ```
   - Enables audit trail: which mapping was used for each upload
   - Enables re-processing: re-calculate margins with corrected mapping

3. **Add mapping confirmation step** (S-02):
   - Preview page shows detected mapping with override UI
   - User must confirm before proceeding to step-3
   - Mapping stored in `uploads.column_mapping`

4. **Improve findColumn() ranking**:
   ```typescript
   function findColumn(headers: string[], patterns: string[]): number {
     // 1. Exact match (case-insensitive)
     for (const pattern of patterns) {
       const exactMatch = headers.findIndex(h => h.toLowerCase() === pattern.toLowerCase());
       if (exactMatch !== -1) return exactMatch;
     }
     // 2. Substring match (case-insensitive)
     for (const pattern of patterns) {
       const substringMatch = headers.findIndex(h => h.toLowerCase().includes(pattern.toLowerCase()));
       if (substringMatch !== -1) return substringMatch;
     }
     return -1;
   }
   ```

### Test Plan Integration

From [context/foundation/test-plan.md](context/foundation/test-plan.md) §3 Phase 1:

**Goal**: Defend CSV upload → mapping → assignment → calculation flow against garbage data  
**Risks covered**: #1 (wrong column), #2 (orphaned cost), #3 (malformed CSV)  
**Test types**: integration + unit  
**Status**: researched (current phase)

**Next steps** (per /10x-plan):
1. Write integration test suite for Risk #1:
   - `tests/integration/upload-wrong-column.test.ts`
   - `tests/integration/upload-ambiguous-columns.test.ts`
2. Write unit tests for `csv-parser.ts`:
   - `tests/unit/csv-parser-pattern-matching.test.ts`
3. Improve `findColumn()` ranking (exact > substring)
4. Return detected mapping in upload API response
5. Update CSVPreviewTable to show detected columns
6. Add validation: warn if >10% amounts are 0/NaN

**Cost × Signal ranking**:
1. **Integration test** (30 min / high signal) — do first
2. **Return mapping metadata** (15 min / high signal) — enables integration test assertions
3. **Unit test** (15 min / medium signal) — do after integration
4. **Improve ranking** (10 min / medium signal) — nice-to-have
5. **Validation warning** (20 min / medium signal) — defer to S-02

## References

### Code Files Analyzed

- [src/lib/csv-parser.ts](src/lib/csv-parser.ts) — parseCSV, findColumn, extractClientNames
- [src/pages/api/upload-revenue.ts](src/pages/api/upload-revenue.ts) — POST handler, column detection, batch insert
- [src/pages/api/upload-cost.ts](src/pages/api/upload-cost.ts) — mirror of revenue upload for costs
- [src/lib/upload-validation.ts](src/lib/upload-validation.ts) — file size/type/structure validation
- [src/components/onboarding/CSVPreviewTable.tsx](src/components/onboarding/CSVPreviewTable.tsx) — preview UI
- [supabase/migrations/20260601000002_add_margins_alerts_tables.sql](supabase/migrations/20260601000002_add_margins_alerts_tables.sql) — margin calculation (GENERATED columns)

### Context Documents

- [context/foundation/test-plan.md](context/foundation/test-plan.md) §2 Risk Map, §3 Phased Rollout
- [context/foundation/roadmap.md](context/foundation/roadmap.md) S-02 (column mapping UI), S-05 (margin drill-down)
- [context/foundation/prd.md](context/foundation/prd.md) §5.1 (CSV upload requirement)

### Example Data

- [revenue-example.csv](revenue-example.csv) — 15 transactions, 6 clients, Q1 2024
- [cost-example.csv](cost-example.csv) — 16 cost items, Q1 2024

---

**Research complete**. Next: `/10x-plan testing-data-flow-protection` to convert findings into implementation plan.
