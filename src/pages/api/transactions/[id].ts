/**
 * PATCH /api/transactions/[id]
 * 
 * Updates a transaction's editable fields (amount, date, client_id).
 * RLS policies ensure users can only update their own transactions.
 */

import type { APIRoute } from 'astro';
import { createClient } from '@/lib/supabase';

export const prerender = false;

interface UpdateTransactionBody {
  amount?: number;
  transaction_date?: string;
  client_id?: string;
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

    // 2. Extract transaction ID from params
    const transactionId = context.params.id;
    if (!transactionId) {
      return new Response(
        JSON.stringify({ error: 'Transaction ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 3. Parse request body
    const body: UpdateTransactionBody = await context.request.json();

    // 4. Validate at least one field is provided
    if (!body.amount && !body.transaction_date && !body.client_id) {
      return new Response(
        JSON.stringify({ error: 'At least one field (amount, transaction_date, client_id) must be provided' }),
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

    if (body.transaction_date !== undefined) {
      // Basic date format validation (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(body.transaction_date)) {
        return new Response(
          JSON.stringify({ error: 'Date must be in YYYY-MM-DD format' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // 6. Create Supabase client
    const supabase = createClient(context.request.headers, context.cookies);
    if (!supabase) {
      return new Response(
        JSON.stringify({ error: 'Database connection failed' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 7. If client_id is provided, verify it belongs to user
    if (body.client_id) {
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('id')
        .eq('id', body.client_id)
        .single();

      if (clientError || !client) {
        return new Response(
          JSON.stringify({ error: 'Client not found or access denied' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // 8. Update transaction (RLS ensures user owns it)
    const { data: transaction, error: updateError } = await supabase
      .from('transactions')
      .update(body)
      .eq('id', transactionId)
      .select()
      .single();

    if (updateError || !transaction) {
      // RLS will cause error if transaction doesn't belong to user
      console.error('Transaction update error:', updateError);
      return new Response(
        JSON.stringify({ error: 'Transaction not found or access denied' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 9. Return updated transaction
    return new Response(
      JSON.stringify({
        success: true,
        transaction,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Transaction update error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
