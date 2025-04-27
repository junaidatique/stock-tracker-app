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

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [searchTerm, setSearchTerm] = useState('AAPL');
  const [tickers, setTickers] = useState<TickerInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string|null>(null);

  // Redirect if not signed in
  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [user, authLoading, router]);

  // Perform a search
  const doSearch = async (term: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth(`/indices/tickers?search=${encodeURIComponent(term)}&limit=10`);
      if (res.status === 404) {
        setTickers([]);
        setError('No tickers found.');
      } else if (!res.ok) {
        throw new Error(`API Error: ${res.status} ${res.statusText}`);
      } else {
        const data: TickerInfo[] = await res.json();
        if (data.length === 0) {
          setError('No tickers found.');
        }
        setTickers(data);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred');
      }
      setTickers([]);
    } finally {
      setLoading(false);
    }
  };

  // initial load
  useEffect(() => {
    if (user) doSearch(searchTerm);
  }, [user]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    doSearch(searchTerm);
  };

  const today = new Date().toISOString().slice(0,10);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <form onSubmit={onSubmit} className="flex flex-1 gap-2">
            <input
              type="text"
              placeholder="Search ticker…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="flex-1 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white rounded transition"
            >
              Search
            </button>
          </form>
        </div>

        { (loading || authLoading) ? (
          <p className="text-gray-700 dark:text-gray-300">Loading…</p>

        ) : error ? (
          <p className="text-red-500">{error}</p>

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
      </div>
    </div>
  );
}