import { Controller, Get, Param, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TransformInterceptor } from '@core/dispatchers';
import { CurrentOrgUser } from '@module/auth/decorators';
import { OrgAuthGuard } from '@module/auth/guards';
import { AuthenticatedOrgUser } from '@module/auth/types/jwt-payload.type';
import { EvaluationService } from './evaluation.service';

@ApiTags('Evaluation')
@ApiBearerAuth()
@UseGuards(OrgAuthGuard)
@UseInterceptors(TransformInterceptor)
@Controller('interviews/:interviewId/evaluation')
export class EvaluationController {
  constructor(private readonly evaluationService: EvaluationService) {}

  @Get()
  get(@CurrentOrgUser() user: AuthenticatedOrgUser, @Param('interviewId') interviewId: string) {
    return this.evaluationService.getEvaluationView(user.organizationId, interviewId);
  }
}
