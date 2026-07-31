/**
 * DELETE /api/uploads/[id]
 * 
 * Deletes an upload and all associated data (transactions/costs via CASCADE).
 * RLS policies ensure users can only delete their own uploads.
 */

import type { APIRoute } from 'astro';
import { createClient } from '@/lib/supabase';

export const prerender = false;

export const DELETE: APIRoute = async (context) => {
  try {
    // 1. Extract user from context.locals
    const user = context.locals.user;
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. Extract upload ID from params
    const uploadId = context.params.id;
    if (!uploadId) {
      return new Response(
        JSON.stringify({ error: 'Upload ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 3. Create Supabase client
    const supabase = createClient(context.request.headers, context.cookies);
    if (!supabase) {
      return new Response(
        JSON.stringify({ error: 'Database connection failed' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 4. Check if upload exists and belongs to user (before counting related records)
    const { data: upload, error: fetchError } = await supabase
      .from('uploads')
      .select('id, file_type, filename')
      .eq('id', uploadId)
      .single();

    if (fetchError || !upload) {
      // RLS will return null if upload doesn't belong to user
      return new Response(
        JSON.stringify({ error: 'Upload not found or access denied' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 5. Count related records for confirmation message
    let deletedCount = 0;
    if (upload.file_type === 'revenue') {
      const { count } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('upload_id', uploadId);
      deletedCount = count || 0;
    } else if (upload.file_type === 'cost') {
      const { count } = await supabase
        .from('costs')
        .select('*', { count: 'exact', head: true })
        .eq('upload_id', uploadId);
      deletedCount = count || 0;
    }

    // 6. Delete upload (CASCADE will delete related transactions/costs)
    const { error: deleteError } = await supabase
      .from('uploads')
      .delete()
      .eq('id', uploadId);

    if (deleteError) {
      console.error('Upload delete error:', deleteError);
      return new Response(
        JSON.stringify({ error: 'Failed to delete upload' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 7. Return success with details
    return new Response(
      JSON.stringify({
        success: true,
        message: `Upload "${upload.filename}" deleted`,
        details: {
          file_type: upload.file_type,
          deleted_records: deletedCount,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Upload delete error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
