import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { hashToken } from '@core/utils/crypt.util';
import { AccessTokenStatus, InterviewAccessToken } from '../entities';
import { CandidateSessionContext } from '../types/candidate-session-context.type';

/**
 * Resolves the raw token in the `:token` route param to an interview — the sole
 * auth mechanism for the candidate portal (no JWT, no account). A token that's
 * REVOKED or past its expiry is hard-rejected here; a USED token is still let
 * through so `getSession` can report "already submitted" rather than a dead link.
 */
@Injectable()
export class CandidateInterviewGuard implements CanActivate {
  constructor(
    @InjectRepository(InterviewAccessToken)
    private readonly tokensRepository: Repository<InterviewAccessToken>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<{ params: Record<string, string>; candidateSession?: CandidateSessionContext }>();
    const rawToken = request.params.token;
    if (!rawToken) throw new NotFoundException('This interview link is invalid');

    const tokenEntity = await this.tokensRepository.findOne({
      where: { tokenHash: hashToken(rawToken) },
    });
    if (!tokenEntity) throw new NotFoundException('This interview link is invalid');
    if (tokenEntity.status === AccessTokenStatus.REVOKED) {
      throw new ForbiddenException('This interview link is no longer valid');
    }
    if (tokenEntity.expiresAt < new Date()) {
      throw new ForbiddenException('This interview link has expired');
    }

    request.candidateSession = {
      interviewId: tokenEntity.interviewId,
      candidateId: tokenEntity.candidateId,
      organizationId: tokenEntity.organizationId,
      tokenId: tokenEntity.id,
    };
    return true;
  }
}
