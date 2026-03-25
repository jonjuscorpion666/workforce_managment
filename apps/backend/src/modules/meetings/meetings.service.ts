import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Meeting } from './entities/meeting.entity';
import { MeetingNote } from './entities/meeting-note.entity';

@Injectable()
export class MeetingsService {
  constructor(
    @InjectRepository(Meeting) private readonly repo: Repository<Meeting>,
    @InjectRepository(MeetingNote) private readonly noteRepo: Repository<MeetingNote>,
  ) {}
  create(data: any, createdById: string) { return this.repo.save(this.repo.create({ ...data, facilitatorId: createdById })); }
  findAll(q: any) { return this.repo.find({ relations: ['notes'], order: { scheduledAt: 'DESC' } }); }
  findOne(id: string) { return this.repo.findOne({ where: { id }, relations: ['notes'] }); }
  update(id: string, data: any) { return this.repo.update(id, data); }
  addNote(meetingId: string, data: any, authorId: string) {
    const note = this.noteRepo.create({ ...data, meetingId, authorId });
    return this.noteRepo.save(note);
  }
}
