import { Body, Controller, Get, Param, Post, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TransformInterceptor } from '@core/dispatchers';
import { CompleteQuestionDto, GetUploadUrlDto } from './dto';
import { CurrentCandidateSession } from './decorators/current-candidate-session.decorator';
import { CandidateInterviewGuard } from './guards/candidate-interview.guard';
import { InterviewSessionService } from './interview-session.service';
import { CandidateSessionContext } from './types/candidate-session-context.type';

/**
 * Candidate portal — no JWT, no account. Auth is entirely the opaque `:token` in the
 * URL, resolved by CandidateInterviewGuard. Every handler acts only on the interview
 * that guard resolves; no interview/candidate id is ever taken from the client.
 */
@ApiTags('Interview session (candidate portal)')
@UseGuards(CandidateInterviewGuard)
@UseInterceptors(TransformInterceptor)
@Controller('interview-session/:token')
export class InterviewSessionController {
  constructor(private readonly interviewSessionService: InterviewSessionService) {}

  @Get()
  getSession(@CurrentCandidateSession() session: CandidateSessionContext) {
    return this.interviewSessionService.getSession(session);
  }

  @Post('questions/:questionId/upload-url')
  getUploadUrl(
    @CurrentCandidateSession() session: CandidateSessionContext,
    @Param('questionId') questionId: string,
    @Body() dto: GetUploadUrlDto,
  ) {
    return this.interviewSessionService.getUploadUrl(session, questionId, dto.mimeType);
  }

  @Post('questions/:questionId/complete')
  completeQuestion(
    @CurrentCandidateSession() session: CandidateSessionContext,
    @Param('questionId') questionId: string,
    @Body() dto: CompleteQuestionDto,
  ) {
    return this.interviewSessionService.completeQuestion(session, questionId, dto);
  }

  @Post('submit')
  submit(@CurrentCandidateSession() session: CandidateSessionContext) {
    return this.interviewSessionService.submit(session);
  }
}
