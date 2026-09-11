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
import { CandidatesService } from './candidates.service';
import {
  CreateCandidateDto,
  CreateNoteDto,
  ListCandidatesQueryDto,
  UpdateCandidateDto,
  UpdateStageDto,
} from './dto';

@ApiTags('Candidates')
@ApiBearerAuth()
@UseGuards(OrgAuthGuard)
@UseInterceptors(TransformInterceptor)
@Controller('candidates')
export class CandidatesController {
  constructor(private readonly candidatesService: CandidatesService) {}

  @Post()
  create(@CurrentOrgUser() user: AuthenticatedOrgUser, @Body() dto: CreateCandidateDto) {
    return this.candidatesService.create(user.organizationId, dto);
  }

  @Get()
  findAll(@CurrentOrgUser() user: AuthenticatedOrgUser, @Query() query: ListCandidatesQueryDto) {
    return this.candidatesService.findAll(user.organizationId, query);
  }

  @Get(':id')
  findOne(@CurrentOrgUser() user: AuthenticatedOrgUser, @Param('id') id: string) {
    return this.candidatesService.findOne(user.organizationId, id);
  }

  @Patch(':id')
  update(
    @CurrentOrgUser() user: AuthenticatedOrgUser,
    @Param('id') id: string,
    @Body() dto: UpdateCandidateDto,
  ) {
    return this.candidatesService.update(user.organizationId, id, dto);
  }

  @Patch(':id/stage')
  updateStage(
    @CurrentOrgUser() user: AuthenticatedOrgUser,
    @Param('id') id: string,
    @Body() dto: UpdateStageDto,
  ) {
    return this.candidatesService.updateStage(user.organizationId, id, dto.stage, dto.rejectReason);
  }

  @Post(':id/notes')
  addNote(
    @CurrentOrgUser() user: AuthenticatedOrgUser,
    @Param('id') id: string,
    @Body() dto: CreateNoteDto,
  ) {
    return this.candidatesService.addNote(user.organizationId, id, user.uid, dto);
  }

  @Delete(':id')
  remove(@CurrentOrgUser() user: AuthenticatedOrgUser, @Param('id') id: string) {
    return this.candidatesService.remove(user.organizationId, id);
  }
}
