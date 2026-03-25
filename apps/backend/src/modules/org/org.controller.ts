import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { OrgService } from './org.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Org')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('org')
export class OrgController {
  constructor(private readonly orgService: OrgService) {}

  @Get('tree')
  @ApiOperation({ summary: 'Get full org hierarchy tree' })
  getTree() {
    return this.orgService.getTree();
  }

  @Get('units')
  @ApiOperation({ summary: 'List all org units' })
  findAll() {
    return this.orgService.findAll();
  }

  @Get('units/:id')
  findOne(@Param('id') id: string) {
    return this.orgService.findOne(id);
  }

  @Post('units')
  @ApiOperation({ summary: 'Create org unit' })
  create(@Body() body: any) {
    return this.orgService.create(body);
  }

  @Patch('units/:id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.orgService.update(id, body);
  }

  @Post('integration/hr-sync')
  @ApiOperation({ summary: 'Sync org structure from HR system' })
  hrSync(@Body() body: any) {
    return this.orgService.hrSync(body);
  }
}
