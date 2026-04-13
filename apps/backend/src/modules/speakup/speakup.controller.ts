import {
  Controller, Get, Post, Param, Body, Query, Req, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { SpeakUpService } from './speakup.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtGuard } from '../../common/guards/optional-jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

// Roles allowed to view and act on speak-up cases (all leadership + HR)
const CASE_MANAGERS = ['SUPER_ADMIN', 'SVP', 'CNO', 'VP', 'DIRECTOR', 'MANAGER', 'HR_ANALYST'];

@ApiTags('Speak Up')
@Controller('speak-up')
export class SpeakUpController {
  constructor(private readonly svc: SpeakUpService) {}

  // ── Submission (optional auth — anonymous portal users OR identified staff) ─

  @Post('cases')
  @UseGuards(OptionalJwtGuard)
  @ApiOperation({ summary: 'Submit a Speak Up case (anonymous or identified)' })
  submit(@Body() body: any, @Req() req: any) {
    return this.svc.submit(body, req.user?.id);
  }

  // ── Leadership view (JWT + role required) ────────────────────────────────

  @Get('cases')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...CASE_MANAGERS)
  @ApiOperation({ summary: 'List cases (filter: status, urgency, category, routedTo, orgUnitId, hospitalId)' })
  @ApiQuery({ name: 'status',     required: false })
  @ApiQuery({ name: 'urgency',    required: false })
  @ApiQuery({ name: 'category',   required: false })
  @ApiQuery({ name: 'routedTo',   required: false })
  @ApiQuery({ name: 'orgUnitId',  required: false })
  @ApiQuery({ name: 'hospitalId', required: false })
  findAll(@Query() query: any) {
    return this.svc.findAll(query);
  }

  @Get('metrics')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...CASE_MANAGERS)
  @ApiOperation({ summary: 'Aggregate metrics for dashboard' })
  getMetrics() {
    return this.svc.getMetrics();
  }

  @Get('cases/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...CASE_MANAGERS)
  @ApiOperation({ summary: 'Get case detail with activity timeline' })
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  // ── Status actions (leadership only) ─────────────────────────────────────

  @Post('cases/:id/acknowledge')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...CASE_MANAGERS)
  @ApiOperation({ summary: 'Acknowledge — NEW → ACKNOWLEDGED' })
  acknowledge(@Param('id') id: string, @Req() req: any) {
    return this.svc.acknowledge(id, req.user.id);
  }

  @Post('cases/:id/schedule')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...CASE_MANAGERS)
  @ApiOperation({ summary: 'Schedule meeting — → SCHEDULED' })
  scheduleMeeting(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.svc.scheduleMeeting(id, body, req.user.id);
  }

  @Post('cases/:id/outcome')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...CASE_MANAGERS)
  @ApiOperation({ summary: 'Record meeting outcome (required before resolve)' })
  recordOutcome(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.svc.recordOutcome(id, body, req.user.id);
  }

  @Post('cases/:id/resolve')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...CASE_MANAGERS)
  @ApiOperation({ summary: 'Resolve — outcome must be recorded first' })
  resolve(@Param('id') id: string, @Req() req: any) {
    return this.svc.resolve(id, req.user.id);
  }

  @Post('cases/:id/escalate')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...CASE_MANAGERS)
  @ApiOperation({ summary: 'Escalate to senior leadership' })
  escalate(@Param('id') id: string, @Req() req: any) {
    return this.svc.escalate(id, req.user.id);
  }

  @Post('cases/:id/notes')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...CASE_MANAGERS)
  @ApiOperation({ summary: 'Add a note to the activity timeline' })
  addNote(@Param('id') id: string, @Body() body: { content: string }, @Req() req: any) {
    return this.svc.addNote(id, body.content, req.user.id);
  }

  @Post('cases/:id/convert-to-issue')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...CASE_MANAGERS)
  @ApiOperation({ summary: 'Convert case to a tracked Issue' })
  convertToIssue(@Param('id') id: string, @Req() req: any) {
    return this.svc.convertToIssue(id, req.user.id);
  }
}
