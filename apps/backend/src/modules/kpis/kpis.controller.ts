import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { KpisService } from './kpis.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('KPIs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('kpis')
export class KpisController {
  constructor(private readonly svc: KpisService) {}
  @Post() create(@Body() body: any) { return this.svc.create(body); }
  @Get() @ApiOperation({ summary: 'List KPIs' }) findAll(@Query() q: any) { return this.svc.findAll(q); }
  @Get('trends') @ApiOperation({ summary: 'KPI trends over time' }) getTrends(@Query() q: any) { return this.svc.getTrends(q); }
  @Get(':id') findOne(@Param('id') id: string) { return this.svc.findOne(id); }
}
