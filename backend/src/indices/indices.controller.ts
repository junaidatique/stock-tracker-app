// backend/src/indices/indices.controller.ts
import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { IndicesService, TickerInfo } from './indices.service';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';

@Controller('indices')
export class IndicesController {
  constructor(private readonly svc: IndicesService) {}

  /**
   * GET /indices/tickers?search=SP&limit=10
   * Returns up to `limit` tickers matching `search`
   */
  @Get('tickers')
  // @UseGuards(FirebaseAuthGuard)
  async tickers(
    @Query('search') search?: string,
    @Query('limit') limit?: string,
  ): Promise<TickerInfo[]> {
    const lim = limit ? Math.min(parseInt(limit, 10), 50) : 10;
    return this.svc.searchTickers(search ?? '', lim);
  }

  /**
   * GET /indices/:symbol/chart
   * Query: ?date=YYYY-MM-DD&resolution=minutes|D
   */
  @Get(':symbol/chart')
  @UseGuards(FirebaseAuthGuard)
  chart(
    @Param('symbol') symbol: string,
    @Query('date') date: string,
    @Query('interval') interval?: string, // e.g. "5min"
  ) {
    const valid = ['1min', '5min', '15min', '30min', '1h'] as const;
    type ValidInterval = (typeof valid)[number];
    const iv = valid.includes(interval as ValidInterval)
      ? (interval as ValidInterval)
      : '1h';
    return this.svc.getChart(symbol, date, iv);
  }

  /**
   * GET /indices/:symbol/details?date=YYYY-MM-DD&interval=5min
   * Returns:
   *   {
   *     overview: {  } | null,
   *     chart: {  }
   *   }
   */
  @Get(':symbol/details')
  // @UseGuards(FirebaseAuthGuard)
  async details(
    @Param('symbol') symbol: string,
    @Query('date') date: string,
    @Query('interval') interval?: string,
  ) {
    if (!date) {
      throw new Error('Query parameter `date` is required');
    }

    // validate interval
    const valid = ['1min', '5min', '15min', '30min', '1h'] as const;
    type ValidInterval = (typeof valid)[number];
    const iv = valid.includes(interval as ValidInterval)
      ? (interval as ValidInterval)
      : '1h';

    return this.svc.getDetails(symbol, date, iv);
  }
}
