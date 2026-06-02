import type { APIRoute } from 'astro';
import { createClient } from '@/lib/supabase';
import {
  validateFileSize,
  validateFileType,
  validateCSVStructure,
} from '@/lib/upload-validation';
import { parseCSV, extractClientNames, findColumn } from '@/lib/csv-parser';

export const prerender = false;

export const POST: APIRoute = async (context) => {
  try {
    // 1. Extract user from context.locals
    const user = context.locals.user;
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. Extract file from formData
    const formData = await context.request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return new Response(
        JSON.stringify({ error: 'No file provided' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 3. Validate file (size, type)
    const sizeValidation = validateFileSize(file);
    if (!sizeValidation.valid) {
      return new Response(
        JSON.stringify({ error: sizeValidation.error }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const typeValidation = validateFileType(file);
    if (!typeValidation.valid) {
      return new Response(
        JSON.stringify({ error: typeValidation.error }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Read file content
    const csvContent = await file.text();

    // Validate structure
    const structureValidation = await validateCSVStructure(csvContent);
    if (!structureValidation.valid) {
      return new Response(
        JSON.stringify({ error: structureValidation.error }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 4. Parse CSV
    const parsedData = await parseCSV(csvContent);
    const { headers, rows, rowCount, preview } = parsedData;

    // 5. Create Supabase client
    const supabase = createClient(context.request.headers, context.cookies);
    if (!supabase) {
      return new Response(
        JSON.stringify({ error: 'Database connection failed' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 6. Insert into uploads table
    const { data: upload, error: uploadError } = await supabase
      .from('uploads')
      .insert({
        user_id: user.id,
        file_type: 'revenue',
        filename: file.name,
        row_count: rowCount,
      })
      .select()
      .single();

    if (uploadError || !upload) {
      console.error('Upload insert error:', uploadError);
      return new Response(
        JSON.stringify({ error: 'Failed to save upload metadata' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 7. Extract unique client names and upsert into clients table
    const clientNames = extractClientNames(rows, headers);
    const clientIds: Record<string, string> = {};

    for (const clientName of clientNames) {
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .upsert(
          { user_id: user.id, name: clientName },
          { onConflict: 'user_id,name' }
        )
        .select()
        .single();

      if (!clientError && client) {
        clientIds[clientName] = client.id;
      }
    }

    // 8. Bulk insert transactions
    // Find relevant columns
    const clientColumn = findColumn(headers, ['client', 'customer']);
    const amountColumn = findColumn(headers, ['amount', 'total', 'revenue', 'price']);
    const dateColumn = findColumn(headers, ['date', 'transaction_date', 'invoice_date']);

    const transactions = rows.map((row) => {
      const clientName = clientColumn ? row[clientColumn]?.trim() : null;
      const amount = amountColumn
        ? parseFloat(row[amountColumn]?.replace(/[^0-9.-]/g, '') || '0')
        : 0;
      const transactionDate = dateColumn ? row[dateColumn] : new Date().toISOString().split('T')[0];

      return {
        user_id: user.id,
        upload_id: upload.id,
        client_id: clientName && clientIds[clientName] ? clientIds[clientName] : null,
        amount,
        transaction_date: transactionDate,
        raw_data: row,
      };
    });

    // Insert in batches of 1000
    const batchSize = 1000;
    for (let i = 0; i < transactions.length; i += batchSize) {
      const batch = transactions.slice(i, i + batchSize);
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert(batch);

      if (transactionError) {
        console.error('Transaction insert error:', transactionError);
        // Continue with next batch - partial success is acceptable
      }
    }

    // 9. Return success with upload_id and preview
    return new Response(
      JSON.stringify({
        success: true,
        upload_id: upload.id,
        preview: {
          headers,
          rows: preview,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Revenue upload error:', error);
    return new Response(
      JSON.stringify({ error: 'Processing failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
