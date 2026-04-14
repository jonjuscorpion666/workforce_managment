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
}
