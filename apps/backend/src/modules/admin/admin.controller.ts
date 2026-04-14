import {
  Controller, Get, Post, Patch, Delete, Param, Body, Req, Query,
  UseGuards, BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

// Roles that may read / browse the admin panel
const ADMIN_READ  = ['SVP', 'SUPER_ADMIN', 'CNO', 'DIRECTOR', 'MANAGER'] as const;
// Roles that may create or modify users
const ADMIN_WRITE = ['SVP', 'SUPER_ADMIN', 'CNO'] as const;
// Roles that may perform high-risk bulk / role / config operations
const ADMIN_SUPER = ['SVP', 'SUPER_ADMIN'] as const;

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly svc: AdminService) {}

  // ── Platform config ──────────────────────────────────────────────────────

  @Post('config')
  @Roles(...ADMIN_SUPER)
  @ApiOperation({ summary: 'Set platform config value' })
  setConfig(@Body() body: any, @Req() req: any) {
    return this.svc.setConfig(body, req.user.id);
  }

  @Get('config')
  @Roles(...ADMIN_SUPER)
  @ApiOperation({ summary: 'Get all config values' })
  getConfig() {
    return this.svc.getAllConfig();
  }

  @Get('config/:key')
  @Roles(...ADMIN_SUPER)
  getConfigByKey(@Param('key') key: string) {
    return this.svc.getConfig(key);
  }

  // ── Roles ────────────────────────────────────────────────────────────────

  @Get('roles')
  @Roles(...ADMIN_WRITE)
  @ApiOperation({ summary: 'List all roles' })
  getRoles() { return this.svc.getRoles(); }

  @Post('roles')
  @Roles(...ADMIN_SUPER)
  @ApiOperation({ summary: 'Create a new role (SVP / SUPER_ADMIN only)' })
  createRole(@Body() body: any) { return this.svc.createRole(body); }

  @Patch('roles/:id')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Rename a role (SUPER_ADMIN only)' })
  updateRole(@Param('id') id: string, @Body() body: any) { return this.svc.updateRole(id, body); }

  @Delete('roles/:id')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Delete a role (SUPER_ADMIN only — role must have no users)' })
  deleteRole(@Param('id') id: string) { return this.svc.deleteRole(id); }

  // ── Users ────────────────────────────────────────────────────────────────

  @Get('users/search')
  @Roles(...ADMIN_READ)
  @ApiOperation({ summary: 'Typeahead search for manager assignment' })
  searchUsers(@Query('q') q = '', @Query('roles') roles = '') {
    const roleList = roles ? roles.split(',').filter(Boolean) : [];
    return this.svc.searchManagers(q, roleList);
  }

  @Get('users')
  @Roles(...ADMIN_READ)
  @ApiOperation({ summary: 'List users with server-side pagination, search, and filtering' })
  getUsers(
    @Query('page')   page   = '1',
    @Query('limit')  limit  = '50',
    @Query('search') search = '',
    @Query('role')   role   = '',
    @Query('status') status = '',
  ) {
    return this.svc.getUsersPaginated({
      page:   parseInt(page,  10) || 1,
      limit:  parseInt(limit, 10) || 50,
      search: search  || undefined,
      role:   role    || undefined,
      status: status  || undefined,
    });
  }

  @Post('users')
  @Roles(...ADMIN_WRITE)
  @ApiOperation({ summary: 'Create a new user with role and org unit assignment' })
  createUser(@Body() body: any) { return this.svc.createUser(body); }

  @Post('users/bulk')
  @Roles(...ADMIN_SUPER)
  @ApiOperation({ summary: 'Bulk create users from CSV rows (max 500 per request)' })
  bulkCreateUsers(@Body() body: { rows: any[] }) {
    if (!Array.isArray(body?.rows) || body.rows.length === 0) {
      throw new BadRequestException('rows must be a non-empty array');
    }
    if (body.rows.length > 500) {
      throw new BadRequestException('Bulk import is limited to 500 rows per request');
    }
    return this.svc.bulkCreateUsers(body.rows);
  }

  @Patch('users/:id')
  @Roles(...ADMIN_WRITE)
  @ApiOperation({ summary: 'Update user role, org unit, or profile fields' })
  updateUser(@Param('id') id: string, @Body() body: any) { return this.svc.updateUser(id, body); }
}
