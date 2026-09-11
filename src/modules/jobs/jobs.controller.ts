import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TransformInterceptor } from '@core/dispatchers';
import { CurrentOrgUser } from '@module/auth/decorators';
import { OrgAuthGuard } from '@module/auth/guards';
import { AuthenticatedOrgUser } from '@module/auth/types/jwt-payload.type';
import { CreateJobDto, GenerateQuestionsDto, ListJobsQueryDto, UpdateJobDto } from './dto';
import { JobsService } from './jobs.service';

@ApiTags('Jobs')
@ApiBearerAuth()
@UseGuards(OrgAuthGuard)
@UseInterceptors(TransformInterceptor)
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post()
  create(@CurrentOrgUser() user: AuthenticatedOrgUser, @Body() dto: CreateJobDto) {
    return this.jobsService.create(user.organizationId, user.uid, dto);
  }

  @Get()
  findAll(@CurrentOrgUser() user: AuthenticatedOrgUser, @Query() query: ListJobsQueryDto) {
    return this.jobsService.findAll(user.organizationId, query);
  }

  @Get(':id')
  findOne(@CurrentOrgUser() user: AuthenticatedOrgUser, @Param('id') id: string) {
    return this.jobsService.findOne(user.organizationId, id);
  }

  @Patch(':id')
  update(
    @CurrentOrgUser() user: AuthenticatedOrgUser,
    @Param('id') id: string,
    @Body() dto: UpdateJobDto,
  ) {
    return this.jobsService.update(user.organizationId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentOrgUser() user: AuthenticatedOrgUser, @Param('id') id: string) {
    return this.jobsService.remove(user.organizationId, id);
  }

  @Post(':id/rounds/:roundId/questions/generate')
  generateQuestions(
    @CurrentOrgUser() user: AuthenticatedOrgUser,
    @Param('id') id: string,
    @Param('roundId') roundId: string,
    @Body() dto: GenerateQuestionsDto,
  ) {
    return this.jobsService.generateQuestions(user.organizationId, id, roundId, dto);
  }
}
