import {
  Controller, Get, Post, Patch, Param, Body, Query, Req, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ProgramsService } from './programs.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Programs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('programs')
export class ProgramsController {
  constructor(private readonly svc: ProgramsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new program' })
  create(@Body() body: any, @Req() req: any) {
    return this.svc.create(body, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List programs (filterable by hospital, status, stage, scope)' })
  findAll(@Query() q: any) {
    return this.svc.findAll(q);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get program detail' })
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Get(':id/related-work')
  @ApiOperation({ summary: 'Get all issues + tasks linked to this program or its survey' })
  getRelatedWork(@Param('id') id: string) {
    return this.svc.getRelatedWork(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update program fields' })
  update(@Param('id') id: string, @Body() body: any) {
    return this.svc.update(id, body);
  }

  @Patch(':id/checklist')
  @ApiOperation({ summary: 'Update setup checklist items' })
  updateChecklist(@Param('id') id: string, @Body() body: any) {
    return this.svc.updateChecklist(id, body);
  }

  @Patch(':id/survey')
  @ApiOperation({ summary: 'Link a survey to this program' })
  linkSurvey(@Param('id') id: string, @Body() body: { surveyId: string }) {
    return this.svc.linkSurvey(id, body.surveyId);
  }

  @Patch(':id/unlink-survey')
  @ApiOperation({ summary: 'Unlink survey and reset auto-ticked items' })
  unlinkSurvey(@Param('id') id: string) {
    return this.svc.unlinkSurvey(id);
  }

  @Patch(':id/execution-checklist')
  @ApiOperation({ summary: 'Update execution stage checklist items' })
  updateExecutionChecklist(@Param('id') id: string, @Body() body: any) {
    return this.svc.updateExecutionChecklist(id, body);
  }

  @Patch(':id/root-cause-checklist')
  @ApiOperation({ summary: 'Update root cause stage checklist items' })
  updateRootCauseChecklist(@Param('id') id: string, @Body() body: any) {
    return this.svc.updateRootCauseChecklist(id, body);
  }

  @Patch(':id/remediation-checklist')
  @ApiOperation({ summary: 'Update remediation stage checklist items' })
  updateRemediationChecklist(@Param('id') id: string, @Body() body: any) {
    return this.svc.updateRemediationChecklist(id, body);
  }

  @Patch(':id/communication-checklist')
  @ApiOperation({ summary: 'Update communication stage checklist items' })
  updateCommunicationChecklist(@Param('id') id: string, @Body() body: any) {
    return this.svc.updateCommunicationChecklist(id, body);
  }

  @Patch(':id/validation-checklist')
  @ApiOperation({ summary: 'Update validation stage checklist items' })
  updateValidationChecklist(@Param('id') id: string, @Body() body: any) {
    return this.svc.updateValidationChecklist(id, body);
  }

  @Post(':id/submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit program for SVP/CNO approval' })
  submit(@Param('id') id: string) {
    return this.svc.submitForApproval(id);
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve program (SVP for global, CNO for hospital-specific)' })
  approve(@Param('id') id: string, @Req() req: any) {
    return this.svc.approve(id, req.user.id, req.user.roles ?? []);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject program with reason' })
  reject(@Param('id') id: string, @Body() body: { reason: string }, @Req() req: any) {
    return this.svc.reject(id, req.user.id, req.user.roles ?? [], body.reason);
  }

  @Post(':id/advance')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Advance program to next stage' })
  advance(@Param('id') id: string) {
    return this.svc.advanceStage(id);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a program (SVP/SUPER_ADMIN only)' })
  cancel(@Param('id') id: string, @Body() body: { reason?: string }) {
    return this.svc.cancel(id, body.reason);
  }

  @Post('ai-enhance')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'AI: enhance/rewrite a free-text field into professional prose' })
  aiEnhance(@Body() body: { text: string; fieldContext: string }) {
    return this.svc.aiEnhanceText(body.text, body.fieldContext);
  }

  @Get(':id/survey-summary')
  @ApiOperation({ summary: 'Get response count, avg score, and 3 lowest questions for the linked survey' })
  surveySummary(@Param('id') id: string) {
    return this.svc.getSurveySummary(id);
  }

  @Post(':id/ai-root-causes')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'AI: suggest root causes based on survey data and program context' })
  aiRootCauses(@Param('id') id: string) {
    return this.svc.aiRootCauses(id);
  }

  @Post(':id/ai-issues')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'AI: suggest issues to create from documented findings' })
  aiIssues(@Param('id') id: string) {
    return this.svc.aiIssues(id);
  }
}
