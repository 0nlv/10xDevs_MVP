/**
 * TransactionsManager Component
 * 
 * Displays and allows editing of revenue transactions.
 * Used in /transactions page for data management.
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface Transaction {
  id: string;
  client_id: string | null;
  amount: number;
  transaction_date: string;
  client_name?: string;
}

interface Client {
  id: string;
  name: string;
}

interface TransactionsManagerProps {
  initialTransactions: Transaction[];
  clients: Client[];
}

export default function TransactionsManager({
  initialTransactions,
  clients,
}: TransactionsManagerProps) {
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    amount: '',
    transaction_date: '',
    client_id: '',
  });
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleEdit = (transaction: Transaction) => {
    setEditingId(transaction.id);
    setEditForm({
      amount: transaction.amount.toString(),
      transaction_date: transaction.transaction_date,
      client_id: transaction.client_id || '',
    });
    setError(null);
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm({ amount: '', transaction_date: '', client_id: '' });
    setError(null);
  };

  const handleSave = async (transactionId: string) => {
    setSavingId(transactionId);
    setError(null);

    try {
      const updateData: Record<string, string | number> = {};

      if (editForm.amount) {
        updateData.amount = parseFloat(editForm.amount);
      }
      if (editForm.transaction_date) {
        updateData.transaction_date = editForm.transaction_date;
      }
      if (editForm.client_id) {
        updateData.client_id = editForm.client_id;
      }

      const response = await fetch(`/api/transactions/${transactionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update transaction');
      }

      // Update local state
      setTransactions((prev) =>
        prev.map((t) => {
          if (t.id === transactionId) {
            const client = clients.find((c) => c.id === data.transaction.client_id);
            return {
              ...t,
              ...data.transaction,
              client_name: client?.name,
            };
          }
          return t;
        })
      );

      setEditingId(null);
      setEditForm({ amount: '', transaction_date: '', client_id: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd podczas zapisywania');
      console.error('Update error:', err);
    } finally {
      setSavingId(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency: 'PLN',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pl-PL');
  };

  if (transactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Brak transakcji</CardTitle>
          <CardDescription>
            Nie masz jeszcze żadnych transakcji przychodowych. Wgraj plik CSV z przychodami.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transakcje przychodowe</CardTitle>
        <CardDescription>
          Przeglądaj i edytuj dane transakcji. Zmiany wpłyną na kalkulacje marż.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Klient</TableHead>
                <TableHead className="text-right">Kwota</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Akcje</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  {editingId === transaction.id ? (
                    <>
                      <TableCell>
                        <select
                          value={editForm.client_id}
                          onChange={(e) =>
                            setEditForm((prev) => ({ ...prev, client_id: e.target.value }))
                          }
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                          <option value="">Wybierz klienta</option>
                          {clients.map((client) => (
                            <option key={client.id} value={client.id}>
                              {client.name}
                            </option>
                          ))}
                        </select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          value={editForm.amount}
                          onChange={(e) =>
                            setEditForm((prev) => ({ ...prev, amount: e.target.value }))
                          }
                          className="text-right"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="date"
                          value={editForm.transaction_date}
                          onChange={(e) =>
                            setEditForm((prev) => ({ ...prev, transaction_date: e.target.value }))
                          }
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleSave(transaction.id)}
                            disabled={savingId === transaction.id}
                          >
                            {savingId === transaction.id ? 'Zapisuję...' : 'Zapisz'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancel}
                            disabled={savingId === transaction.id}
                          >
                            Anuluj
                          </Button>
                        </div>
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell className="font-medium">
                        {transaction.client_name || '(brak przypisania)'}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(transaction.amount)}
                      </TableCell>
                      <TableCell>{formatDate(transaction.transaction_date)}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => handleEdit(transaction)}>
                          Edytuj
                        </Button>
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
