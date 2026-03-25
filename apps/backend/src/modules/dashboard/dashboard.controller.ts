import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Dashboard')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @ApiOperation({ summary: 'Role-based dashboard summary' })
  @ApiQuery({ name: 'role', required: false, description: 'SVP | VP | DIRECTOR | MANAGER | HR_ANALYST' })
  @ApiQuery({ name: 'orgUnitId', required: false })
  getSummary(@Query() query: any) {
    return this.dashboardService.getSummary(query);
  }

  @Get('drilldown')
  @ApiOperation({ summary: 'Drill down into org unit: System → Hospital → Unit → Issue → Task' })
  @ApiQuery({ name: 'orgUnitId', required: true })
  drilldown(@Query() query: any) {
    return this.dashboardService.drilldown(query.orgUnitId);
  }

  @Get('stuck')
  @ApiOperation({ summary: 'Issues/tasks that are stuck or overdue' })
  getStuck() {
    return this.dashboardService.getStuckItems();
  }

  @Get('risk')
  @ApiOperation({ summary: 'High-risk units and issues requiring attention' })
  getRisk() {
    return this.dashboardService.getRiskReport();
  }
}
