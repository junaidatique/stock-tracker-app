// backend/src/thresholds/thresholds.controller.ts
import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { ThresholdsService, Threshold } from './thresholds.service';
import { CreateThresholdDto } from './dto/create-threshold.dto';

@Controller('thresholds')
@UseGuards(FirebaseAuthGuard)
export class ThresholdsController {
  constructor(private readonly svc: ThresholdsService) {}

  /**
   * POST /thresholds
   * Body: { ticker, target, condition }
   */
  @Post()
  create(
    @Req() req: { user: { uid: string } },
    @Body(new ValidationPipe({ whitelist: true, transform: true }))
    dto: CreateThresholdDto,
  ): Promise<Threshold> {
    return this.svc.create(req.user.uid, dto);
  }

  /**
   * GET /thresholds
   * Returns all thresholds for the current user
   */
  @Get()
  list(@Req() req: { user: { uid: string } }): Promise<Threshold[]> {
    return this.svc.findAll(req.user.uid);
  }

  /**
   * DELETE /thresholds/:id
   * Remove a specific threshold by ID
   */
  @Delete(':id')
  remove(
    @Req() req: { user: { uid: string } },
    @Param('id') id: string,
  ): Promise<void> {
    return this.svc.remove(req.user.uid, id);
  }
}
