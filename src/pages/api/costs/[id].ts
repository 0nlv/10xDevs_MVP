/**
 * PATCH /api/costs/[id]
 * 
 * Updates a cost's editable fields (vendor, category, amount, date).
 * RLS policies ensure users can only update their own costs.
 */

import type { APIRoute } from 'astro';
import { createClient } from '@/lib/supabase';

export const prerender = false;

interface UpdateCostBody {
  vendor?: string;
  category?: string;
  amount?: number;
  cost_date?: string;
}

export const PATCH: APIRoute = async (context) => {
  try {
    // 1. Extract user from context.locals
    const user = context.locals.user;
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. Extract cost ID from params
    const costId = context.params.id;
    if (!costId) {
      return new Response(
        JSON.stringify({ error: 'Cost ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 3. Parse request body
    const body: UpdateCostBody = await context.request.json();

    // 4. Validate at least one field is provided
    if (!body.vendor && !body.category && !body.amount && !body.cost_date) {
      return new Response(
        JSON.stringify({ error: 'At least one field (vendor, category, amount, cost_date) must be provided' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 5. Validate field types
    if (body.amount !== undefined) {
      const amount = Number(body.amount);
      if (isNaN(amount) || amount < 0) {
        return new Response(
          JSON.stringify({ error: 'Amount must be a positive number' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      body.amount = amount;
    }

    if (body.cost_date !== undefined) {
      // Basic date format validation (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(body.cost_date)) {
        return new Response(
          JSON.stringify({ error: 'Date must be in YYYY-MM-DD format' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    if (body.vendor !== undefined && body.vendor.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Vendor cannot be empty' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (body.category !== undefined && body.category.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Category cannot be empty' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 6. Create Supabase client
    const supabase = createClient(context.request.headers, context.cookies);
    if (!supabase) {
      return new Response(
        JSON.stringify({ error: 'Database connection failed' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 7. Update cost (RLS ensures user owns it)
    const { data: cost, error: updateError } = await supabase
      .from('costs')
      .update(body)
      .eq('id', costId)
      .select()
      .single();

    if (updateError || !cost) {
      // RLS will cause error if cost doesn't belong to user
      console.error('Cost update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Cost not found or access denied' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 8. Return updated cost
    return new Response(
      JSON.stringify({
        success: true,
        cost,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Cost update error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
