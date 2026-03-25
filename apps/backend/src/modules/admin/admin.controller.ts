import { Controller, Get, Post, Patch, Param, Body, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly svc: AdminService) {}

  @Post('config')
  @ApiOperation({ summary: 'Set platform config value' })
  setConfig(@Body() body: any, @Req() req: any) { return this.svc.setConfig(body, req.user.id); }

  @Get('config')
  @ApiOperation({ summary: 'Get all config values' })
  getConfig() { return this.svc.getAllConfig(); }

  @Get('config/:key')
  getConfigByKey(@Param('key') key: string) { return this.svc.getConfig(key); }

  @Get('roles')
  @ApiOperation({ summary: 'List all roles' })
  getRoles() { return this.svc.getRoles(); }

  @Post('roles')
  createRole(@Body() body: any) { return this.svc.createRole(body); }

  @Get('users')
  @ApiOperation({ summary: 'List all users' })
  getUsers() { return this.svc.getUsers(); }

  @Post('users')
  @ApiOperation({ summary: 'Create a new user with role and org unit assignment' })
  createUser(@Body() body: any) { return this.svc.createUser(body); }

  @Post('users/bulk')
  @ApiOperation({ summary: 'Bulk create users from CSV rows' })
  bulkCreateUsers(@Body() body: { rows: any[] }) { return this.svc.bulkCreateUsers(body.rows); }

  @Patch('users/:id')
  @ApiOperation({ summary: 'Update user role, org unit, or profile fields' })
  updateUser(@Param('id') id: string, @Body() body: any) { return this.svc.updateUser(id, body); }
}
