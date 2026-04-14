import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { EscalationsService } from './escalations.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

const ESCALATION_MANAGERS = ['SUPER_ADMIN', 'SVP', 'CNO', 'VP', 'DIRECTOR', 'MANAGER', 'HR_ANALYST'] as const;

@ApiTags('Escalations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(...ESCALATION_MANAGERS)
@Controller('escalations')
export class EscalationsController {
  constructor(private readonly escalationsService: EscalationsService) {}

  @Post('trigger')
  @ApiOperation({ summary: 'Manually trigger an escalation' })
  trigger(@Body() body: any) {
    return this.escalationsService.trigger(body);
  }

  @Get()
  @ApiOperation({ summary: 'List escalations with optional filters' })
  findAll(
    @Query('status')     status?: string,
    @Query('reason')     reason?: string,
    @Query('entityType') entityType?: string,
  ) {
    return this.escalationsService.findAll({ status, reason, entityType });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.escalationsService.findOne(id);
  }

  @Patch(':id/acknowledge')
  @ApiOperation({ summary: 'Mark escalation as acknowledged' })
  acknowledge(@Param('id') id: string) {
    return this.escalationsService.acknowledge(id);
  }

  @Patch(':id/resolve')
  @ApiOperation({ summary: 'Mark escalation as resolved' })
  resolve(@Param('id') id: string) {
    return this.escalationsService.resolve(id);
  }

  @Patch(':id/reassign')
  @ApiOperation({ summary: 'Reassign escalation to another user, optionally bump level' })
  reassign(@Param('id') id: string, @Body() body: { escalatedToId: string; level?: number }) {
    return this.escalationsService.reassign(id, body);
  }
}
