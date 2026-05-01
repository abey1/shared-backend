import { Controller, Get } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';

@Controller('health')
export class HealthController {
  @Public()
  @Get()
  ok() {
    return { status: 'ok', service: 'equipment-rental-api' };
  }
}
