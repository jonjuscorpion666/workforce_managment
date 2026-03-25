import {
  Controller, Get, Post, Patch, Param, Body, Query, Req, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AnnouncementsService } from './announcements.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Announcements')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('announcements')
export class AnnouncementsController {
  constructor(private readonly svc: AnnouncementsService) {}

  // ── Authoring ──────────────────────────────────────────────────────────────

  @Post()
  @ApiOperation({ summary: 'Create announcement (draft or scheduled)' })
  create(@Body() body: any, @Req() req: any) {
    const role = req.user.roles?.[0] ?? undefined;
    return this.svc.create(body, req.user.id, role);
  }

  @Get()
  @ApiOperation({ summary: 'List all announcements (admin/author view)' })
  findAll(@Query() q: any) {
    return this.svc.findAll(q);
  }

  @Get('feed')
  @ApiOperation({ summary: 'Personalized announcement feed for logged-in user' })
  getFeed(@Req() req: any) {
    return this.svc.getFeed(req.user.id, req.user.roles ?? []);
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Leadership dashboard metrics' })
  getDashboard() {
    return this.svc.getDashboardMetrics();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get announcement detail' })
  findOne(@Param('id') id: string) {
    return this.svc.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update draft/scheduled announcement' })
  update(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.svc.update(id, body, req.user.id);
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publish announcement immediately' })
  publish(@Param('id') id: string, @Req() req: any) {
    return this.svc.publish(id, req.user.id);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel announcement' })
  cancel(@Param('id') id: string, @Req() req: any) {
    return this.svc.cancel(id, req.user.id);
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive announcement' })
  archive(@Param('id') id: string, @Req() req: any) {
    return this.svc.archive(id, req.user.id);
  }

  // ── Read & Acknowledge ─────────────────────────────────────────────────────

  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark announcement as read' })
  markRead(@Param('id') id: string, @Req() req: any) {
    return this.svc.markRead(id, req.user.id);
  }

  @Post(':id/acknowledge')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Acknowledge mandatory announcement' })
  acknowledge(@Param('id') id: string, @Req() req: any) {
    return this.svc.acknowledge(id, req.user.id);
  }

  // ── Metrics ────────────────────────────────────────────────────────────────

  @Get(':id/metrics')
  @ApiOperation({ summary: 'Read/ack metrics for a specific announcement' })
  getMetrics(@Param('id') id: string) {
    return this.svc.getMetrics(id);
  }
}
