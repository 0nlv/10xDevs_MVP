/**
 * AlertsDashboard.tsx
 * 
 * Displays dashboard with:
 * - Global margin metrics
 * - Alert list (unprofitable clients)
 * - Top 5 profitable clients
 * - Bottom 5 unprofitable clients
 * - "Aha moment" messaging
 */

import React, { useEffect, useState } from 'react';

interface Alert {
  id: string;
  client_id: string;
  client_name?: string;
  alert_type: 'unprofitable_client' | 'margin_drop' | 'cost_growth';
  severity: 'low' | 'medium' | 'high';
  message: string;
  threshold_value: number | null;
  created_at: string;
}

interface ClientMargin {
  id: string;
  name: string;
  revenue: number;
  costs: number;
  margin_amount: number;
  margin_percentage: number;
}

interface GlobalMetrics {
  total_revenue: number;
  total_costs: number;
  total_margin: number;
  global_margin_percentage: number;
  total_clients: number;
}

interface DashboardData {
  alerts: Alert[];
  topClients: ClientMargin[];
  bottomClients: ClientMargin[];
  globalMetrics: GlobalMetrics;
}

export default function AlertsDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/dashboard');
        
        if (!response.ok) {
          throw new Error(`Dashboard API error: ${response.status}`);
        }
        
        const dashboardData = await response.json();
        setData(dashboardData);
        setError(null);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to load dashboard';
        setError(errorMsg);
        console.error('Dashboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="mb-4 inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          <p className="text-blue-100">Wczytywanie dashboarda...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-200">
        <p className="font-semibold">Błąd ładowania dashboarda</p>
        <p className="text-sm">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-6 text-center text-blue-100">
        <p>Brak danych do wyświetlenia. Wgraj dane aby zobaczyć analizę rentowności.</p>
      </div>
    );
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'bg-red-500/20 border-red-500/50 text-red-200';
      case 'medium':
        return 'bg-yellow-500/20 border-yellow-500/50 text-yellow-200';
      case 'low':
        return 'bg-blue-500/20 border-blue-500/50 text-blue-200';
      default:
        return 'bg-white/10 border-white/30 text-white/80';
    }
  };

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'high':
        return '🔴 KRYTYCZNE';
      case 'medium':
        return '🟡 OSTRZEŻENIE';
      case 'low':
        return '🔵 INFORMACJA';
      default:
        return severity;
    }
  };

  const getAlertTypeLabel = (type: string) => {
    switch (type) {
      case 'unprofitable_client':
        return 'Klient poniżej progu';
      case 'margin_drop':
        return 'Spadek marży';
      case 'cost_growth':
        return 'Wzrost kosztów';
      default:
        return type;
    }
  };

  return (
    <div className="space-y-6">
      {/* Global Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-lg border border-white/20 bg-white/10 p-4 backdrop-blur">
          <p className="text-sm text-blue-100/70 mb-1">Przychody</p>
          <p className="text-2xl font-bold text-white">
            {(data.globalMetrics.total_revenue).toLocaleString('pl-PL', {
              style: 'currency',
              currency: 'PLN',
              maximumFractionDigits: 0,
            })}
          </p>
        </div>

        <div className="rounded-lg border border-white/20 bg-white/10 p-4 backdrop-blur">
          <p className="text-sm text-blue-100/70 mb-1">Koszty</p>
          <p className="text-2xl font-bold text-white">
            {(data.globalMetrics.total_costs).toLocaleString('pl-PL', {
              style: 'currency',
              currency: 'PLN',
              maximumFractionDigits: 0,
            })}
          </p>
        </div>

        <div className="rounded-lg border border-white/20 bg-white/10 p-4 backdrop-blur">
          <p className="text-sm text-blue-100/70 mb-1">Marża</p>
          <p className="text-2xl font-bold text-white">
            {(data.globalMetrics.total_margin).toLocaleString('pl-PL', {
              style: 'currency',
              currency: 'PLN',
              maximumFractionDigits: 0,
            })}
          </p>
        </div>

        <div className="rounded-lg border border-white/20 bg-white/10 p-4 backdrop-blur">
          <p className="text-sm text-blue-100/70 mb-1">Marża %</p>
          <p className={`text-2xl font-bold ${
            data.globalMetrics.global_margin_percentage > 30 ? 'text-green-200' :
            data.globalMetrics.global_margin_percentage > 10 ? 'text-yellow-200' :
            'text-red-200'
          }`}>
            {data.globalMetrics.global_margin_percentage.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Alerts Section */}
      {data.alerts.length > 0 && (
        <div className="rounded-lg border border-white/20 bg-white/5 p-6 backdrop-blur">
          <h2 className="mb-4 text-xl font-bold text-white">⚠️ Alerty Biznesowe</h2>
          <div className="space-y-3">
            {data.alerts.slice(0, 5).map((alert) => (
              <div
                key={alert.id}
                className={`rounded-lg border p-4 ${getSeverityColor(alert.severity)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-semibold">
                      {getSeverityLabel(alert.severity)} • {getAlertTypeLabel(alert.alert_type)}
                    </p>
                    <p className="text-sm mt-1">{alert.message}</p>
                  </div>
                </div>
              </div>
            ))}
            {data.alerts.length > 5 && (
              <p className="text-sm text-blue-100/60 pt-2">
                + {data.alerts.length - 5} więcej alertów
              </p>
            )}
          </div>
        </div>
      )}

      {/* Top & Bottom Clients */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Clients */}
        <div className="rounded-lg border border-white/20 bg-white/5 p-6 backdrop-blur">
          <h2 className="mb-4 text-xl font-bold text-green-200">🎯 Klienci Rentowni</h2>
          <div className="space-y-3">
            {data.topClients.length > 0 ? (
              data.topClients.map((client) => (
                <div key={client.id} className="rounded-lg border border-green-500/30 bg-green-500/5 p-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-semibold text-green-100">{client.name}</p>
                    <p className="text-sm font-bold text-green-200">{client.margin_percentage.toFixed(1)}%</p>
                  </div>
                  <div className="text-xs text-green-100/70 space-y-1">
                    <p>Przychód: {(client.revenue).toLocaleString('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 })}</p>
                    <p>Marża: {(client.margin_amount).toLocaleString('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 })}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-green-100/60">Brak danych o rentownych klientach</p>
            )}
          </div>
        </div>

        {/* Bottom Clients */}
        <div className="rounded-lg border border-white/20 bg-white/5 p-6 backdrop-blur">
          <h2 className="mb-4 text-xl font-bold text-red-200">📉 Klienci Nierentowni</h2>
          <div className="space-y-3">
            {data.bottomClients.length > 0 ? (
              data.bottomClients.map((client) => (
                <div key={client.id} className="rounded-lg border border-red-500/30 bg-red-500/5 p-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-semibold text-red-100">{client.name}</p>
                    <p className={`text-sm font-bold ${
                      client.margin_percentage < 0 ? 'text-red-300' : 'text-yellow-200'
                    }`}>
                      {client.margin_percentage.toFixed(1)}%
                    </p>
                  </div>
                  <div className="text-xs text-red-100/70 space-y-1">
                    <p>Przychód: {(client.revenue).toLocaleString('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 })}</p>
                    <p className={client.margin_amount < 0 ? 'text-red-200 font-semibold' : ''}>
                      Marża: {(client.margin_amount).toLocaleString('pl-PL', { style: 'currency', currency: 'PLN', maximumFractionDigits: 0 })}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-red-100/60">Brak danych o nierentownych klientach</p>
            )}
          </div>
        </div>
      </div>

      {/* Aha Moment */}
      <div className="rounded-lg border border-purple-500/50 bg-gradient-to-r from-purple-500/20 to-pink-500/20 p-6 backdrop-blur">
        <h3 className="mb-2 text-lg font-bold text-purple-100">💡 Kluczowy Wgląd</h3>
        <p className="text-purple-100/80">
          {data.alerts.length > 0
            ? `Znaleźliśmy ${data.alerts.length} alertów wymagających Twojej uwagi. Klienci z marżą poniżej progu mogą znacząco obniżać Twoją rentowność.`
            : 'Gratulacje! Wszystkie Twoje klienty są rentowni. Kontynuuj monitorowanie aby utrzymać zdrową marżę.'}
        </p>
        <p className="text-sm text-purple-100/60 mt-3">
          Polecenie: Przeanalizuj klientów nierentownych i rozważ podniesienie cen lub zmianę warunków umowy.
        </p>
      </div>

      {/* Data timestamp */}
      <p className="text-xs text-blue-100/40 text-center">
        Dane zaktualizowane: {new Date().toLocaleString('pl-PL')}
      </p>
    </div>
  );
}
