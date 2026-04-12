import { Controller, Get, Post, Patch, Delete, Param, Body, Query, Req, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Tasks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'SVP', 'CNP', 'VP', 'DIRECTOR', 'MANAGER')
  @ApiOperation({ summary: 'Create task (linked to an issue)' })
  create(@Body() body: any, @Req() req: any) {
    return this.tasksService.create(body, req.user.id);
  }

  @Get()
  @ApiQuery({ name: 'owner', required: false })
  @ApiQuery({ name: 'assignedTo', required: false })
  @ApiQuery({ name: 'issueId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'orgUnitId',    required: false })
  @ApiQuery({ name: 'hospitalId',   required: false })
  @ApiQuery({ name: 'departmentId', required: false })
  findAll(@Query() query: any) {
    return this.tasksService.findAll(query);
  }

  @Get('overdue')
  @ApiOperation({ summary: 'Get all overdue tasks' })
  getOverdue() {
    return this.tasksService.getOverdue();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tasksService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.tasksService.update(id, body, req.user.id);
  }

  @Get(':id/subtasks')
  @ApiOperation({ summary: 'Get child tasks' })
  getSubtasks(@Param('id') id: string) {
    return this.tasksService.getSubtasks(id);
  }

  @Post('bulk-delete')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Bulk soft-delete tasks (SUPER_ADMIN only)' })
  bulkDelete(@Body() body: { ids: string[] }) {
    return this.tasksService.bulkSoftDelete(body.ids);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'SVP', 'CNP', 'VP', 'DIRECTOR', 'MANAGER')
  @ApiOperation({ summary: 'Delete a task and its comments/subtasks' })
  delete(@Param('id') id: string) {
    return this.tasksService.delete(id);
  }

  @Get(':id/comments')
  @ApiOperation({ summary: 'Get comments on a task' })
  getComments(@Param('id') id: string) {
    return this.tasksService.getComments(id);
  }

  @Post(':id/comments')
  @ApiOperation({ summary: 'Add a comment to a task' })
  addComment(@Param('id') id: string, @Body() body: { content: string }, @Req() req: any) {
    return this.tasksService.addComment(id, body.content, req.user.id);
  }

  @Delete(':id/comments/:commentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a comment (author only)' })
  deleteComment(@Param('id') id: string, @Param('commentId') commentId: string, @Req() req: any) {
    return this.tasksService.deleteComment(id, commentId, req.user.id);
  }
}
