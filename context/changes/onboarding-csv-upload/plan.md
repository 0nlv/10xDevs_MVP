---
change_id: onboarding-csv-upload
title: Onboarding + CSV upload with preview
created: 2026-06-02
---

# Onboarding + CSV Upload Implementation Plan

## Overview

Implement a 3-step onboarding wizard that allows first-time users to upload revenue and cost CSV files, see an immediate preview of parsed data, and persist both metadata and parsed rows to PostgreSQL. This is the first vertical slice (S-01) that unblocks the entire MVP flow.

## Current State Analysis

**What exists now:**
- Database schema ready — `uploads`, `clients`, `transactions`, `costs` tables with RLS policies (F-01 complete)
- Auth middleware — user available via `Astro.locals.user`, protected routes auto-redirect
- Form patterns established — native React forms with FormData submission, inline error handling via ServerError component
- UI foundation — Button component, glass-morphism card layout, `cn()` utility for class merging
- No file upload functionality — zero components, endpoints, or CSV parsing

**Key constraints:**
- SSR-first architecture — all pages server-render by default, React used only for interactivity
- Cloudflare Workers limits — 10MB request body max, no long-running processes
- NFR: Preview must load < 2s (user-perceived time from upload to visible preview)
- NFR: Processing time < 30-60s total (upload → parse → database insert)

### Key Discoveries:

- **Multi-step pattern**: Auth pages use separate routes (`/auth/signin`, `/auth/signup`) not client-side wizards — [src/pages/auth/](src/pages/auth/)
- **FormData extraction**: Astro's `request.formData()` supports multipart/form-data with File objects — standard Web API
- **RLS enforcement**: Middleware checks `auth.uid()` on every request, `uploads` table has user_id FK with ON DELETE CASCADE — [supabase/migrations/20260601000000_create_profitleak_schema.sql:11-19](supabase/migrations/20260601000000_create_profitleak_schema.sql#L11-L19)
- **Missing dependencies**: No CSV parser (need papaparse), no validation library (need zod), missing shadcn/ui components (Card, Input, Label, Table)
- **State persistence**: `uploads` table perfect for tracking wizard progress — already has `file_type`, `filename`, `row_count` fields

## Desired End State

### User Experience:

1. Authenticated user lands on `/onboarding` (or auto-redirected after signup)
2. **Step 1** (`/onboarding/step-1`): Sees value prop ("Wgraj dane, żeby zobaczyć gdzie tracisz pieniądze"), clicks "Upload Revenue CSV", selects file, sees preview of first 5 rows with column headers, clicks "Continue"
3. **Step 2** (`/onboarding/step-2`): Upload Cost CSV, same preview pattern, clicks "Continue"
4. **Step 3** (`/onboarding/step-3`): Confirmation screen showing both uploads successful, CTA to "Start Mapping" (S-02) or "View Dashboard"

### Technical State:

- `uploads` table contains 2 rows (revenue + cost) for the user
- `clients` table contains auto-extracted client names from revenue CSV (UNIQUE per user)
- `transactions` table contains parsed revenue rows with `client_id` = null (mapping happens in S-02)
- `costs` table contains parsed cost rows
- All data RLS-protected — user sees only their own uploads

### Verification:

```sql
-- After onboarding, user should have:
SELECT COUNT(*) FROM uploads WHERE user_id = '<user-uuid>'; 
-- Returns: 2 (one revenue, one cost)

SELECT COUNT(*) FROM clients WHERE user_id = '<user-uuid>';
-- Returns: > 0 (auto-extracted from revenue CSV)

SELECT COUNT(*) FROM transactions WHERE user_id = '<user-uuid>' AND upload_id = '<revenue-upload-id>';
-- Returns: row_count from revenue CSV

SELECT COUNT(*) FROM costs WHERE user_id = '<user-uuid>' AND upload_id = '<cost-upload-id>';
-- Returns: row_count from cost CSV
```

## What We're NOT Doing

Explicitly out of scope to prevent scope creep:

1. **Drag-and-drop upload** — file picker button only; drag-drop is nice-to-have for v2
2. **Auto-column detection** — preview shows raw columns; S-02 handles mapping
3. **CSV validation beyond structure** — no schema validation (required columns, data types); user sees preview and can retry
4. **Client-side parsing** — all parsing server-side; no hybrid client/server approach
5. **File storage** — no raw CSV bytes stored; metadata + parsed rows only
6. **Multi-file upload** — one file per step; no batch upload
7. **Edit/delete uploaded file** — user can re-upload (overwrites); no edit UI in this slice
8. **Progress bars for large files** — simple loading spinner; detailed progress is v2
9. **CSV export/download** — upload only; download/export is separate feature
10. **OAuth file picker integrations** — no Google Drive, Dropbox pickers; local file only

## Implementation Approach

**Architecture**: Separate Astro pages for each wizard step, state persisted in `uploads` table, React islands for file input interactivity.

**Flow**:
1. User uploads revenue CSV → POST `/api/upload-revenue` → parse with papaparse → insert uploads + clients + transactions → redirect to `/onboarding/step-2?upload_id={uuid}`
2. User uploads cost CSV → POST `/api/upload-cost` → parse → insert uploads + costs → redirect to `/onboarding/step-3?revenue_id={uuid1}&cost_id={uuid2}`
3. User sees confirmation → clicks "Continue" → redirect to `/dashboard` or S-02 mapping flow

**Validation layers**:
- Client-side: file type (.csv), file size (<10MB) — fast feedback before upload
- Server-side: same checks + structure validation (min 2 columns, 1 data row) — authoritative

**Error handling**: Inline errors with retry — if upload fails, show error message under upload button, let user select different file and retry. Matches existing auth error pattern (ServerError component).

## Phase 1: Foundation & Shared Code

### Overview

Install dependencies, add missing UI components, create shared upload utilities that both revenue and cost upload flows will reuse.

### Changes Required:

#### 1. Install Dependencies

**File**: `package.json`

**Intent**: Add CSV parsing and validation libraries. papaparse for CSV parsing (industry standard, works SSR + client, excellent TypeScript support). zod for validation schemas (aligns with AGENTS.md/CLAUDE.md "validate with zod" guidance).

**Contract**: Run installation commands, verify package.json updated:

```bash
npm install papaparse zod
npm install --save-dev @types/papaparse
```

#### 2. Install shadcn/ui Components

**File**: `src/components/ui/` (new components)

**Intent**: Add Card, Input, Label, Table components for upload forms and preview display. These follow the existing "new-york" variant style.

**Contract**: Run shadcn CLI to add components:

```bash
npx shadcn@latest add card input label table
```

Verify files created:
- `src/components/ui/card.tsx`
- `src/components/ui/input.tsx`
- `src/components/ui/label.tsx`
- `src/components/ui/table.tsx`

#### 3. Create Upload Validation Utilities

**File**: `src/lib/upload-validation.ts`

**Intent**: Centralize file validation logic (size, type, structure) reused across revenue and cost upload endpoints. Returns typed validation results with error messages.

**Contract**: Export validation functions:

```typescript
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const ALLOWED_MIME_TYPES = ["text/csv", "application/vnd.ms-excel"];

export function validateFileSize(file: File): { valid: boolean; error?: string }
export function validateFileType(file: File): { valid: boolean; error?: string }
export async function validateCSVStructure(csvContent: string): Promise<{ valid: boolean; error?: string; headers?: string[]; rowCount?: number }>
```

Validation rules:
- Size: reject if `file.size > MAX_FILE_SIZE`
- Type: accept if `file.type` in ALLOWED_MIME_TYPES OR `file.name.endsWith('.csv')`
- Structure: parse with papaparse, reject if `< 2 columns` or `< 1 data row`

#### 4. Create CSV Parsing Utilities

**File**: `src/lib/csv-parser.ts`

**Intent**: Wrap papaparse with application-specific configuration. Handle encoding edge cases, return typed results with preview data.

**Contract**: Export parsing function:

```typescript
import Papa from 'papaparse';

export interface CSVParseResult {
  headers: string[];
  rows: Record<string, string>[];
  rowCount: number;
  preview: Record<string, string>[]; // First 5 rows
}

export async function parseCSV(csvContent: string): Promise<CSVParseResult>
```

papaparse config:
- `header: true` — first row as headers
- `skipEmptyLines: true` — ignore blank rows
- `trimHeaders: true` — clean column names

#### 5. Create Shared Upload Components

**File**: `src/components/onboarding/FileUploadInput.tsx`

**Intent**: Reusable file input component with validation, loading state, and error display. Used in both step-1 and step-2.

**Contract**: React component with props:

```typescript
interface FileUploadInputProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  maxSize?: number;
  disabled?: boolean;
  error?: string;
}
```

Component features:
- File input with label "Choose CSV file"
- Client-side validation (size + type)
- Displays selected filename
- Shows error message if validation fails
- Disabled state during upload

**File**: `src/components/onboarding/CSVPreviewTable.tsx`

**Intent**: Display first 5 rows of CSV with column headers in a table. Used to show preview after upload.

**Contract**: React component with props:

```typescript
interface CSVPreviewTableProps {
  headers: string[];
  rows: Record<string, string>[];
  caption?: string;
}
```

Uses shadcn/ui Table component, responsive design (horizontal scroll on mobile).

### Success Criteria:

#### Automated Verification:

- Dependencies installed: `npm list papaparse zod` returns versions
- Type checking passes: `npm run typecheck`
- Linting passes: `npm run lint`
- shadcn/ui components exist: `ls src/components/ui/{card,input,label,table}.tsx` returns 4 files
- Utility files created: `ls src/lib/{upload-validation,csv-parser}.ts` returns 2 files
- Component files created: `ls src/components/onboarding/{FileUploadInput,CSVPreviewTable}.tsx` returns 2 files

#### Manual Verification:

- Import utility functions in a test page, verify they compile without errors
- Render FileUploadInput component in isolation, verify file selection and validation work
- Render CSVPreviewTable with mock data, verify table displays correctly

## Phase 2: Step 1 — Value Prop + Revenue Upload

### Overview

Create the first onboarding page with value proposition messaging and revenue CSV upload. This is the entry point that sets user expectations and collects the primary data (revenue transactions).

### Changes Required:

#### 1. Create Onboarding Layout Component

**File**: `src/components/onboarding/OnboardingLayout.astro`

**Intent**: Shared layout for all onboarding steps. Shows step indicator (1/3, 2/3, 3/3), applies glass-morphism card styling from auth pages, includes value prop header.

**Contract**: Astro component with slots:

```astro
---
interface Props {
  step: 1 | 2 | 3;
  title: string;
}
---
<div class="bg-cosmic flex min-h-screen items-center justify-center p-4">
  <!-- Step indicator: "Step {step} of 3" -->
  <!-- Glass-morphism card with max-w-2xl -->
  <!-- Title + slot for content -->
</div>
```

Reuses existing `bg-cosmic` background and glass-morphism classes from auth pages.

#### 2. Create Revenue Upload API Endpoint

**File**: `src/pages/api/upload-revenue.ts`

**Intent**: Handle revenue CSV upload, validate file, parse CSV, insert data into database (uploads table, auto-extract clients, insert transactions), return upload_id for step progression.

**Contract**: POST endpoint with FormData input, JSON response:

```typescript
export const prerender = false;

export const POST: APIRoute = async (context) => {
  // 1. Extract user from context.locals
  // 2. Extract file from formData
  // 3. Validate file (size, type, structure)
  // 4. Parse CSV with csv-parser utility
  // 5. Create Supabase client
  // 6. Insert into uploads table (file_type='revenue', filename, row_count)
  // 7. Extract unique client names, upsert into clients table
  // 8. Bulk insert transactions (user_id, upload_id, amount, transaction_date, raw_data jsonb)
  // 9. Return { success: true, upload_id, preview: { headers, rows } }
};
```

Client extraction logic:
- Parse CSV, find column with "client" or "customer" in name (case-insensitive)
- Extract unique values, filter empty
- `.upsert()` to clients table with `{ user_id, name }` — handles UNIQUE constraint on (user_id, name)

Transaction insert:
- Map CSV rows to `{ user_id, upload_id, client_id: null, amount, transaction_date, raw_data: <full row as jsonb> }`
- `.insert()` bulk array (papaparse output)

Error handling:
- Return 400 with `{ error: "..." }` for validation failures
- Return 500 with `{ error: "Processing failed" }` for database errors
- Log errors server-side but don't expose details to client

#### 3. Create Revenue Upload Form Component

**File**: `src/components/onboarding/RevenueUploadForm.tsx`

**Intent**: React island for file selection, upload submission, preview display. Manages upload state (idle → uploading → preview → error).

**Contract**: Client-side React component (used with `client:load`):

```typescript
export default function RevenueUploadForm() {
  const [state, setState] = useState<'idle' | 'uploading' | 'preview' | 'error'>('idle');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<CSVParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    // POST file to /api/upload-revenue
    // On success: set preview, state = 'preview'
    // On error: set error, state = 'error'
  };

  // Render FileUploadInput + submit button + CSVPreviewTable (if preview)
}
```

Features:
- File selection with FileUploadInput component
- "Upload Revenue CSV" submit button (disabled during upload)
- Loading spinner while uploading
- CSVPreviewTable after successful upload
- "Continue" button (redirects to `/onboarding/step-2?upload_id={id}`) only shown in preview state
- ServerError component for error display with retry option

#### 4. Create Step 1 Page

**File**: `src/pages/onboarding/step-1.astro`

**Intent**: Landing page for onboarding flow. Shows value proposition, embeds RevenueUploadForm React island.

**Contract**: Protected Astro page (middleware redirects if not authenticated):

```astro
---
import OnboardingLayout from '@/components/onboarding/OnboardingLayout.astro';
import RevenueUploadForm from '@/components/onboarding/RevenueUploadForm';

const { user } = Astro.locals;
if (!user) return Astro.redirect('/auth/signin');
---

<OnboardingLayout step={1} title="Upload Your Revenue Data">
  <p class="mb-6 text-white/80">
    Wgraj plik CSV z fakturami sprzedaży, żeby zobaczyć które projekty/klienci 
    są najbardziej rentowne.
  </p>
  <RevenueUploadForm client:load />
</OnboardingLayout>
```

#### 5. Update Middleware for Onboarding Protection

**File**: `src/middleware.ts`

**Intent**: Add `/onboarding/step-2` and `/onboarding/step-3` to PROTECTED_ROUTES array so unauthenticated users are redirected.

**Contract**: Update PROTECTED_ROUTES array:

```typescript
const PROTECTED_ROUTES = [
  "/dashboard", 
  "/onboarding/step-2", 
  "/onboarding/step-3"
];
```

(Step-1 is intentionally NOT protected — first-time users land there after signup)

### Success Criteria:

#### Automated Verification:

- API endpoint exists: `ls src/pages/api/upload-revenue.ts`
- Page exists: `ls src/pages/onboarding/step-1.astro`
- Component files exist: `ls src/components/onboarding/{OnboardingLayout.astro,RevenueUploadForm.tsx}`
- TypeScript compiles: `npm run typecheck`
- Linting passes: `npm run lint`
- Build succeeds: `npm run build`

#### Manual Verification:

- Navigate to `/onboarding/step-1` as authenticated user → page loads with value prop and upload button
- Select a revenue CSV file (<10MB, valid structure) → upload succeeds, preview shows first 5 rows
- Verify database: `uploads` table has 1 row with `file_type='revenue'`, `clients` table has extracted names, `transactions` table has parsed rows
- Click "Continue" button → redirects to `/onboarding/step-2?upload_id={uuid}`
- Try uploading >10MB file → inline error appears, user can retry
- Try uploading non-CSV file → inline error appears

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation before proceeding to Phase 3.

## Phase 3: Step 2 — Cost Upload

### Overview

Create the second onboarding page for cost CSV upload. Nearly identical to step-1 but uploads to costs table instead of transactions, validates that step-1 was completed via upload_id param.

### Changes Required:

#### 1. Create Cost Upload API Endpoint

**File**: `src/pages/api/upload-cost.ts`

**Intent**: Handle cost CSV upload, validate file, parse CSV, insert data into uploads and costs tables, return upload_id.

**Contract**: POST endpoint similar to upload-revenue:

```typescript
export const prerender = false;

export const POST: APIRoute = async (context) => {
  // 1. Extract user from context.locals
  // 2. Extract file from formData
  // 3. Validate file (size, type, structure)
  // 4. Parse CSV with csv-parser utility
  // 5. Create Supabase client
  // 6. Insert into uploads table (file_type='cost', filename, row_count)
  // 7. Bulk insert costs (user_id, upload_id, vendor, category, amount, cost_date, raw_data jsonb)
  // 8. Return { success: true, upload_id, preview: { headers, rows } }
};
```

Cost row mapping:
- Extract vendor (column with "vendor" or "supplier")
- Extract category (column with "category" or "type")
- Extract amount (column with "amount" or "cost" or "price")
- Extract cost_date (column with "date")
- Store full row in `raw_data` jsonb for debugging

No client extraction needed for costs (that's a revenue-only step).

#### 2. Create Cost Upload Form Component

**File**: `src/components/onboarding/CostUploadForm.tsx`

**Intent**: React island for cost file selection, upload, preview. Identical structure to RevenueUploadForm but POSTs to different endpoint.

**Contract**: Client-side React component:

```typescript
export default function CostUploadForm({ revenueUploadId }: { revenueUploadId: string }) {
  // Same state management as RevenueUploadForm
  // POST to /api/upload-cost instead of /api/upload-revenue
  // "Continue" button redirects to /onboarding/step-3?revenue_id={revenueUploadId}&cost_id={costUploadId}
}
```

#### 3. Create Step 2 Page

**File**: `src/pages/onboarding/step-2.astro`

**Intent**: Cost upload page. Validates revenue upload was completed, shows progress (step 2 of 3), embeds CostUploadForm.

**Contract**: Protected Astro page with prerequisite check:

```astro
---
import OnboardingLayout from '@/components/onboarding/OnboardingLayout.astro';
import CostUploadForm from '@/components/onboarding/CostUploadForm';
import { createClient } from '@/lib/supabase';

const { user } = Astro.locals;
if (!user) return Astro.redirect('/auth/signin');

// Validate step-1 completion
const revenueUploadId = Astro.url.searchParams.get('upload_id');
if (!revenueUploadId) {
  return Astro.redirect('/onboarding/step-1');
}

const supabase = createClient(Astro.request.headers, Astro.cookies);
const { data: revenueUpload } = await supabase
  .from('uploads')
  .select('*')
  .eq('id', revenueUploadId)
  .eq('user_id', user.id)
  .eq('file_type', 'revenue')
  .single();

if (!revenueUpload) {
  return Astro.redirect('/onboarding/step-1');
}
---

<OnboardingLayout step={2} title="Upload Your Cost Data">
  <p class="mb-6 text-white/80">
    Teraz wgraj plik CSV z kosztami (wydatki, podwykonawcy, materiały).
  </p>
  <CostUploadForm revenueUploadId={revenueUploadId} client:load />
</OnboardingLayout>
```

Prerequisite validation ensures user can't skip step-1 or fake upload_id param.

### Success Criteria:

#### Automated Verification:

- API endpoint exists: `ls src/pages/api/upload-cost.ts`
- Page exists: `ls src/pages/onboarding/step-2.astro`
- Component exists: `ls src/components/onboarding/CostUploadForm.tsx`
- TypeScript compiles: `npm run typecheck`
- Linting passes: `npm run lint`
- Build succeeds: `npm run build`

#### Manual Verification:

- Try accessing `/onboarding/step-2` without `upload_id` param → redirects to step-1
- Try accessing with invalid `upload_id` → redirects to step-1
- Complete step-1, land on step-2 with valid `upload_id` → page loads with cost upload form
- Upload valid cost CSV → upload succeeds, preview shows first 5 rows
- Verify database: `uploads` table has 2 rows (revenue + cost), `costs` table has parsed rows
- Click "Continue" → redirects to step-3 with both upload IDs in params

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation before proceeding to Phase 4.

## Phase 4: Step 3 — Confirmation & Completion

### Overview

Create the final onboarding page showing both uploads were successful, display summary statistics, provide CTA to continue to mapping flow (S-02) or dashboard.

### Changes Required:

#### 1. Create Upload Summary Component

**File**: `src/components/onboarding/UploadSummary.tsx`

**Intent**: Display summary cards for both revenue and cost uploads showing filename, row count, upload timestamp.

**Contract**: React component with props:

```typescript
interface UploadSummaryProps {
  revenueUpload: {
    filename: string;
    row_count: number;
    uploaded_at: string;
  };
  costUpload: {
    filename: string;
    row_count: number;
    uploaded_at: string;
  };
}
```

Uses shadcn/ui Card component, displays:
- ✓ Revenue data: {filename} ({row_count} rows)
- ✓ Cost data: {filename} ({row_count} rows)

#### 2. Create Step 3 Page

**File**: `src/pages/onboarding/step-3.astro`

**Intent**: Confirmation page showing both uploads successful, CTA buttons to next actions.

**Contract**: Protected page fetching both uploads from database:

```astro
---
import OnboardingLayout from '@/components/onboarding/OnboardingLayout.astro';
import UploadSummary from '@/components/onboarding/UploadSummary';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase';

const { user } = Astro.locals;
if (!user) return Astro.redirect('/auth/signin');

// Validate both uploads exist
const revenueId = Astro.url.searchParams.get('revenue_id');
const costId = Astro.url.searchParams.get('cost_id');

if (!revenueId || !costId) {
  return Astro.redirect('/onboarding/step-1');
}

const supabase = createClient(Astro.request.headers, Astro.cookies);

const [{ data: revenueUpload }, { data: costUpload }] = await Promise.all([
  supabase.from('uploads').select('*').eq('id', revenueId).eq('user_id', user.id).single(),
  supabase.from('uploads').select('*').eq('id', costId).eq('user_id', user.id).single(),
]);

if (!revenueUpload || !costUpload) {
  return Astro.redirect('/onboarding/step-1');
}
---

<OnboardingLayout step={3} title="Data Upload Complete!">
  <p class="mb-6 text-white/80">
    Twoje dane zostały pomyślnie wgrane. Teraz możesz zmapować kolumny i przypisać koszty.
  </p>
  
  <UploadSummary 
    revenueUpload={revenueUpload} 
    costUpload={costUpload} 
    client:load 
  />

  <div class="mt-8 flex gap-4">
    <Button asChild>
      <a href="/dashboard">Go to Dashboard</a>
    </Button>
    <!-- When S-02 is ready: -->
    <!-- <Button variant="outline" asChild>
      <a href="/mapping">Start Mapping</a>
    </Button> -->
  </div>
</OnboardingLayout>
```

For MVP, "Go to Dashboard" is the primary CTA. "Start Mapping" link will be added when S-02 (column-mapping) is implemented.

#### 3. Add Onboarding Entry Point

**File**: `src/pages/onboarding/index.astro`

**Intent**: Redirect `/onboarding` → `/onboarding/step-1` for clean URLs.

**Contract**: Redirect page:

```astro
---
return Astro.redirect('/onboarding/step-1');
---
```

#### 4. Update Signup Flow

**File**: `src/pages/api/auth/signup.ts`

**Intent**: After successful signup, redirect to `/onboarding/step-1` instead of `/dashboard` to guide new users through onboarding.

**Contract**: Change redirect destination in signup endpoint:

```typescript
// Before:
return context.redirect('/dashboard');

// After:
return context.redirect('/onboarding/step-1');
```

This ensures first-time users go through onboarding flow automatically.

### Success Criteria:

#### Automated Verification:

- Page files exist: `ls src/pages/onboarding/{step-3,index}.astro`
- Component exists: `ls src/components/onboarding/UploadSummary.tsx`
- TypeScript compiles: `npm run typecheck`
- Linting passes: `npm run lint`
- Build succeeds: `npm run build`

#### Manual Verification:

- Complete steps 1-2, land on step-3 → page shows both upload summaries with correct filenames and row counts
- Try accessing step-3 with invalid/missing IDs → redirects to step-1
- Click "Go to Dashboard" → navigates to dashboard successfully
- Sign up with new account → automatically redirects to `/onboarding/step-1`
- Complete full onboarding flow → verify database state:
  - 2 uploads rows (revenue + cost)
  - N clients rows (auto-extracted)
  - M transactions rows
  - K costs rows
  - All rows have correct `user_id` (RLS enforced)

**Implementation Note**: This completes the S-01 implementation. The onboarding flow is ready for user testing.

## Testing Strategy

### Unit Tests:

**Utilities** (`src/lib/upload-validation.ts`, `src/lib/csv-parser.ts`):
- Test file size validation with files at/above/below 10MB limit
- Test file type validation with .csv, .txt, .xlsx extensions and MIME types
- Test CSV structure validation with valid CSV, empty CSV, single-column CSV, header-only CSV
- Test CSV parsing with various formats (quoted fields, commas in data, empty cells)
- Test client extraction logic with different column name variations

**API Endpoints** (`src/pages/api/upload-revenue.ts`, `upload-cost.ts`):
- Mock FormData with valid file → expect 200 response with upload_id
- Mock FormData with >10MB file → expect 400 error
- Mock FormData with non-CSV → expect 400 error
- Mock FormData with malformed CSV → expect 400 error
- Mock database insert failure → expect 500 error
- Verify RLS: user can't upload with different user_id in JWT

### Integration Tests:

**Full Onboarding Flow**:
1. Sign up new user → lands on `/onboarding/step-1`
2. Upload revenue CSV → verify uploads + clients + transactions in database
3. Navigate to step-2 → verify prerequisite check works
4. Upload cost CSV → verify uploads + costs in database
5. Navigate to step-3 → verify both uploads shown correctly
6. Verify isolation: create second user, upload different CSV, verify first user can't see second user's data

**Error Recovery**:
- Upload fails due to network → user sees error, can retry
- User navigates away mid-upload → state not corrupted (no partial data)
- User manually changes upload_id in URL → redirected to step-1

### Manual Testing Steps:

1. **Happy path** — complete full onboarding with valid CSVs, verify dashboard shows data
2. **Edge cases**:
   - Very small CSV (2 rows total) → verify preview shows 1 data row
   - Very large CSV (9.9MB, ~50k rows) → verify upload completes < 30s
   - CSV with special characters in column names → verify parsing handles them
   - CSV with quotes, commas in data fields → verify parsing doesn't break
3. **Error scenarios**:
   - Upload 11MB file → error message shown, retry works
   - Upload .xlsx → error message shown
   - Upload empty .csv → error message shown
   - Try accessing step-2 without completing step-1 → redirected
4. **RLS verification**:
   - User A uploads CSV → User B can't see it in database queries
   - User A completes onboarding → User B's dashboard doesn't show User A's data

## Performance Considerations

**Upload time**: 10MB file over slow connection (~500 Kbps) takes ~20s to upload. Add 2-5s for parsing + database insert. Total: ~25-30s — within 30-60s NFR.

**Preview rendering**: First 5 rows render instantly (<100ms). Table component handles responsive layout for mobile (horizontal scroll).

**Database bulk inserts**: Supabase client handles arrays up to ~1000 rows efficiently. For 10k+ row CSVs, consider batching inserts in chunks of 1000:

```typescript
for (let i = 0; i < rows.length; i += 1000) {
  const batch = rows.slice(i, i + 1000);
  await supabase.from('transactions').insert(batch);
}
```

**Memory usage**: Parsing 10MB CSV in memory (papaparse) uses ~30-50MB peak. Cloudflare Workers have 128MB memory limit — safe margin.

**Client name extraction**: Unique client names typically << 1000 for small business. Single `.upsert()` call handles it efficiently with UNIQUE constraint handling.

## References

- Related planning: `context/foundation/roadmap.md` (S-01)
- PRD requirements: `context/foundation/prd.md` (US-03, US-04, FR-003 through FR-006)
- Database schema: `supabase/migrations/20260601000000_create_profitleak_schema.sql`
- Auth pattern: `src/pages/auth/signin.astro`, `src/pages/api/auth/signin.ts`
- Middleware protection: `src/middleware.ts:4` (PROTECTED_ROUTES)

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Foundation & Shared Code

#### Automated

- [x] 1.1 Dependencies installed (papaparse, zod, @types/papaparse)
- [x] 1.2 shadcn/ui components added (card, input, label, table)
- [x] 1.3 Upload validation utilities created (src/lib/upload-validation.ts)
- [x] 1.4 CSV parsing utilities created (src/lib/csv-parser.ts)
- [x] 1.5 FileUploadInput component created (src/components/onboarding/FileUploadInput.tsx)
- [x] 1.6 CSVPreviewTable component created (src/components/onboarding/CSVPreviewTable.tsx)
- [x] 1.7 TypeScript compiles (npm run typecheck)
- [x] 1.8 Linting passes (npm run lint)

#### Manual

- [ ] 1.9 FileUploadInput component tested in isolation
- [ ] 1.10 CSVPreviewTable component tested with mock data

### Phase 2: Step 1 — Value Prop + Revenue Upload

#### Automated

- [ ] 2.1 OnboardingLayout component created (src/components/onboarding/OnboardingLayout.astro)
- [ ] 2.2 Revenue upload API endpoint created (src/pages/api/upload-revenue.ts)
- [ ] 2.3 RevenueUploadForm component created (src/components/onboarding/RevenueUploadForm.tsx)
- [ ] 2.4 Step-1 page created (src/pages/onboarding/step-1.astro)
- [ ] 2.5 Middleware updated with onboarding route protection (src/middleware.ts)
- [ ] 2.6 TypeScript compiles (npm run typecheck)
- [ ] 2.7 Linting passes (npm run lint)
- [ ] 2.8 Build succeeds (npm run build)

#### Manual

- [ ] 2.9 Step-1 page loads with value prop and upload form
- [ ] 2.10 Revenue CSV upload succeeds, preview displays correctly
- [ ] 2.11 Database verified: uploads + clients + transactions tables populated
- [ ] 2.12 Continue button redirects to step-2 with upload_id
- [ ] 2.13 File size validation error tested (>10MB file)
- [ ] 2.14 File type validation error tested (non-CSV file)

### Phase 3: Step 2 — Cost Upload

#### Automated

- [ ] 3.1 Cost upload API endpoint created (src/pages/api/upload-cost.ts)
- [ ] 3.2 CostUploadForm component created (src/components/onboarding/CostUploadForm.tsx)
- [ ] 3.3 Step-2 page created with prerequisite validation (src/pages/onboarding/step-2.astro)
- [ ] 3.4 TypeScript compiles (npm run typecheck)
- [ ] 3.5 Linting passes (npm run lint)
- [ ] 3.6 Build succeeds (npm run build)

#### Manual

- [ ] 3.7 Step-2 prerequisite check tested (redirect without upload_id)
- [ ] 3.8 Cost CSV upload succeeds, preview displays correctly
- [ ] 3.9 Database verified: costs table populated with correct upload_id
- [ ] 3.10 Continue button redirects to step-3 with both upload IDs

### Phase 4: Step 3 — Confirmation & Completion

#### Automated

- [ ] 4.1 UploadSummary component created (src/components/onboarding/UploadSummary.tsx)
- [ ] 4.2 Step-3 page created with upload fetching (src/pages/onboarding/step-3.astro)
- [ ] 4.3 Onboarding index redirect created (src/pages/onboarding/index.astro)
- [ ] 4.4 Signup flow updated to redirect to onboarding (src/pages/api/auth/signup.ts)
- [ ] 4.5 TypeScript compiles (npm run typecheck)
- [ ] 4.6 Linting passes (npm run lint)
- [ ] 4.7 Build succeeds (npm run build)

#### Manual

- [ ] 4.8 Step-3 displays both upload summaries correctly
- [ ] 4.9 Dashboard button navigation tested
- [ ] 4.10 New signup redirects to onboarding flow
- [ ] 4.11 Full onboarding flow completed end-to-end
- [ ] 4.12 Database state verified: all tables populated with RLS-protected data
