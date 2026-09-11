import { Controller, Get, VERSION_NEUTRAL, Version } from '@nestjs/common';
import { ApiExcludeEndpoint } from '@nestjs/swagger';

@Controller()
export class AppController {
  @Get('ping')
  @Version(VERSION_NEUTRAL)
  @ApiExcludeEndpoint()
  ping() {
    return { status: 'ok' };
  }
}
