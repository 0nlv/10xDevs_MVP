/**
 * GET /api/dashboard
 * 
 * Returns dashboard data: alerts, margins, top/bottom clients, global margin
 * RLS policies ensure users can only see their own data
 */

import type { APIRoute } from 'astro';
import { createClient } from '@/lib/supabase';

export const prerender = false;

interface DashboardData {
  alerts: Array<{
    id: string;
    client_id: string;
    client_name?: string;
    alert_type: 'unprofitable_client' | 'margin_drop' | 'cost_growth';
    severity: 'low' | 'medium' | 'high';
    message: string;
    threshold_value: number | null;
    created_at: string;
  }>;
  topClients: Array<{
    id: string;
    name: string;
    revenue: number;
    costs: number;
    margin_amount: number;
    margin_percentage: number;
  }>;
  bottomClients: Array<{
    id: string;
    name: string;
    revenue: number;
    costs: number;
    margin_amount: number;
    margin_percentage: number;
  }>;
  globalMetrics: {
    total_revenue: number;
    total_costs: number;
    total_margin: number;
    global_margin_percentage: number;
    total_clients: number;
  };
}

export const GET: APIRoute = async (context) => {
  try {
    // 1. Extract user from context.locals
    const user = context.locals.user;
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2. Create Supabase client
    const supabase = createClient(context.request.headers, context.cookies);
    if (!supabase) {
      return new Response(
        JSON.stringify({ error: 'Database connection failed' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 3. Fetch alerts
    const { data: alerts, error: alertsError } = await supabase
      .from('alerts')
      .select(`
        id,
        client_id,
        alert_type,
        severity,
        message,
        threshold_value,
        created_at,
        clients (
          name
        )
      `)
      .order('created_at', { ascending: false });

    if (alertsError) {
      console.error('Alerts fetch error:', alertsError);
    }

    // 4. Fetch top clients (highest margin %)
    const { data: topClients, error: topError } = await supabase
      .from('margins')
      .select('id, client_id, revenue, costs, margin_amount, margin_percentage, clients (name)')
      .gt('revenue', 0) // Only clients with revenue
      .order('margin_percentage', { ascending: false })
      .limit(5);

    if (topError) {
      console.error('Top clients fetch error:', topError);
    }

    // 5. Fetch bottom clients (lowest margin %)
    const { data: bottomClients, error: bottomError } = await supabase
      .from('margins')
      .select('id, client_id, revenue, costs, margin_amount, margin_percentage, clients (name)')
      .gt('revenue', 0) // Only clients with revenue
      .order('margin_percentage', { ascending: true })
      .limit(5);

    if (bottomError) {
      console.error('Bottom clients fetch error:', bottomError);
    }

    // 6. Calculate global metrics
    const { data: marginsSummary, error: summaryError } = await supabase
      .from('margins')
      .select('revenue, costs, margin_amount, margin_percentage');

    if (summaryError) {
      console.error('Summary fetch error:', summaryError);
    }

    // Calculate aggregates
    const globalMetrics = {
      total_revenue: marginsSummary?.reduce((sum, m) => sum + (m.revenue || 0), 0) || 0,
      total_costs: marginsSummary?.reduce((sum, m) => sum + (m.costs || 0), 0) || 0,
      total_margin: marginsSummary?.reduce((sum, m) => sum + (m.margin_amount || 0), 0) || 0,
      global_margin_percentage: 0,
      total_clients: marginsSummary?.length || 0,
    };

    // Calculate global margin %
    if (globalMetrics.total_revenue > 0) {
      globalMetrics.global_margin_percentage = 
        (globalMetrics.total_margin / globalMetrics.total_revenue) * 100;
    }

    // 7. Transform data for frontend
    const transformedAlerts = (alerts || []).map((a) => ({
      id: a.id,
      client_id: a.client_id,
      client_name: a.clients?.name,
      alert_type: a.alert_type,
      severity: a.severity,
      message: a.message,
      threshold_value: a.threshold_value,
      created_at: a.created_at,
    }));

    const transformedTopClients = (topClients || []).map((m) => ({
      id: m.id,
      name: m.clients?.name || 'Unknown Client',
      revenue: m.revenue,
      costs: m.costs,
      margin_amount: m.margin_amount,
      margin_percentage: m.margin_percentage,
    }));

    const transformedBottomClients = (bottomClients || []).map((m) => ({
      id: m.id,
      name: m.clients?.name || 'Unknown Client',
      revenue: m.revenue,
      costs: m.costs,
      margin_amount: m.margin_amount,
      margin_percentage: m.margin_percentage,
    }));

    const response: DashboardData = {
      alerts: transformedAlerts,
      topClients: transformedTopClients,
      bottomClients: transformedBottomClients,
      globalMetrics,
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
