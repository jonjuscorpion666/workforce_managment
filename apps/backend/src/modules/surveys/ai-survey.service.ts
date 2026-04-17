import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Anthropic from '@anthropic-ai/sdk';
import { Program } from '../programs/entities/program.entity';
import { QuestionBankItem } from '../question-bank/entities/question-bank-item.entity';

@Injectable()
export class AiSurveyService {
  private readonly client: Anthropic;

  constructor(
    @InjectRepository(Program)
    private readonly programRepo: Repository<Program>,
    @InjectRepository(QuestionBankItem)
    private readonly bankRepo: Repository<QuestionBankItem>,
  ) {
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  async generate(programId: string) {
    // 1. Load program context
    const program = await this.programRepo.findOne({ where: { id: programId } });
    if (!program) throw new NotFoundException('Program not found');

    const objective       = (program as any).objective       ?? '';
    const problemStatement = (program as any).problemStatement ?? '';
    const successCriteria  = (program as any).successCriteria  ?? '';

    if (!objective && !problemStatement) {
      throw new BadRequestException('Program must have an objective or problem statement to generate questions');
    }

    // 2. Load question bank
    const bank = await this.bankRepo.find({ order: { category: 'ASC' } });

    if (bank.length === 0) {
      throw new BadRequestException('Question bank is empty. Ask your admin to add questions first.');
    }

    // 3. Build prompt
    const bankJson = bank.map((q) => ({
      id:        q.id,
      text:      q.text,
      type:      q.type,
      category:  q.category,
      framework: q.framework,
      helpText:  q.helpText,
      options:   q.options,
      followUpThreshold: q.followUpThreshold,
      followUpPrompt:    q.followUpPrompt,
      isValidated:       q.isValidated,
    }));

    const prompt = `You are an expert organisational psychologist specialising in healthcare workforce surveys.

A healthcare program manager needs survey questions for the following program:

PROGRAM NAME: ${program.name}
OBJECTIVE: ${objective}
PROBLEM STATEMENT: ${problemStatement}
SUCCESS CRITERIA: ${successCriteria}

Below is the validated question bank available (JSON array):
${JSON.stringify(bankJson, null, 2)}

Your task:
1. Select 6–10 questions from the bank that are most relevant to this program's objective and problem.
2. Lightly customise the question text where it improves fit (keep the original meaning and type).
3. Prioritise scientifically validated questions (isValidated: true).
4. Ensure variety: mix numeric scales with at least one open text question.
5. Return ONLY a valid JSON array — no explanation, no markdown, no extra text.

Each item in the returned array must have exactly these fields:
{
  "bankItemId": "<original id from bank, or null if custom>",
  "text": "<question text>",
  "type": "<type>",
  "helpText": "<optional help text or null>",
  "options": "<array or null>",
  "followUpThreshold": "<number or null>",
  "followUpPrompt": "<string or null>",
  "category": "<category>",
  "framework": "<framework>",
  "isRequired": true
}`;

    // 4. Call Claude
    const message = await this.client.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages:   [{ role: 'user', content: prompt }],
    });

    const raw = (message.content[0] as any).text?.trim() ?? '';

    // 5. Parse response
    let questions: any[];
    try {
      // Strip markdown code fences if present
      const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
      questions = JSON.parse(cleaned);
    } catch {
      throw new BadRequestException('AI returned an unexpected format. Please try again.');
    }

    return {
      programId,
      programName: program.name,
      questions,
    };
  }
}
