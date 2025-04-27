'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
import Link from 'next/link';

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

  const [overview, setOverview] = useState<TickerOverview|null>(null);
  const [chart, setChart] = useState<CandleData|null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);

  // auth guard
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login');
    }
  }, [user, authLoading, router]);

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
        if (res.status === 404) {
          throw new Error('Data not found (404)');
        }
        if (!res.ok) {
          throw new Error(`API Error: ${res.status} ${res.statusText}`);
        }
        const data: {
          overview: TickerOverview|null;
          chart: CandleData;
        } = await res.json();
        setOverview(data.overview);
        setChart(data.chart);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('An unknown error occurred');
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [user, symbol, date, interval]);

  // Prepare chart data for Recharts
  const rechartsData =
    chart && chart.s === 'ok'
      ? chart.t.map((ts, i) => ({
          time: new Date(ts).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
          close: chart.c[i],
        }))
      : [];

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
                    <p>
                      <span className="font-medium">Name:</span>{' '}
                      {overview.name}
                    </p>
                    <p>
                      <span className="font-medium">Market:</span>{' '}
                      {overview.market}
                    </p>
                    <p>
                      <span className="font-medium">Locale:</span>{' '}
                      {overview.locale}
                    </p>
                    <p>
                      <span className="font-medium">Exchange:</span>{' '}
                      {overview.primary_exchange}
                    </p>
                    {overview.list_date && (
                      <p>
                        <span className="font-medium">List Date:</span>{' '}
                        {overview.list_date}
                      </p>
                    )}
                    {overview.market_cap != null && (
                      <p>
                        <span className="font-medium">Market Cap:</span>{' '}
                        {overview.market_cap.toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div>
                    {overview.description && (
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {overview.description}
                      </p>
                    )}
                    {overview.homepage_url && (
                      <p className="mt-2">
                        <a
                          href={overview.homepage_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          Visit Website
                        </a>
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-gray-700 dark:text-gray-300">
                  Overview not available.
                </p>
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
                    <YAxis tickFormatter={(v) => v.toFixed(2)} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="close"
                      stroke="#3B82F6"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-gray-700 dark:text-gray-300">
                  No chart data available.
                </p>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}