import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query, Req, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { SurveysService } from './surveys.service';
import { AiSurveyService } from './ai-survey.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Surveys')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('surveys')
export class SurveysController {
  constructor(
    private readonly surveysService: SurveysService,
    private readonly aiSurveyService: AiSurveyService,
  ) {}

  @Post('ai-generate')
  @ApiOperation({ summary: 'Generate survey questions from program context + question bank using AI' })
  aiGenerate(@Body() body: { programId: string }) {
    return this.aiSurveyService.generate(body.programId);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'SVP', 'CNO', 'DIRECTOR', 'HR_ANALYST')
  @ApiOperation({ summary: 'Create a new survey' })
  create(@Body() body: any, @Req() req: any) {
    // JWT strategy returns roles as string[], not Role objects
    const roles: string[] = req.user?.roles ?? [];
    const createdByRole   = typeof roles[0] === 'string' ? roles[0] : (roles[0] as any)?.name ?? null;
    return this.surveysService.create(body, req.user.id, createdByRole);
  }

  @Get()
  @ApiOperation({ summary: 'List surveys' })
  @ApiQuery({ name: 'status',         required: false })
  @ApiQuery({ name: 'type',           required: false })
  @ApiQuery({ name: 'orgUnitId',      required: false })
  @ApiQuery({ name: 'approvalStatus', required: false })
  @ApiQuery({ name: 'createdById',    required: false })
  @ApiQuery({ name: 'userId',         required: false, description: 'When passed, excludes focus-group surveys the user is not in' })
  findAll(@Query() query: any) {
    return this.surveysService.findAll(query);
  }

  @Get('pending-approvals')
  @ApiOperation({ summary: 'List all surveys pending SVP approval' })
  pendingApprovals() {
    return this.surveysService.getPendingApprovals();
  }

  @Get('governance')
  @ApiOperation({ summary: 'Get governance configuration (approval rules)' })
  getGovernance() {
    return this.surveysService.getGovernance();
  }

  @Get('templates')
  @ApiOperation({ summary: 'List all saved survey templates' })
  getTemplates() {
    return this.surveysService.getTemplates();
  }

  @Post(':id/save-as-template')
  @ApiOperation({ summary: 'Save an existing survey as a reusable template' })
  saveAsTemplate(@Param('id') id: string, @Req() req: any) {
    return this.surveysService.saveAsTemplate(id, req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get survey by ID' })
  findOne(@Param('id') id: string) {
    return this.surveysService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.surveysService.update(id, body);
  }

  @Post(':id/publish')
  @ApiOperation({ summary: 'Publish survey (set status to ACTIVE)' })
  publish(@Param('id') id: string, @Req() req: any) {
    const roles: string[] = req.user?.roles ?? [];
    const role = typeof roles[0] === 'string' ? roles[0] : (roles[0] as any)?.name ?? null;
    return this.surveysService.publish(id, role);
  }

  @Post(':id/close')
  @ApiOperation({ summary: 'Close survey' })
  close(@Param('id') id: string) {
    return this.surveysService.close(id);
  }

  // ── Approval workflow ─────────────────────────────────────────────────────

  @Post(':id/request-approval')
  @ApiOperation({ summary: 'CNO submits survey for SVP review' })
  requestApproval(@Param('id') id: string, @Req() req: any) {
    return this.surveysService.requestApproval(id, req.user.id);
  }

  @Post(':id/approve')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'SVP')
  @ApiOperation({ summary: 'SVP approves a CNO survey' })
  approve(@Param('id') id: string, @Req() req: any) {
    return this.surveysService.approve(id, req.user.id);
  }

  @Post(':id/reject')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'SVP')
  @ApiOperation({ summary: 'SVP rejects a CNO survey with reason' })
  reject(@Param('id') id: string, @Body() body: { reason: string }, @Req() req: any) {
    return this.surveysService.reject(id, req.user.id, body.reason);
  }

  // ── Misc ──────────────────────────────────────────────────────────────────

  @Get(':id/participation')
  @ApiOperation({ summary: 'Get survey participation status' })
  participation(@Param('id') id: string) {
    return this.surveysService.getParticipation(id);
  }

  @Get(':id/results')
  @ApiOperation({ summary: 'Granular survey results: question analysis, anonymised individual responses, open text' })
  results(@Param('id') id: string) {
    return this.surveysService.getResults(id);
  }

  @Post('bulk-delete')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Bulk soft-delete surveys (SUPER_ADMIN only)' })
  bulkDelete(@Body() body: { ids: string[] }) {
    return this.surveysService.bulkSoftDelete(body.ids);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'SVP', 'CNO', 'HR_ANALYST')
  remove(@Param('id') id: string) {
    return this.surveysService.remove(id);
  }
}
