import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { EscalationsService } from './escalations.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

const ESCALATION_MANAGERS = ['SUPER_ADMIN', 'SVP', 'CNO', 'VP', 'DIRECTOR', 'MANAGER', 'HR_ANALYST'];

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
  findAll() {
    return this.escalationsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.escalationsService.findOne(id);
  }

  @Patch(':id/acknowledge')
  acknowledge(@Param('id') id: string) {
    return this.escalationsService.acknowledge(id);
  }
}
