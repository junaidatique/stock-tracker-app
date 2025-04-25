import { Controller } from '@nestjs/common';
import { IndicesService } from './indices.service';

@Controller('indices')
export class IndicesController {
  constructor(private svc: IndicesService) {}
}
