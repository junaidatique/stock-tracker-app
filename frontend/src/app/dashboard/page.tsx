// frontend/src/app/dashboard/page.tsx
'use client';

import { useEffect, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { fetchWithAuth } from '../../lib/fetchWithAuth';

interface TickerInfo {
  ticker: string;
  name: string;
  market: string;
  locale: string;
  primary_exchange: string;
  active: boolean;
}

interface Threshold {
  id: string;
  ticker: string;
  target: number;
  condition: 'above' | 'below';
  enabled: boolean;
  createdAt: { seconds: number; nanoseconds: number };
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // --- TICKER STATE ---
  const [searchTerm, setSearchTerm] = useState('AAPL');
  const [tickers, setTickers] = useState<TickerInfo[]>([]);
  const [tickerLoading, setTickerLoading] = useState(false);
  const [tickerError, setTickerError] = useState<string | null>(null);

  // --- THRESHOLD STATE ---
  const [thresholds, setThresholds] = useState<Threshold[]>([]);
  const [thrLoading, setThrLoading] = useState(false);
  const [thrError, setThrError] = useState<string | null>(null);

  // Redirect if not signed in
  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [user, authLoading, router]);

  // Fetch thresholds
  const loadThresholds = async () => {
    setThrLoading(true);
    setThrError(null);
    try {
      const res = await fetchWithAuth('/thresholds');
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data: Threshold[] = await res.json();
      setThresholds(data);
    } catch (err: unknown) {
      setThrError(err instanceof Error ? err.message : 'Failed to load thresholds');
      setThresholds([]);
    } finally {
      setThrLoading(false);
    }
  };

  // Initial thresholds load
  useEffect(() => {
    if (user) loadThresholds();
  }, [user]);

  // Delete a threshold
  const deleteThreshold = async (id: string) => {
    if (!confirm('Delete this threshold?')) return;
    try {
      const res = await fetchWithAuth(`/thresholds/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      // Refresh list
      loadThresholds();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete threshold');
    }
  };

  // Ticker search
  const doSearch = async (term: string) => {
    setTickerLoading(true);
    setTickerError(null);
    try {
      const res = await fetchWithAuth(
        `/indices/tickers?search=${encodeURIComponent(term)}&limit=10`
      );
      if (res.status === 404) {
        setTickers([]);
        setTickerError('No tickers found.');
      } else if (!res.ok) {
        throw new Error(`API Error: ${res.status} ${res.statusText}`);
      } else {
        const data: TickerInfo[] = await res.json();
        if (data.length === 0) setTickerError('No tickers found.');
        setTickers(data);
      }
    } catch (err: unknown) {
      setTickerError(err instanceof Error ? err.message : 'Unknown error occurred');
      setTickers([]);
    } finally {
      setTickerLoading(false);
    }
  };

  // Initial ticker load
  useEffect(() => {
    if (user) doSearch(searchTerm);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    doSearch(searchTerm);
  };

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto space-y-12">

        {/* ─── TICKER SEARCH & TABLE ─────────────────────────── */}
        <section>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Search Tickers
          </h1>
          <form onSubmit={onSubmit} className="flex gap-2 mb-4">
            <input
              type="text"
              placeholder="e.g. AAPL, SPY…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="flex-1 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded transition"
            >
              Search
            </button>
          </form>

          {tickerLoading || authLoading ? (
            <p className="text-gray-700 dark:text-gray-300">Loading tickers…</p>
          ) : tickerError ? (
            <p className="text-red-500">{tickerError}</p>
          ) : tickers.length === 0 ? (
            <p className="text-gray-700 dark:text-gray-300">No tickers to display.</p>
          ) : (
            <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-700">
                    {['Ticker','Name','Market','Locale','Exchange','Active'].map(h => (
                      <th
                        key={h}
                        className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tickers.map(t => (
                    <tr
                      key={t.ticker}
                      className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                    >
                      <td className="px-4 py-3 text-blue-600 dark:text-blue-400">
                        <Link
                          href={`/dashboard/details?symbol=${encodeURIComponent(t.ticker)}&date=${today}&interval=1h`}
                        >
                          {t.ticker}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-800 dark:text-gray-200">{t.name}</td>
                      <td className="px-4 py-3 text-gray-800 dark:text-gray-200">{t.market}</td>
                      <td className="px-4 py-3 text-gray-800 dark:text-gray-200">{t.locale}</td>
                      <td className="px-4 py-3 text-gray-800 dark:text-gray-200">{t.primary_exchange}</td>
                      <td className="px-4 py-3">
                        {t.active
                          ? <span className="text-green-600 dark:text-green-400 font-semibold">✓</span>
                          : <span className="text-red-600 dark:text-red-400 font-semibold">✕</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ─── THRESHOLDS LIST ───────────────────────────────── */}
        <section>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Your Thresholds
          </h2>

          {thrLoading || authLoading ? (
            <p className="text-gray-700 dark:text-gray-300">Loading thresholds…</p>
          ) : thrError ? (
            <p className="text-red-500">{thrError}</p>
          ) : thresholds.length === 0 ? (
            <p className="text-gray-700 dark:text-gray-300">
              No thresholds set yet.
            </p>
          ) : (
            <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-700">
                    {['Ticker','Target','Condition','Status','Actions'].map(h => (
                      <th
                        key={h}
                        className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {thresholds.map(t => {
                    return (
                      <tr
                        key={t.id}
                        className="border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                      >
                        <td className="px-4 py-3 text-gray-800 dark:text-gray-200">
                          {t.ticker}
                        </td>
                        <td className="px-4 py-3 text-gray-800 dark:text-gray-200">
                          {t.target}
                        </td>
                        <td className="px-4 py-3 text-gray-800 dark:text-gray-200">
                          {t.condition === 'above' ? 'Above' : 'Below'}
                        </td>
                        <td className="px-4 py-3">
                          {t.enabled ? (
                            <span className="px-2 py-1 text-green-700 bg-green-100 dark:bg-green-800 dark:text-green-300 rounded-full text-xs">
                              Enabled
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-gray-700 bg-gray-200 dark:bg-gray-700 dark:text-gray-300 rounded-full text-xs">
                              Disabled
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 space-x-2">
                          <button
                            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
                            onClick={() => deleteThreshold(t.id)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}