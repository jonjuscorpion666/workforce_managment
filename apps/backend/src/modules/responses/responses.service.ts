import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { Response } from './entities/response.entity';
import { SurveysService } from '../surveys/surveys.service';
import { User } from '../auth/entities/user.entity';
import { OrgUnit } from '../org/entities/org-unit.entity';
import { Program, ProgramStatus } from '../programs/entities/program.entity';
import { Not, In } from 'typeorm';

@Injectable()
export class ResponsesService {
  constructor(
    @InjectRepository(Response)  private readonly repo:     Repository<Response>,
    @InjectRepository(User)      private readonly userRepo: Repository<User>,
    @InjectRepository(OrgUnit)   private readonly orgRepo:  Repository<OrgUnit>,
    @InjectRepository(Program)   private readonly programRepo: Repository<Program>,
    private readonly surveysService: SurveysService,
  ) {}

  async submit(data: any, req: any) {
    const survey = await this.surveysService.findOne(data.surveyId);
    if (survey.status !== 'ACTIVE') {
      throw new BadRequestException('Survey is not currently active');
    }

    // Resolve the respondent's org context from their user profile (server-side)
    // Never trust client-submitted orgUnitId — always derive from the authenticated user
    let orgUnitId:    string | null = null;
    let hospitalId:   string | null = null;
    let departmentId: string | null = null;
    let role:         string | null = null;
    let respondentId: string | null = null;

    const userId = req.user?.id ?? null;

    if (userId) {
      const user = await this.userRepo.findOne({
        where: { id: userId },
        relations: ['orgUnit', 'orgUnit.parent', 'orgUnit.parent.parent', 'roles'],
      });

      if (user) {
        respondentId = survey.isAnonymous ? null : userId;
        role         = user.roles?.[0]?.name ?? null;

        if (user.orgUnit) {
          const resolved = this.resolveOrgHierarchy(user.orgUnit);
          orgUnitId    = resolved.orgUnitId;
          hospitalId   = resolved.hospitalId;
          departmentId = resolved.departmentId;
        }
      }
    }

    const ip     = req.ip || req.headers['x-forwarded-for'];
    const ipHash = crypto.createHash('sha256').update((ip ?? 'unknown') + data.surveyId).digest('hex');

    // Auto-resolve programId from the active program linked to this survey, in case the
    // submitter (e.g. the legacy /portal/survey/[id] page) didn't include it. Only one
    // non-terminal program can be linked to a given survey at a time (enforced in linkSurvey).
    let programId: string | null = data.programId ?? null;
    if (!programId) {
      const linked = await this.programRepo.findOne({
        where: {
          linkedSurveyId: data.surveyId,
          status: Not(In([ProgramStatus.COMPLETED, ProgramStatus.CANCELLED])),
        },
      });
      if (linked) programId = linked.id;
    }

    const response = this.repo.create({
      surveyId:    data.surveyId,
      programId,
      survey,
      isAnonymous: survey.isAnonymous,
      respondentId,
      answers:     data.answers,
      orgUnitId,
      hospitalId,
      departmentId,
      role,
      shift:       data.shift ?? null,
      ipHash,
      completedAt: new Date(),
    });

    return this.repo.save(response);
  }

  findAll(query: any) {
    const qb = this.repo.createQueryBuilder('r').orderBy('r.submittedAt', 'DESC');
    if (query.surveyId)    qb.andWhere('r.surveyId = :surveyId',       { surveyId: query.surveyId });
    if (query.hospitalId)  qb.andWhere('r.hospitalId = :hospitalId',   { hospitalId: query.hospitalId });
    if (query.departmentId)qb.andWhere('r.departmentId = :deptId',     { deptId: query.departmentId });
    if (query.orgUnitId)   qb.andWhere('r.orgUnitId = :orgUnitId',     { orgUnitId: query.orgUnitId });
    return qb.getMany();
  }

  async getParticipationStatus(surveyId: string, programId?: string) {
    const where: any = { surveyId };
    if (programId) where.programId = programId;
    const count = await this.repo.count({ where });
    return { surveyId, programId: programId ?? null, responseCount: count };
  }

  /**
   * Walk up the org unit hierarchy to extract hospital and department ancestors.
   * Handles all cases: user assigned directly to HOSPITAL, DEPARTMENT, or UNIT.
   *
   *   UNIT → parent: DEPARTMENT → parent: HOSPITAL
   *   DEPARTMENT → parent: HOSPITAL
   *   HOSPITAL → no parent (top of clinical hierarchy)
   */
  private resolveOrgHierarchy(orgUnit: OrgUnit): {
    orgUnitId: string;
    hospitalId: string | null;
    departmentId: string | null;
  } {
    const chain: OrgUnit[] = [];
    let current: OrgUnit | null = orgUnit;
    while (current) {
      chain.push(current);
      current = (current as any).parent ?? null;
    }

    const hospitalId   = chain.find((u) => u.level === 'HOSPITAL')?.id   ?? null;
    const departmentId = chain.find((u) => u.level === 'DEPARTMENT')?.id ?? null;

    return { orgUnitId: orgUnit.id, hospitalId, departmentId };
  }
}
