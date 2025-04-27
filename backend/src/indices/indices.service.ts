// backend/src/indices/indices.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface CandleData {
  t: number[]; // UNIX timestamp (ms)
  o: number[];
  h: number[];
  l: number[];
  c: number[];
  v: number[];
  s: 'ok' | 'no_data';
}

export interface TickerInfo {
  ticker: string;
  name: string;
  market: string;
  locale: string;
  primary_exchange: string;
  active: boolean;
}
export interface TickerOverview {
  ticker: string;
  name: string;
  market: string;
  locale: string;
  primary_exchange: string;
  status?: string;
  description?: string;
  homepage_url?: string;
  list_date?: string;
  market_cap?: number;
  branding?: { logo_url?: string; icon_url?: string };
}

@Injectable()
export class IndicesService {
  private readonly apiKeyTwelveData: string;
  private readonly apiKeyPolygon: string;

  constructor(private readonly cfg: ConfigService) {
    const apiKeyTwelveData = this.cfg.get<string>('TWELVEDATA_API_KEY');
    if (!apiKeyTwelveData) throw new Error('TWELVEDATA_API_KEY not set');
    this.apiKeyTwelveData = apiKeyTwelveData;

    const apiKeyPolygon = this.cfg.get<string>('POLYGON_API_KEY');
    if (!apiKeyPolygon) throw new Error('POLYGON_API_KEY not set');
    this.apiKeyPolygon = apiKeyPolygon;
  }

  /**
   * Search tickers via Polygon v3 Reference API
   * @param search  partial ticker or name
   * @param limit   max results to return
   */
  async searchTickers(
    search: string = '',
    limit: number = 10,
  ): Promise<TickerInfo[]> {
    const resp = await axios.get(
      'https://api.polygon.io/v3/reference/tickers',
      {
        params: {
          apiKey: this.apiKeyPolygon,
          search,
          limit,
        },
      },
    );

    interface PolygonResponse {
      status: string;
      results: TickerInfo[];
    }

    const polygonResp = resp.data as PolygonResponse;
    if (polygonResp.status !== 'OK' || !Array.isArray(polygonResp.results)) {
      throw new BadRequestException(
        `Polygon returned status=${polygonResp.status}`,
      );
    }

    return polygonResp.results.map((r: TickerInfo) => ({
      ticker: r.ticker,
      name: r.name,
      market: r.market,
      locale: r.locale,
      primary_exchange: r.primary_exchange,
      active: r.active,
    }));
  }

  /**
   * Fetch intraday bars for a given index symbol on one day.
   * Uses Twelve Data’s free time_series endpoint:
   *   https://api.twelvedata.com/time_series
   *
   * @param symbol    e.g. 'SPX' or '^GSPC' (Twelve Data uses plain tickers)
   * @param date      'YYYY-MM-DD'
   * @param interval  '1min' | '5min' | '15min' | '30min' | '1h'  etc.
   */
  async getChart(
    symbol: string,
    date: string,
    interval: '1min' | '5min' | '15min' | '30min' | '1h' = '1min',
  ): Promise<CandleData> {
    const resp = await axios.get('https://api.twelvedata.com/time_series', {
      params: {
        symbol,
        interval,
        outputsize: 1000, // max points (up to a year for intraday)
        format: 'JSON',
        apikey: this.apiKeyTwelveData,
      },
    });

    interface TwelveDataResponse {
      status?: string;
      values?: unknown[];
      data?: {
        status?: string;
        values?: unknown[];
      };
    }

    const response = resp.data as TwelveDataResponse;
    const status = response.status ?? response.data?.status;
    const values = response.values ?? response.data?.values;

    if (status === 'error' || !Array.isArray(values)) {
      return { t: [], o: [], h: [], l: [], c: [], v: [], s: 'no_data' };
    }
    // Filter to only the requested date
    const bars = values
      .filter(
        (
          bar: unknown,
        ): bar is {
          datetime: string;
          open: string;
          high: string;
          low: string;
          close: string;
          volume: string;
        } => {
          const barObj = bar as {
            datetime: string;
            open: string;
            high: string;
            low: string;
            close: string;
            volume: string;
          };
          return (
            typeof bar === 'object' &&
            bar !== null &&
            typeof barObj.datetime === 'string' &&
            typeof barObj.open === 'string' &&
            typeof barObj.high === 'string' &&
            typeof barObj.low === 'string' &&
            typeof barObj.close === 'string' &&
            typeof barObj.volume === 'string' &&
            barObj.datetime.startsWith(date)
          );
        },
      )
      .map((bar) => {
        return {
          ts: new Date(bar.datetime).getTime(),
          o: parseFloat(bar.open),
          h: parseFloat(bar.high),
          l: parseFloat(bar.low),
          c: parseFloat(bar.close),
          v: parseFloat(bar.volume),
        };
      })
      .sort((a, b) => a.ts - b.ts);

    if (!bars.length) {
      return { t: [], o: [], h: [], l: [], c: [], v: [], s: 'no_data' };
    }

    // Unzip into parallel arrays
    return {
      t: bars.map((b) => b.ts),
      o: bars.map((b) => b.o),
      h: bars.map((b) => b.h),
      l: bars.map((b) => b.l),
      c: bars.map((b) => b.c),
      v: bars.map((b) => b.v),
      s: 'ok',
    };
  }

  /**
   * Fetch full details: ticker overview + chart data
   */
  async getDetails(
    symbol: string,
    date: string,
    interval: '1min' | '5min' | '15min' | '30min' | '1h' = '1min',
  ): Promise<{ overview: TickerOverview | null; chart: CandleData }> {
    // Fire both in parallel
    const [ovrResult, chartResult] = await Promise.allSettled([
      this.getTickerOverview(symbol, date),
      this.getChart(symbol, date, interval),
    ]);

    // Handle overview result
    let overview: TickerOverview | null;
    if (ovrResult.status === 'fulfilled') {
      overview = ovrResult.value;
    } else {
      // Rate-limit or other error—log and continue with null
      const err = ovrResult.reason as Error;
      console.warn(
        `Failed to fetch overview for ${symbol}: ${err instanceof Error ? err.message : 'Unknown error'}`,
      );
      overview = null;
    }

    // Handle chart result
    const chart =
      chartResult.status === 'fulfilled'
        ? chartResult.value
        : { t: [], o: [], h: [], l: [], c: [], v: [], s: 'no_data' as const };

    return { overview, chart };
  }

  /**
   * Low-level: call Polygon's Ticker Overview endpoint
   */
  private async getTickerOverview(
    symbol: string,
    date?: string,
  ): Promise<TickerOverview> {
    try {
      const resp = await axios.get<{ status: string; results: any }>(
        `https://api.polygon.io/v3/reference/tickers/${encodeURIComponent(symbol)}`,
        { params: { apiKey: this.apiKeyPolygon, date } },
      );
      const body = resp.data;
      if (body.status !== 'OK' || !body.results) {
        throw new BadRequestException(`Polygon returned status=${body.status}`);
      }
      return body.results as TickerOverview;
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 429) {
        // too many requests
        throw new BadRequestException('Polygon API rate limit exceeded');
      }
      throw err;
    }
  }
}
