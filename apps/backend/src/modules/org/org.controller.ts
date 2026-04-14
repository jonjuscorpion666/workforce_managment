import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { OrgService } from './org.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

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
  @UseGuards(RolesGuard)
  @Roles('SVP', 'SUPER_ADMIN')
  update(@Param('id') id: string, @Body() body: any) {
    return this.orgService.update(id, body);
  }

  @Delete('units/:id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Delete org unit (SUPER_ADMIN only — must have no children)' })
  delete(@Param('id') id: string) {
    return this.orgService.delete(id);
  }

  @Post('integration/hr-sync')
  @ApiOperation({ summary: 'Sync org structure from HR system' })
  hrSync(@Body() body: any) {
    return this.orgService.hrSync(body);
  }
}
