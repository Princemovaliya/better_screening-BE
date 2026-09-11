import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityService, ActivityType } from '@module/activity';
import { LlmService } from '@core/llm';
import {
  EmploymentType,
  InterviewRoundTemplate,
  InterviewRoundType,
  Job,
  JobSkill,
  JobStatus,
  QuestionType,
} from './entities';
import {
  CreateJobDto,
  GeneratedQuestion,
  GenerateQuestionsDto,
  ListJobsQueryDto,
  UpdateJobDto,
} from './dto';

@Injectable()
export class JobsService {
  constructor(
    @InjectRepository(Job)
    private readonly jobsRepository: Repository<Job>,
    @InjectRepository(JobSkill)
    private readonly jobSkillsRepository: Repository<JobSkill>,
    @InjectRepository(InterviewRoundTemplate)
    private readonly roundTemplatesRepository: Repository<InterviewRoundTemplate>,
    private readonly llmService: LlmService,
    private readonly activityService: ActivityService,
  ) {}

  async create(organizationId: string, createdByUserId: string, dto: CreateJobDto): Promise<Job> {
    const job = this.jobsRepository.create({
      organizationId,
      createdByUserId,
      title: dto.title,
      department: dto.department,
      location: dto.location,
      employmentType: dto.employmentType ?? EmploymentType.FULL_TIME,
      experienceMin: dto.experienceMin,
      experienceMax: dto.experienceMax,
      salaryMin: dto.salaryMin,
      salaryMax: dto.salaryMax,
      salaryCurrency: dto.salaryCurrency ?? 'INR',
      positionsCount: dto.positionsCount ?? 1,
      status: dto.status ?? JobStatus.DRAFT,
      description: dto.description,
      skills: (dto.skills ?? []).map((s, i) =>
        this.jobSkillsRepository.create({ ...s, orderIndex: s.orderIndex ?? i }),
      ),
      rounds: (dto.rounds ?? []).map((r, i) =>
        this.roundTemplatesRepository.create({
          ...r,
          organizationId,
          orderIndex: r.orderIndex ?? i,
          questions: (r.questions ?? []).map((q, qi) => ({ ...q, orderIndex: q.orderIndex ?? qi })),
        }),
      ),
    });
    const saved = await this.jobsRepository.save(job);
    await this.activityService.log({
      organizationId,
      type: ActivityType.JOB_CREATED,
      message: `New job posted: ${saved.title}`,
      actorUserId: createdByUserId,
    });
    return this.findOne(organizationId, saved.id);
  }

  async findAll(organizationId: string, query: ListJobsQueryDto): Promise<Job[]> {
    const qb = this.jobsRepository
      .createQueryBuilder('job')
      .leftJoinAndSelect('job.skills', 'skills')
      .leftJoinAndSelect('job.rounds', 'rounds')
      .where('job.organizationId = :organizationId', { organizationId })
      .orderBy('job.createdAt', 'DESC');

    if (query.status) qb.andWhere('job.status = :status', { status: query.status });
    if (query.department) {
      qb.andWhere('job.department = :department', { department: query.department });
    }
    if (query.search) {
      qb.andWhere('(job.title ILIKE :search OR job.department ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }

    return qb.getMany();
  }

  async findOne(organizationId: string, id: string): Promise<Job> {
    const job = await this.jobsRepository.findOne({
      where: { id, organizationId },
      relations: { skills: true, rounds: { questions: true } },
      order: {
        skills: { orderIndex: 'ASC' },
        rounds: { orderIndex: 'ASC', questions: { orderIndex: 'ASC' } },
      },
    });
    if (!job) throw new NotFoundException('Job not found');
    return job;
  }

  async update(organizationId: string, id: string, dto: UpdateJobDto): Promise<Job> {
    await this.findOne(organizationId, id); // 404s if missing/wrong org

    const { skills, rounds, ...scalarFields } = dto;
    if (Object.keys(scalarFields).length > 0) {
      await this.jobsRepository.update({ id, organizationId }, scalarFields);
    }

    if (skills) {
      await this.jobSkillsRepository.delete({ jobId: id });
      await this.jobSkillsRepository.save(
        skills.map((s, i) =>
          this.jobSkillsRepository.create({ ...s, jobId: id, orderIndex: s.orderIndex ?? i }),
        ),
      );
    }

    if (rounds) {
      await this.roundTemplatesRepository.delete({ jobId: id });
      await this.roundTemplatesRepository.save(
        rounds.map((r, i) =>
          this.roundTemplatesRepository.create({
            ...r,
            jobId: id,
            organizationId,
            orderIndex: r.orderIndex ?? i,
            questions: (r.questions ?? []).map((q, qi) => ({
              ...q,
              orderIndex: q.orderIndex ?? qi,
            })),
          }),
        ),
      );
    }

    return this.findOne(organizationId, id);
  }

  async remove(organizationId: string, id: string): Promise<void> {
    const result = await this.jobsRepository.delete({ id, organizationId });
    if (result.affected === 0) throw new NotFoundException('Job not found');
  }

  /** Suggests questions for an existing round — a pure LLM call, nothing persisted.
   * The recruiter edits/reorders/drops suggestions client-side, then saves the round
   * (with whichever questions they kept) via the normal `update()` endpoint. */
  async generateQuestions(
    organizationId: string,
    jobId: string,
    roundId: string,
    dto: GenerateQuestionsDto,
  ): Promise<GeneratedQuestion[]> {
    const job = await this.findOne(organizationId, jobId);
    const round = (job.rounds ?? []).find((r) => r.id === roundId);
    if (!round) throw new NotFoundException('Interview round not found on this job');

    const count = dto.count ?? 5;
    const skillsList =
      (job.skills ?? [])
        .map((s) => `- ${s.name} (${s.level}, ${s.importance} priority)`)
        .join('\n') || '(none listed)';
    const existingQuestions =
      (round.questions ?? []).map((q) => `- ${q.questionText}`).join('\n') || '(none yet)';

    const system = `You are an expert technical interviewer. Given a job's details and an interview round's type, suggest new interview questions for that round. Respond with ONLY a JSON object (no markdown fences, no commentary) matching exactly this shape:
{ "questions": [ { "questionText": <string>, "questionType": "technical" | "behavioral" | "situational" | "experience" | "culture" }, ... exactly ${count} entries ] }`;

    const prompt = `## Job
Title: ${job.title}
Department: ${job.department}
Description: ${job.description || '(none provided)'}
Required skills:
${skillsList}

## Round
Name: ${round.name}
Type: ${round.type}
Duration: ${round.durationMinutes} minutes

## Already-asked questions in this round (don't repeat these)
${existingQuestions}
${dto.additionalContext ? `\n## Recruiter's guidance\n${dto.additionalContext}` : ''}

Suggest ${count} new, non-redundant questions appropriate for a "${round.type}" round.`;

    const result = await this.llmService.completeJson<{ questions: GeneratedQuestion[] }>(
      { system, prompt },
      () => ({
        questions: Array.from({ length: count }, (_, i) => ({
          questionText: `[mock] Sample ${round.type} question #${i + 1} for a ${job.title} candidate.`,
          questionType:
            round.type === InterviewRoundType.HR ? QuestionType.CULTURE : QuestionType.TECHNICAL,
        })),
      }),
    );
    return result.questions;
  }
}
