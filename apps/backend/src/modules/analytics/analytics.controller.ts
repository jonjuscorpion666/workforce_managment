import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('low-units')
  @ApiOperation({ summary: 'Get lowest-performing org units' })
  @ApiQuery({ name: 'surveyId', required: false })
  @ApiQuery({ name: 'threshold', required: false })
  getLowUnits(@Query() query: any) {
    return this.analyticsService.getLowPerformingUnits(query);
  }

  @Get('trends')
  @ApiOperation({ summary: 'Survey score trends across cycles' })
  @ApiQuery({ name: 'orgUnitId', required: false })
  @ApiQuery({ name: 'cycles', required: false })
  getTrends(@Query() query: any) {
    return this.analyticsService.getTrends(query);
  }

  @Get('heatmap')
  @ApiOperation({ summary: 'Engagement heatmap data across org units' })
  getHeatmap(@Query() query: any) {
    return this.analyticsService.getHeatmap(query);
  }

  @Get('sentiment')
  @ApiOperation({ summary: 'Open-text sentiment analysis and theme extraction' })
  @ApiQuery({ name: 'surveyId',  required: false })
  @ApiQuery({ name: 'orgUnitId', required: false })
  getSentiment(@Query() query: any) {
    return this.analyticsService.getSentiment(query);
  }

  @Get('participation')
  @ApiOperation({ summary: 'Participation rates by org unit / survey' })
  getParticipation(@Query() query: any) {
    return this.analyticsService.getParticipation(query);
  }

  @Get('svp')
  @ApiOperation({ summary: 'SVP executive dashboard — all KPIs in one call' })
  @ApiQuery({ name: 'surveyId', required: false })
  getSvpDashboard(@Query() query: any) {
    return this.analyticsService.getSvpDashboard(query);
  }
}
