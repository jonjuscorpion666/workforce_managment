import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query, Req, Header, UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PatientFeedbackService } from './patient-feedback.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

// Per the access rule: only SVP, CNO and SUPER_ADMIN may use the module.
// SVP/SUPER_ADMIN see all hospitals; CNO sees only their own (enforced in the
// service via resolveScope).
const FEEDBACK_MANAGERS = ['SUPER_ADMIN', 'SVP', 'CNO'] as const;

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

  @Get('scope')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...FEEDBACK_MANAGERS)
  @ApiOperation({ summary: 'What the current user may see (all hospitals vs one)' })
  getScope(@Req() req: any) {
    return this.service.getScope(req.user);
  }

  @Get('locations')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...FEEDBACK_MANAGERS)
  listLocations(@Query() query: any, @Req() req: any) {
    return this.service.listLocations(query, req.user);
  }

  @Post('locations')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...FEEDBACK_MANAGERS)
  createLocation(@Body() body: any, @Req() req: any) {
    return this.service.createLocation(body, req.user);
  }

  @Post('locations/bulk')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...FEEDBACK_MANAGERS)
  @ApiOperation({ summary: 'Bulk-generate bed locations for a ward' })
  bulkCreate(@Body() body: any, @Req() req: any) {
    return this.service.bulkCreateLocations(body, req.user);
  }

  @Patch('locations/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...FEEDBACK_MANAGERS)
  updateLocation(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.service.updateLocation(id, body, req.user);
  }

  @Delete('locations/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...FEEDBACK_MANAGERS)
  deleteLocation(@Param('id') id: string, @Req() req: any) {
    return this.service.deleteLocation(id, req.user);
  }

  // ── Admin: units (level between hospital and room) ─────────────────────────

  @Get('units')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...FEEDBACK_MANAGERS)
  listUnits(@Query() query: any, @Req() req: any) {
    return this.service.listUnits(query, req.user);
  }

  @Post('units')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...FEEDBACK_MANAGERS)
  createUnit(@Body() body: any, @Req() req: any) {
    return this.service.createUnit(body, req.user);
  }

  @Patch('units/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...FEEDBACK_MANAGERS)
  updateUnit(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.service.updateUnit(id, body, req.user);
  }

  @Delete('units/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...FEEDBACK_MANAGERS)
  deleteUnit(@Param('id') id: string, @Req() req: any) {
    return this.service.deleteUnit(id, req.user);
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
  dashboard(@Query() query: any, @Req() req: any) {
    return this.service.dashboard(query, req.user);
  }
}
