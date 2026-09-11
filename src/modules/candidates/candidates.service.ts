import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from '@module/jobs/entities';
import {
  CandidateNote,
  CandidateSkill,
  Candidate,
  CandidateStage,
  CANDIDATE_STAGE_RANK,
} from './entities';
import {
  CreateCandidateDto,
  CreateNoteDto,
  ListCandidatesQueryDto,
  UpdateCandidateDto,
} from './dto';

@Injectable()
export class CandidatesService {
  constructor(
    @InjectRepository(Candidate)
    private readonly candidatesRepository: Repository<Candidate>,
    @InjectRepository(CandidateSkill)
    private readonly candidateSkillsRepository: Repository<CandidateSkill>,
    @InjectRepository(CandidateNote)
    private readonly candidateNotesRepository: Repository<CandidateNote>,
    @InjectRepository(Job)
    private readonly jobsRepository: Repository<Job>,
  ) {}

  private async assertJobInOrg(organizationId: string, jobId: string): Promise<void> {
    const job = await this.jobsRepository.findOne({ where: { id: jobId, organizationId } });
    if (!job) throw new BadRequestException('That job does not exist in your organization');
  }

  async create(organizationId: string, dto: CreateCandidateDto): Promise<Candidate> {
    await this.assertJobInOrg(organizationId, dto.jobId);

    const candidate = this.candidatesRepository.create({
      organizationId,
      jobId: dto.jobId,
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      experienceYears: dto.experienceYears,
      currentCompany: dto.currentCompany,
      location: dto.location,
      education: dto.education,
      resumeSummary: dto.resumeSummary,
      skills: (dto.skills ?? []).map((name) => this.candidateSkillsRepository.create({ name })),
    });
    const saved = await this.candidatesRepository.save(candidate);
    return this.findOne(organizationId, saved.id);
  }

  async findAll(organizationId: string, query: ListCandidatesQueryDto): Promise<Candidate[]> {
    const qb = this.candidatesRepository
      .createQueryBuilder('candidate')
      .leftJoinAndSelect('candidate.skills', 'skills')
      .leftJoinAndSelect('candidate.job', 'job')
      .where('candidate.organizationId = :organizationId', { organizationId })
      .orderBy('candidate.createdAt', 'DESC');

    if (query.jobId) qb.andWhere('candidate.jobId = :jobId', { jobId: query.jobId });
    if (query.stage) qb.andWhere('candidate.stage = :stage', { stage: query.stage });
    if (query.search) {
      qb.andWhere('(candidate.name ILIKE :search OR candidate.email ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }

    return qb.getMany();
  }

  async findOne(organizationId: string, id: string): Promise<Candidate> {
    const candidate = await this.candidatesRepository.findOne({
      where: { id, organizationId },
      relations: { skills: true, job: true, notes: { author: true } },
      order: { notes: { createdAt: 'DESC' } },
    });
    if (!candidate) throw new NotFoundException('Candidate not found');
    return candidate;
  }

  async update(organizationId: string, id: string, dto: UpdateCandidateDto): Promise<Candidate> {
    await this.findOne(organizationId, id);
    if (dto.jobId) await this.assertJobInOrg(organizationId, dto.jobId);

    const { skills, ...scalarFields } = dto;
    if (Object.keys(scalarFields).length > 0) {
      await this.candidatesRepository.update({ id, organizationId }, scalarFields);
    }
    if (skills) {
      await this.candidateSkillsRepository.delete({ candidateId: id });
      await this.candidateSkillsRepository.save(
        skills.map((name) => this.candidateSkillsRepository.create({ candidateId: id, name })),
      );
    }
    return this.findOne(organizationId, id);
  }

  async updateStage(
    organizationId: string,
    id: string,
    stage: CandidateStage,
    rejectReason?: string,
  ): Promise<Candidate> {
    const candidate = await this.findOne(organizationId, id);

    if (stage !== CandidateStage.REJECTED) {
      const currentRank = CANDIDATE_STAGE_RANK[candidate.stage];
      const targetRank = CANDIDATE_STAGE_RANK[stage];
      if (targetRank < currentRank) {
        throw new BadRequestException(
          `Cannot move a candidate backward from "${candidate.stage}" to "${stage}"`,
        );
      }
    }

    await this.candidatesRepository.update(
      { id, organizationId },
      { stage, rejectReason: stage === CandidateStage.REJECTED ? (rejectReason ?? null) : null },
    );
    return this.findOne(organizationId, id);
  }

  /** Internal, system-driven forward-only stage bump — used by InterviewsModule when
   * scheduling a round moves the candidate further along than a manual reject/hire
   * decision. Never throws, never moves backward, never touches REJECTED candidates. */
  async advanceStageIfForward(
    organizationId: string,
    id: string,
    targetStage: CandidateStage,
  ): Promise<void> {
    const candidate = await this.candidatesRepository.findOne({ where: { id, organizationId } });
    if (!candidate || candidate.stage === CandidateStage.REJECTED) return;
    if (CANDIDATE_STAGE_RANK[targetStage] > CANDIDATE_STAGE_RANK[candidate.stage]) {
      await this.candidatesRepository.update({ id, organizationId }, { stage: targetStage });
    }
  }

  async addNote(
    organizationId: string,
    candidateId: string,
    authorUserId: string,
    dto: CreateNoteDto,
  ): Promise<CandidateNote> {
    await this.findOne(organizationId, candidateId); // 404s if missing/wrong org
    const note = this.candidateNotesRepository.create({
      organizationId,
      candidateId,
      authorUserId,
      body: dto.body,
    });
    return this.candidateNotesRepository.save(note);
  }

  async remove(organizationId: string, id: string): Promise<void> {
    const result = await this.candidatesRepository.delete({ id, organizationId });
    if (result.affected === 0) throw new NotFoundException('Candidate not found');
  }
}
