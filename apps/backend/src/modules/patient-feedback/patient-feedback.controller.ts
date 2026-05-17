import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query, Req, Header, UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PatientFeedbackService } from './patient-feedback.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

// Nursing supervisors + quality/management can administer locations & tickets.
const FEEDBACK_MANAGERS = [
  'SUPER_ADMIN', 'SVP', 'CNO', 'VP', 'DIRECTOR', 'MANAGER', 'HR_ANALYST',
] as const;

@ApiTags('Patient Feedback')
@Controller('patient-feedback')
export class PatientFeedbackController {
  constructor(private readonly service: PatientFeedbackService) {}

  // ── Public (anonymous patient/attendant) ──────────────────────────────────

  @Get('form')
  @ApiOperation({ summary: 'Get the inpatient nursing-care form definition (public)' })
  getForm() {
    return this.service.getFormDefinition();
  }

  @Get('resolve/:token')
  @ApiOperation({ summary: 'Resolve a QR token → location + form (public)' })
  resolve(@Param('token') token: string) {
    return this.service.resolveToken(token);
  }

  @Post('submit')
  // Tighter limit than the 10/min global to blunt scripted spam on a public endpoint.
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @ApiOperation({ summary: 'Submit inpatient nursing-care feedback (public, anonymous)' })
  submit(@Body() body: any, @Req() req: any) {
    return this.service.submit(body, req);
  }

  // ── Admin: location master & QR ───────────────────────────────────────────

  @Get('locations')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...FEEDBACK_MANAGERS)
  listLocations(@Query() query: any) {
    return this.service.listLocations(query);
  }

  @Post('locations')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...FEEDBACK_MANAGERS)
  createLocation(@Body() body: any) {
    return this.service.createLocation(body);
  }

  @Post('locations/bulk')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...FEEDBACK_MANAGERS)
  @ApiOperation({ summary: 'Bulk-generate bed locations for a ward' })
  bulkCreate(@Body() body: any) {
    return this.service.bulkCreateLocations(body);
  }

  @Patch('locations/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...FEEDBACK_MANAGERS)
  updateLocation(@Param('id') id: string, @Body() body: any) {
    return this.service.updateLocation(id, body);
  }

  @Delete('locations/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...FEEDBACK_MANAGERS)
  deleteLocation(@Param('id') id: string) {
    return this.service.deleteLocation(id);
  }

  // ── Admin: tickets ────────────────────────────────────────────────────────

  @Get('tickets')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...FEEDBACK_MANAGERS)
  listTickets(@Query() query: any, @Req() req: any) {
    return this.service.listTickets(query, req.user);
  }

  @Get('tickets/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...FEEDBACK_MANAGERS)
  getTicket(@Param('id') id: string) {
    return this.service.getTicket(id);
  }

  @Get('tickets/:id/history')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...FEEDBACK_MANAGERS)
  ticketHistory(@Param('id') id: string) {
    return this.service.getTicketHistory(id);
  }

  @Patch('tickets/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...FEEDBACK_MANAGERS)
  updateTicket(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.service.updateTicket(id, body, req.user);
  }

  // ── Admin: browse all feedback + export ───────────────────────────────────

  @Get('responses')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...FEEDBACK_MANAGERS)
  listResponses(@Query() query: any, @Req() req: any) {
    return this.service.listResponses(query, req.user);
  }

  @Get('responses/export')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...FEEDBACK_MANAGERS)
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="patient-feedback.csv"')
  exportResponses(@Query() query: any, @Req() req: any) {
    return this.service.responsesCsv(query, req.user);
  }

  // ── Admin: dashboards ─────────────────────────────────────────────────────

  @Get('dashboard')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...FEEDBACK_MANAGERS)
  dashboard(@Query() query: any) {
    return this.service.dashboard(query);
  }
}
