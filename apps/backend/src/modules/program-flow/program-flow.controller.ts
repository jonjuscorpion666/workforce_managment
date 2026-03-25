import {
  Controller, Get, Post, Patch, Param, Body, Query,
  Req, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ProgramFlowService } from './program-flow.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Program Flow')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('program-flow')
export class ProgramFlowController {
  constructor(private readonly svc: ProgramFlowService) {}

  // ─── Cycles ────────────────────────────────────────────────────────────────

  @Post('cycles')
  @ApiOperation({ summary: 'Create a new program cycle' })
  createCycle(@Body() body: any, @Req() req: any) {
    return this.svc.createCycle(body, req.user.id);
  }

  @Get('cycles')
  @ApiOperation({ summary: 'List all program cycles' })
  listCycles() {
    return this.svc.listCycles();
  }

  @Get('cycles/:id')
  @ApiOperation({ summary: 'Get pipeline view for a cycle' })
  getCycle(@Param('id') id: string) {
    return this.svc.getPipelineView(id);
  }

  @Get('cycles/:id/pipeline')
  @ApiOperation({ summary: 'Get pipeline view grouped by hospital' })
  getPipeline(@Param('id') id: string) {
    return this.svc.getPipelineView(id);
  }

  @Get('sla/defaults')
  @ApiOperation({ summary: 'Get system-wide default SLA values' })
  getDefaultSla() {
    return this.svc.getDefaultSla();
  }

  @Get('cycles/:id/sla')
  @ApiOperation({ summary: 'Get resolved SLA config for a cycle' })
  async getCycleSla(@Param('id') id: string) {
    const pipeline = await this.svc.getPipelineView(id);
    return { stageSla: pipeline.stageSla, isCustom: !!pipeline.cycle?.stageSla };
  }

  @Patch('cycles/:id/sla')
  @ApiOperation({ summary: 'Update SLA day thresholds for a cycle' })
  updateSla(@Param('id') id: string, @Body() body: Record<string, number>) {
    return this.svc.updateSlaConfig(id, body);
  }

  @Post('cycles/:id/auto-compute')
  @ApiOperation({ summary: 'Auto-compute stage states from existing data' })
  autoCompute(@Param('id') id: string) {
    return this.svc.autoComputeStages(id);
  }

  // ─── Stage statuses ────────────────────────────────────────────────────────

  @Patch('stages/:stageId')
  @ApiOperation({ summary: 'Update a stage status' })
  updateStage(@Param('stageId') stageId: string, @Body() body: any, @Req() req: any) {
    return this.svc.updateStageStatus(stageId, body, req.user.id);
  }

  @Patch('cycles/:id/units/:orgUnitId/stage')
  @ApiOperation({ summary: 'Update a stage for a specific org unit in a cycle' })
  updateUnitStage(
    @Param('id') cycleId: string,
    @Param('orgUnitId') orgUnitId: string,
    @Body() body: any,
    @Req() req: any,
  ) {
    return this.svc.bulkUpdateStages(cycleId, orgUnitId, body, req.user.id);
  }

  @Get('cycles/:id/units/:orgUnitId/stage/:stage/detail')
  @ApiOperation({ summary: 'Get stage drill-down detail: issues, tasks, timeline' })
  getStageDetail(
    @Param('id') cycleId: string,
    @Param('orgUnitId') orgUnitId: string,
    @Param('stage') stage: string,
  ) {
    return this.svc.getStageDetail(cycleId, orgUnitId, stage);
  }
}
