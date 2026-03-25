import { Controller, Get, Post, Body, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ResponsesService } from './responses.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtGuard } from '../../common/guards/optional-jwt.guard';

@ApiTags('Responses')
@Controller('responses')
export class ResponsesController {
  constructor(private readonly responsesService: ResponsesService) {}

  @Post('submit')
  @UseGuards(OptionalJwtGuard)
  @ApiOperation({ summary: 'Submit survey response — attaches org context when authenticated' })
  submit(@Body() body: any, @Req() req: any) {
    return this.responsesService.submit(body, req);
  }

  @Get()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'List responses (admin/analyst only)' })
  findAll(@Query() query: any) {
    return this.responsesService.findAll(query);
  }

  @Get('participation/status')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  getParticipationStatus(@Query('surveyId') surveyId: string) {
    return this.responsesService.getParticipationStatus(surveyId);
  }
}
