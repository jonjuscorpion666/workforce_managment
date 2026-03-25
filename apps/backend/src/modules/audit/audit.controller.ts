import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'Get raw audit logs (compliance table view)' })
  @ApiQuery({ name: 'entityType',    required: false })
  @ApiQuery({ name: 'action',        required: false })
  @ApiQuery({ name: 'performedById', required: false })
  getAll(@Query() query: any) {
    return this.auditService.getAll(query);
  }

  // Must be defined BEFORE /:entityId to avoid route collision
  @Get('feed')
  @ApiOperation({ summary: 'Enriched activity feed with user names, entity titles and change diffs' })
  @ApiQuery({ name: 'entityType', required: false })
  @ApiQuery({ name: 'action',     required: false })
  @ApiQuery({ name: 'userId',     required: false })
  @ApiQuery({ name: 'dateFrom',   required: false })
  @ApiQuery({ name: 'dateTo',     required: false })
  @ApiQuery({ name: 'limit',      required: false })
  @ApiQuery({ name: 'offset',     required: false })
  getActivityFeed(@Query() query: any) {
    return this.auditService.getActivityFeed(query);
  }

  @Get(':entityId')
  @ApiOperation({ summary: 'Get audit trail for a specific entity' })
  getByEntity(@Param('entityId') entityId: string) {
    return this.auditService.getByEntity(entityId);
  }
}
