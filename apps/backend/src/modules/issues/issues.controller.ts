import { Controller, Get, Post, Patch, Delete, Param, Body, Query, Req, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { IssuesService } from './issues.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Issues')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('issues')
export class IssuesController {
  constructor(private readonly issuesService: IssuesService) {}

  @Post()
  @ApiOperation({ summary: 'Create issue (manual or auto-generated from survey)' })
  create(@Body() body: any, @Req() req: any) {
    return this.issuesService.create(body, req.user.id);
  }

  @Get()
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'orgUnitId', required: false })
  @ApiQuery({ name: 'severity', required: false })
  @ApiQuery({ name: 'ownerId', required: false })
  findAll(@Query() query: any) {
    return this.issuesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.issuesService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.issuesService.update(id, body, req.user.id);
  }

  @Post('bulk-delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk soft-delete issues (SUPER_ADMIN only)' })
  bulkDelete(@Body() body: { ids: string[] }) {
    return this.issuesService.bulkSoftDelete(body.ids);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an issue and all related data' })
  delete(@Param('id') id: string) {
    return this.issuesService.delete(id);
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Get issue change history' })
  getHistory(@Param('id') id: string) {
    return this.issuesService.getHistory(id);
  }

  @Post(':id/validate')
  @ApiOperation({ summary: 'Validate issue closure against survey scores' })
  validate(@Param('id') id: string, @Body() body: any) {
    return this.issuesService.validate(id, body);
  }

  @Post(':id/reopen')
  @ApiOperation({ summary: 'Reopen a closed issue if scores regressed' })
  reopen(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.issuesService.reopen(id, body, req.user.id);
  }

  @Post('auto-create')
  @ApiOperation({ summary: 'Auto-create issues from survey analysis' })
  autoCreate(@Body() body: { surveyId: string }, @Req() req: any) {
    return this.issuesService.autoCreateFromSurvey(body.surveyId, req.user.id);
  }

  @Get(':id/action-plans')
  @ApiOperation({ summary: 'Get all action plans for an issue' })
  getActionPlans(@Param('id') id: string) {
    return this.issuesService.getActionPlans(id);
  }

  @Post(':id/action-plans')
  @ApiOperation({ summary: 'Create an action plan for an issue' })
  createActionPlan(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.issuesService.createActionPlan(id, body, req.user.id);
  }

  @Patch('action-plans/:planId')
  @ApiOperation({ summary: 'Update an action plan' })
  updateActionPlan(@Param('planId') planId: string, @Body() body: any, @Req() req: any) {
    return this.issuesService.updateActionPlan(planId, body, req.user.id);
  }

  @Post('action-plans/:planId/milestones')
  @ApiOperation({ summary: 'Add a milestone to an action plan' })
  addMilestone(@Param('planId') planId: string, @Body() body: any) {
    return this.issuesService.addMilestone(planId, body);
  }

  @Patch('milestones/:milestoneId')
  @ApiOperation({ summary: 'Update a milestone' })
  updateMilestone(@Param('milestoneId') milestoneId: string, @Body() body: any) {
    return this.issuesService.updateMilestone(milestoneId, body);
  }

  @Delete('milestones/:milestoneId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a milestone' })
  deleteMilestone(@Param('milestoneId') milestoneId: string) {
    return this.issuesService.deleteMilestone(milestoneId);
  }
}
