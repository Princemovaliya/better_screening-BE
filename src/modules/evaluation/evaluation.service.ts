import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { LlmService } from '@core/llm';
import { ActivityService, ActivityType } from '@module/activity';
import { Candidate } from '@module/candidates/entities';
import { Interview, InterviewStatus } from '@module/interviews/entities';
import { NotificationsService, NotificationType } from '@module/notifications';
import { OrganizationSettings } from '@module/organizations/entities';
import { InterviewTranscript } from '@module/transcript-ingestion/entities';
import { EvaluationRecommendation, InterviewQuestionAnalysis, InterviewSummary } from './entities';
import { EvaluationLlmResult } from './types/evaluation-llm-result.type';

const RECOMMENDATION_VALUES = new Set(Object.values(EvaluationRecommendation));
const COMPETENCY_KEYS = [
  'technicalSkills',
  'problemSolving',
  'communication',
  'culturalFit',
  'experienceRelevance',
] as const;

interface PromptQuestion {
  questionId: string;
  questionText: string;
  transcriptText: string;
}

export type EvaluationStatus =
  'not_submitted' | 'transcribing' | 'transcription_failed' | 'evaluating' | 'completed';

export interface EvaluationView {
  status: EvaluationStatus;
  summary?: InterviewSummary;
  questionAnalyses?: InterviewQuestionAnalysis[];
}

/**
 * Owns the actual evaluation logic — the resume × job description × transcript
 * analysis. This is entirely our own LLM call, never the STT vendor's. Consumed by
 * `EvaluationProcessingProcessor` off the internal `evaluation-processing` queue, and
 * re-triggerable via `InterviewsService.retryEvaluation`.
 */
@Injectable()
export class EvaluationService {
  private readonly logger = new Logger(EvaluationService.name);

  constructor(
    @InjectRepository(Interview)
    private readonly interviewsRepository: Repository<Interview>,
    @InjectRepository(InterviewTranscript)
    private readonly transcriptsRepository: Repository<InterviewTranscript>,
    @InjectRepository(InterviewSummary)
    private readonly summariesRepository: Repository<InterviewSummary>,
    @InjectRepository(InterviewQuestionAnalysis)
    private readonly analysesRepository: Repository<InterviewQuestionAnalysis>,
    @InjectRepository(OrganizationSettings)
    private readonly organizationSettingsRepository: Repository<OrganizationSettings>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly llmService: LlmService,
    private readonly activityService: ActivityService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async evaluate(interviewId: string): Promise<void> {
    const existing = await this.summariesRepository.findOne({ where: { interviewId } });
    if (existing) {
      this.logger.log(
        `Evaluation for interview ${interviewId} already exists — skipping (idempotent)`,
      );
      return;
    }

    const interview = await this.interviewsRepository.findOne({
      where: { id: interviewId },
      relations: { candidate: true, job: { skills: true }, questions: true },
      order: { questions: { orderIndex: 'ASC' } },
    });
    if (!interview) {
      this.logger.error(`evaluate: interview ${interviewId} not found — skipping (not retryable)`);
      return;
    }

    const transcript = await this.transcriptsRepository.findOne({ where: { interviewId } });
    if (!transcript || transcript.failureReason) {
      this.logger.error(
        `evaluate: interview ${interviewId} has no usable transcript yet — skipping ` +
          `(re-run once transcription succeeds, e.g. via retry-evaluation)`,
      );
      return;
    }

    const transcriptByQuestionId = new Map(
      transcript.perQuestion.map((p) => [p.questionId, p.transcriptText]),
    );
    const questions: PromptQuestion[] = (interview.questions ?? []).map((q) => ({
      questionId: q.id,
      questionText: q.questionText,
      transcriptText:
        transcriptByQuestionId.get(q.id) ?? '(candidate did not answer this question)',
    }));

    const { system, prompt } = this.buildPrompt(interview, questions);
    const result = await this.llmService.completeJson<EvaluationLlmResult>({ system, prompt }, () =>
      this.mockResult(questions),
    );
    this.validate(
      result,
      questions.map((q) => q.questionId),
    );

    await this.dataSource.transaction(async (manager) => {
      await manager.save(
        manager.create(InterviewSummary, {
          organizationId: interview.organizationId,
          interviewId: interview.id,
          overallScore: result.overallScore,
          recommendation: result.recommendation as EvaluationRecommendation,
          strengths: result.strengths,
          weaknesses: result.weaknesses,
          observations: result.observations,
          communicationNote: result.communicationNote,
          competencyScores: result.competencyScores,
          rawLlmResponse: result,
        }),
      );
      await manager.save(
        result.perQuestion.map((pq) =>
          manager.create(InterviewQuestionAnalysis, {
            organizationId: interview.organizationId,
            interviewId: interview.id,
            interviewQuestionId: pq.questionId,
            score: pq.score,
            feedback: pq.feedback,
          }),
        ),
      );
      await manager.update(
        Interview,
        { id: interview.id },
        { status: InterviewStatus.COMPLETED, overallScore: result.overallScore },
      );
      await manager.update(
        Candidate,
        { id: interview.candidateId, organizationId: interview.organizationId },
        { overallScore: result.overallScore },
      );
    });

    this.logger.log(
      `Persisted evaluation for interview ${interview.id} (score ${result.overallScore})`,
    );

    await this.activityService.log({
      organizationId: interview.organizationId,
      type: ActivityType.EVALUATION_COMPLETED,
      message: `AI evaluation ready for ${interview.candidate?.name ?? 'a candidate'} — ${interview.roundName} (score ${result.overallScore})`,
    });

    if (interview.createdByUserId) {
      const settings = await this.organizationSettingsRepository.findOne({
        where: { organizationId: interview.organizationId },
      });
      if (settings?.notifyOnEvaluationReady !== false) {
        await this.notificationsService.create({
          organizationId: interview.organizationId,
          userId: interview.createdByUserId,
          type: NotificationType.EVALUATION_READY,
          title: 'AI evaluation ready',
          body: `${interview.candidate?.name ?? 'A candidate'}'s ${interview.roundName} scored ${result.overallScore}/100.`,
          link: `/app/interviews/${interview.id}`,
        });
      }
    }
  }

  private buildPrompt(
    interview: Interview,
    questions: PromptQuestion[],
  ): { system: string; prompt: string } {
    const job = interview.job;
    const skillsList =
      (job?.skills ?? [])
        .map((s) => `- ${s.name} (${s.level}, ${s.importance} priority)`)
        .join('\n') || '(none listed)';

    const system = `You are an expert technical interviewer and recruiter assistant. You will be given a job's description and required skills, a candidate's resume, and the transcript of their answers to a set of interview questions. Evaluate the candidate's fit for the role based ONLY on this material — do not invent facts not present in the input.

Respond with ONLY a single JSON object (no markdown fences, no commentary before or after) matching exactly this shape:
{
  "overallScore": <integer 0-100>,
  "recommendation": "strong_hire" | "hire" | "no_hire" | "strong_no_hire",
  "strengths": [<string>, ...],
  "weaknesses": [<string>, ...],
  "observations": <string, 2-4 sentences>,
  "communicationNote": <string, 1-2 sentences on communication clarity/style>,
  "competencyScores": { "technicalSkills": <0-100>, "problemSolving": <0-100>, "communication": <0-100>, "culturalFit": <0-100>, "experienceRelevance": <0-100> },
  "perQuestion": [ { "questionId": <string, copied exactly from the id given below>, "score": <0-100>, "feedback": <string, 1-2 sentences> }, ... exactly one entry per question given below, no more, no fewer ]
}`;

    const prompt = `## Job
Title: ${job?.title ?? 'Unknown role'}
Department: ${job?.department ?? ''}
Description: ${job?.description || '(none provided)'}
Required skills:
${skillsList}

## Interview round
${interview.roundName}

## Candidate resume
${interview.candidate?.resumeText || '(no resume text on file)'}

## Interview transcript (per question)
${questions
  .map(
    (q) =>
      `### Question (id: ${q.questionId})\n${q.questionText}\n\nCandidate's answer (transcribed):\n${q.transcriptText}`,
  )
  .join('\n\n')}
`;

    return { system, prompt };
  }

  private validate(result: EvaluationLlmResult, expectedQuestionIds: string[]): void {
    const fail = (msg: string): never => {
      throw new Error(`LLM evaluation response failed validation: ${msg}`);
    };
    if (
      typeof result.overallScore !== 'number' ||
      result.overallScore < 0 ||
      result.overallScore > 100
    ) {
      fail('overallScore must be a number between 0 and 100');
    }
    if (!RECOMMENDATION_VALUES.has(result.recommendation as EvaluationRecommendation)) {
      fail(`recommendation must be one of ${[...RECOMMENDATION_VALUES].join(', ')}`);
    }
    if (!Array.isArray(result.strengths) || !Array.isArray(result.weaknesses)) {
      fail('strengths/weaknesses must be arrays');
    }
    if (typeof result.observations !== 'string' || typeof result.communicationNote !== 'string') {
      fail('observations/communicationNote must be strings');
    }
    for (const key of COMPETENCY_KEYS) {
      const v = result.competencyScores?.[key];
      if (typeof v !== 'number' || v < 0 || v > 100) {
        fail(`competencyScores.${key} must be a number between 0 and 100`);
      }
    }
    if (!Array.isArray(result.perQuestion)) fail('perQuestion must be an array');
    const gotIds = new Set(result.perQuestion.map((p) => p.questionId));
    for (const id of expectedQuestionIds) {
      if (!gotIds.has(id)) fail(`perQuestion is missing an entry for question ${id}`);
    }
    for (const pq of result.perQuestion) {
      if (typeof pq.score !== 'number' || pq.score < 0 || pq.score > 100) {
        fail(`perQuestion score for ${pq.questionId} must be a number between 0 and 100`);
      }
      if (typeof pq.feedback !== 'string')
        fail(`perQuestion feedback for ${pq.questionId} must be a string`);
    }
  }

  private mockResult(questions: { questionId: string }[]): EvaluationLlmResult {
    return {
      overallScore: 78,
      recommendation: 'hire',
      strengths: ['Clear, structured communicator', 'Solid grasp of core fundamentals'],
      weaknesses: ['Limited depth on large-scale system design'],
      observations:
        '[mock] Deterministic evaluation generated by LLM_PROVIDER=mock for local development/testing — not a real assessment.',
      communicationNote: 'Answered clearly and at a reasonable pace throughout.',
      competencyScores: {
        technicalSkills: 75,
        problemSolving: 72,
        communication: 82,
        culturalFit: 80,
        experienceRelevance: 70,
      },
      perQuestion: questions.map((q, i) => ({
        questionId: q.questionId,
        score: 70 + (i % 3) * 5,
        feedback: '[mock] Reasonable answer that covered the key points.',
      })),
    };
  }

  // ---- Recruiter-facing read model ----

  async getEvaluationView(organizationId: string, interviewId: string): Promise<EvaluationView> {
    const interview = await this.interviewsRepository.findOne({
      where: { id: interviewId, organizationId },
    });
    if (!interview) throw new NotFoundException('Interview not found');

    const summary = await this.summariesRepository.findOne({ where: { interviewId } });
    if (summary) {
      const questionAnalyses = await this.analysesRepository.find({ where: { interviewId } });
      return { status: 'completed', summary, questionAnalyses };
    }

    if (
      interview.status !== InterviewStatus.PENDING_EVALUATION &&
      interview.status !== InterviewStatus.COMPLETED
    ) {
      return { status: 'not_submitted' };
    }

    const transcript = await this.transcriptsRepository.findOne({ where: { interviewId } });
    if (!transcript) return { status: 'transcribing' };
    if (transcript.failureReason) return { status: 'transcription_failed' };
    return { status: 'evaluating' };
  }
}
