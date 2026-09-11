import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmploymentType, InterviewRoundTemplate, Job, JobSkill, JobStatus } from './entities';
import { CreateJobDto, ListJobsQueryDto, UpdateJobDto } from './dto';

@Injectable()
export class JobsService {
  constructor(
    @InjectRepository(Job)
    private readonly jobsRepository: Repository<Job>,
    @InjectRepository(JobSkill)
    private readonly jobSkillsRepository: Repository<JobSkill>,
    @InjectRepository(InterviewRoundTemplate)
    private readonly roundTemplatesRepository: Repository<InterviewRoundTemplate>,
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
}
