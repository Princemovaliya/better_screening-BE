import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { CandidateSessionContext } from '../types/candidate-session-context.type';

export const CurrentCandidateSession = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CandidateSessionContext => {
    const request = ctx.switchToHttp().getRequest<{ candidateSession: CandidateSessionContext }>();
    return request.candidateSession;
  },
);
