import { Controller, Get, Post, Patch, Param, Body, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { MeetingsService } from './meetings.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Meetings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('meetings')
export class MeetingsController {
  constructor(private readonly meetingsService: MeetingsService) {}
  @Post() create(@Body() body: any, @Req() req: any) { return this.meetingsService.create(body, req.user.id); }
  @Get() findAll(@Query() q: any) { return this.meetingsService.findAll(q); }
  @Get(':id') findOne(@Param('id') id: string) { return this.meetingsService.findOne(id); }
  @Patch(':id') update(@Param('id') id: string, @Body() body: any) { return this.meetingsService.update(id, body); }
  @Post(':id/notes') addNote(@Param('id') id: string, @Body() body: any, @Req() req: any) { return this.meetingsService.addNote(id, body, req.user.id); }
}
