// frontend/src/app/dashboard/details/page.tsx
'use client';

import { useEffect, useState, Fragment } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Dialog, DialogTitle } from '@headlessui/react';
import { useAuth } from '../../context/AuthContext';
import { fetchWithAuth } from '../../../lib/fetchWithAuth';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

interface CandleData {
  t: number[];
  o: number[];
  h: number[];
  l: number[];
  c: number[];
  v: number[];
  s: 'ok' | 'no_data';
}

interface TickerOverview {
  ticker: string;
  name: string;
  market: string;
  locale: string;
  primary_exchange: string;
  description?: string;
  homepage_url?: string;
  list_date?: string;
  market_cap?: number;
  branding?: { logo_url?: string; icon_url?: string };
}

export default function DetailsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useSearchParams();

  const symbol = params.get('symbol') ?? '';
  const date = params.get('date') ?? '';
  const interval = (params.get('interval') as string) || '1min';

  const [overview, setOverview] = useState<TickerOverview | null>(null);
  const [chart, setChart] = useState<CandleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [target, setTarget] = useState('');
  const [condition, setCondition] = useState<'above' | 'below'>('above');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Auth guard
  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [user, authLoading, router]);

  // Fetch details
  useEffect(() => {
    if (!user) return;
    if (!symbol || !date) {
      setError('Missing symbol or date');
      setLoading(false);
      return;
    }
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchWithAuth(
          `/indices/${encodeURIComponent(symbol)}/details?date=${date}&interval=${interval}`
        );
        if (res.status === 404) throw new Error('Data not found (404)');
        if (!res.ok) throw new Error(`API Error: ${res.status}`);
        const data: { overview: TickerOverview | null; chart: CandleData } = await res.json();
        setOverview(data.overview);
        setChart(data.chart);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    })();
  }, [user, symbol, date, interval]);

  // Prepare chart data
  const rechartsData = chart && chart.s === 'ok'
    ? chart.t.map((ts, i) => ({
        time: new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        close: chart.c[i],
      }))
    : [];

  // Modal handlers
  const openModal = () => {
    setTarget('');
    setCondition('above');
    setCreateError(null);
    setIsOpen(true);
  };
  const closeModal = () => {
    setIsOpen(false);
  };

  const createThreshold = async () => {
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetchWithAuth('/thresholds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: symbol, target: parseFloat(target), condition }),
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      closeModal();
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create threshold');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <Link
          href="/dashboard"
          className="inline-block text-blue-600 dark:text-blue-400 hover:underline"
        >
          ← Back to Dashboard
        </Link>

        <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100">
          {symbol} Details
        </h1>

        {loading ? (
          <p className="text-gray-700 dark:text-gray-300">Loading…</p>
        ) : error ? (
          <p className="text-red-500">{error}</p>
        ) : (
          <>
            {/* Overview */}
            <section className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">
                Overview
              </h2>
              {overview ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p><span className="font-medium">Name:</span> {overview.name}</p>
                    <p><span className="font-medium">Market:</span> {overview.market}</p>
                    <p><span className="font-medium">Locale:</span> {overview.locale}</p>
                    <p><span className="font-medium">Exchange:</span> {overview.primary_exchange}</p>
                    {overview.list_date && <p><span className="font-medium">List Date:</span> {overview.list_date}</p>}
                    {overview.market_cap != null && <p><span className="font-medium">Market Cap:</span> {overview.market_cap.toLocaleString()}</p>}
                  </div>
                  <div>
                    {overview.description && <p className="text-sm text-gray-700 dark:text-gray-300">{overview.description}</p>}
                    {overview.homepage_url && (
                      <a href={overview.homepage_url} target="_blank" rel="noreferrer"
                         className="text-blue-600 dark:text-blue-400 hover:underline">
                        Visit Website
                      </a>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-gray-700 dark:text-gray-300">Overview not available.</p>
              )}
            </section>

            {/* Chart */}
            <section className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
              <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">
                Price Chart ({date}, interval {interval})
              </h2>
              {rechartsData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={rechartsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={v => v.toFixed(2)} />
                    <Tooltip />
                    <Line type="monotone" dataKey="close" stroke="#3B82F6" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-700 dark:text-gray-300">No chart data available.</p>
              )}
            </section>

            {/* Create Threshold Button */}
            <button
              onClick={openModal}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
            >
              Create Threshold
            </button>

            {/* Modal */}
            <Dialog open={isOpen} onClose={closeModal}>
              <div className="fixed inset-0 z-10 overflow-y-auto bg-black/50">
                <div className="min-h-screen px-4 text-center">
                  
                  <span className="inline-block h-screen align-middle" aria-hidden="true">&#8203;</span>
                  <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle bg-white dark:bg-gray-800 shadow-xl rounded-lg z-50">
                    <DialogTitle as="h3" className="text-lg font-medium leading-6 text-gray-900 dark:text-gray-100">
                      Create Threshold for {symbol}
                    </DialogTitle>
                    <div className="mt-4 space-y-4">
                      <div>
                        <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Target Price</label>
                        <input
                          type="number"
                          value={target}
                          onChange={e => setTarget(e.target.value)}
                          className="w-full px-3 py-2 border rounded bg-gray-100 dark:bg-gray-700 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Condition</label>
                        <select
                          value={condition}
                          onChange={e => setCondition(e.target.value as 'above' | 'below')}
                          className="w-full px-3 py-2 border rounded bg-gray-100 dark:bg-gray-700"
                        >
                          <option value="above">Above</option>
                          <option value="below">Below</option>
                        </select>
                      </div>
                      {createError && <p className="text-sm text-red-500">{createError}</p>}
                    </div>
                    <div className="mt-6 flex justify-end space-x-2">
                      <button className="px-4 py-2 bg-gray-300 dark:bg-gray-600 rounded" onClick={closeModal}>
                        Cancel
                      </button>
                      <button
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50"
                        onClick={createThreshold}
                        disabled={creating || !target}
                      >
                        {creating ? 'Creating…' : 'Create'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </Dialog>
          </>
        )}
      </div>
    </div>
  );
}