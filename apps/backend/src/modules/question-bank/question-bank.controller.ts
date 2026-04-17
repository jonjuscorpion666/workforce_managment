import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { QuestionBankService } from './question-bank.service';

@ApiTags('Question Bank')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('question-bank')
export class QuestionBankController {
  constructor(private readonly svc: QuestionBankService) {}

  @Get()
  @ApiOperation({ summary: 'List all question bank items (filterable by category/framework)' })
  findAll(@Query() q: any) {
    return this.svc.findAll(q);
  }

  @Post()
  @ApiOperation({ summary: 'Create a question bank item (admin)' })
  create(@Body() body: any) {
    return this.svc.create(body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a question bank item (admin)' })
  update(@Param('id') id: string, @Body() body: any) {
    return this.svc.update(id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a question bank item (admin)' })
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }
}
