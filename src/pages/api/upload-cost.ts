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

    // 7. Find relevant columns
    const vendorColumn = findColumn(headers, ['vendor', 'supplier', 'dostawca']);
    const categoryColumn = findColumn(headers, ['category', 'type', 'kategoria']);
    const amountColumn = findColumn(headers, ['amount', 'cost', 'price', 'kwota']);
    const dateColumn = findColumn(headers, ['date', 'cost_date', 'invoice_date', 'data']);
    const clientColumn = findColumn(headers, ['client', 'customer', 'klient']);

    const costs = rows.map((row) => {
      const vendor = vendorColumn ? row[vendorColumn]?.trim() : null;
      const category = categoryColumn ? row[categoryColumn]?.trim() : null;
      const amount = amountColumn
        ? parseFloat(row[amountColumn]?.replace(/[^0-9.-]/g, '') || '0')
        : 0;
      const costDate = dateColumn ? row[dateColumn] : new Date().toISOString().split('T')[0];
      const clientName = clientColumn ? row[clientColumn]?.trim() : null;

      return {
        user_id: user.id,
        upload_id: upload.id,
        vendor,
        category,
        amount,
        cost_date: costDate,
        raw_data: { ...row, _clientName: clientName }, // Store client name for later matching
      };
    });

    // Insert in batches of 1000
    const batchSize = 1000;
    let costsInserted = 0;
    let costsError: string | null = null;

    console.log('DEBUG: Processing costs', { costs_length: costs.length, first_cost: costs[0] });

    for (let i = 0; i < costs.length; i += batchSize) {
      const batch = costs.slice(i, i + batchSize);
      console.log('DEBUG: Batch insert', { batch_size: batch.length, batch_index: i });
      
      const { error: costError } = await supabase
        .from('costs')
        .insert(batch);

      console.log('DEBUG: Batch result', { costError });

      if (costError) {
        console.error('Cost insert error:', costError);
        costsError = costError.message;
      } else {
        costsInserted += batch.length;
      }
    }

    // 8. Create cost_assignments to map costs to clients
    if (costsInserted > 0) {
      console.log('DEBUG: Creating cost assignments');
      
      // Get all newly inserted costs with client names
      const { data: insertedCosts, error: fetchError } = await supabase
        .from('costs')
        .select('id, raw_data')
        .eq('upload_id', upload.id);

      if (fetchError || !insertedCosts) {
        console.error('Failed to fetch inserted costs:', fetchError);
      } else {
        // Extract client names and find matching clients
        const clientNames = new Set(
          insertedCosts
            .map((c: any) => c.raw_data?._clientName)
            .filter(Boolean)
        );

        // Get all clients for this user
        const { data: allClients, error: clientError } = await supabase
          .from('clients')
          .select('id, name')
          .eq('user_id', user.id);

        if (clientError || !allClients) {
          console.error('Failed to fetch clients:', clientError);
        } else {
          // Create client name → id map
          const clientMap: Record<string, string> = {};
          allClients.forEach((c: any) => {
            clientMap[c.name.toLowerCase()] = c.id;
          });

          // Create cost_assignments for each cost
          const assignments = insertedCosts
            .map((c: any) => {
              const clientName = c.raw_data?._clientName;
              if (!clientName) return null;

              const clientId = clientMap[clientName.toLowerCase()];
              if (!clientId) return null;

              return {
                user_id: user.id,
                cost_id: c.id,
                client_id: clientId,
                allocation_type: 'direct',
                allocation_percentage: 100,
              };
            })
            .filter(Boolean);

          if (assignments.length > 0) {
            console.log('DEBUG: Inserting assignments', { count: assignments.length });
            const { error: assignError } = await supabase
              .from('cost_assignments')
              .insert(assignments);

            if (assignError) {
              console.error('Assignment insert error:', assignError);
            } else {
              console.log('DEBUG: Assignments created successfully');
            }
          }
        }
      }

      // Recalculate margins using SQL
      console.log('DEBUG: Recalculating margins');
      const { error: sqlError } = await supabase.rpc('recalculate_user_margins', {
        p_user_id: user.id,
      });
      if (sqlError) console.error('Margin calculation error:', sqlError);
    }

    // 9. Return success with upload_id and preview
    return new Response(
      JSON.stringify({
        success: true,
        upload_id: upload.id,
        costs_count: costs.length,
        costs_inserted: costsInserted,
        costs_error: costsError,
        costs_array_sample: costs.slice(0, 1),
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
