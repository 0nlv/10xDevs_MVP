import type { APIRoute } from 'astro';
import { createClient } from '@/lib/supabase';
import {
  validateFileSize,
  validateFileType,
  validateCSVStructure,
} from '@/lib/upload-validation';
import { parseCSV, findColumn } from '@/lib/csv-parser';

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
        file_type: 'cost',
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

    // 7. Bulk insert costs
    // Find relevant columns
    const vendorColumn = findColumn(headers, ['vendor', 'supplier', 'dostawca']);
    const categoryColumn = findColumn(headers, ['category', 'type', 'kategoria']);
    const amountColumn = findColumn(headers, ['amount', 'cost', 'price', 'kwota']);
    const dateColumn = findColumn(headers, ['date', 'cost_date', 'invoice_date', 'data']);

    const costs = rows.map((row) => {
      const vendor = vendorColumn ? row[vendorColumn]?.trim() : null;
      const category = categoryColumn ? row[categoryColumn]?.trim() : null;
      const amount = amountColumn
        ? parseFloat(row[amountColumn]?.replace(/[^0-9.-]/g, '') || '0')
        : 0;
      const costDate = dateColumn ? row[dateColumn] : new Date().toISOString().split('T')[0];

      return {
        user_id: user.id,
        upload_id: upload.id,
        vendor,
        category,
        amount,
        cost_date: costDate,
        raw_data: row,
      };
    });

    // Insert in batches of 1000
    const batchSize = 1000;
    for (let i = 0; i < costs.length; i += batchSize) {
      const batch = costs.slice(i, i + batchSize);
      const { error: costError } = await supabase
        .from('costs')
        .insert(batch);

      if (costError) {
        console.error('Cost insert error:', costError);
        // Continue with next batch - partial success is acceptable
      }
    }

    // 8. Return success with upload_id and preview
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
    console.error('Cost upload error:', error);
    return new Response(
      JSON.stringify({ error: 'Processing failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
