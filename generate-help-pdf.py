#!/usr/bin/env python3
"""Generate help documentation PDF for Workforce Transformation Platform."""

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, PageBreak, KeepTogether
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.platypus.flowables import Flowable
import io

# ── Colour palette ────────────────────────────────────────────────────────────

BLUE_DARK   = colors.HexColor('#1d4ed8')
BLUE_MED    = colors.HexColor('#3b82f6')
BLUE_LIGHT  = colors.HexColor('#eff6ff')
BLUE_BORDER = colors.HexColor('#bfdbfe')

GREEN_DARK  = colors.HexColor('#15803d')
GREEN_LIGHT = colors.HexColor('#f0fdf4')
GREEN_BORDER= colors.HexColor('#bbf7d0')

AMBER_DARK  = colors.HexColor('#92400e')
AMBER_LIGHT = colors.HexColor('#fffbeb')
AMBER_BORDER= colors.HexColor('#fde68a')

RED_DARK    = colors.HexColor('#b91c1c')
RED_LIGHT   = colors.HexColor('#fef2f2')
RED_BORDER  = colors.HexColor('#fecaca')

GRAY_900    = colors.HexColor('#111827')
GRAY_700    = colors.HexColor('#374151')
GRAY_600    = colors.HexColor('#4b5563')
GRAY_500    = colors.HexColor('#6b7280')
GRAY_200    = colors.HexColor('#e5e7eb')
GRAY_100    = colors.HexColor('#f3f4f6')
GRAY_50     = colors.HexColor('#f9fafb')

WHITE       = colors.white

# ── Styles ────────────────────────────────────────────────────────────────────

def build_styles():
    base = getSampleStyleSheet()

    styles = {}

    styles['cover_title'] = ParagraphStyle(
        'cover_title',
        fontSize=28, leading=34, textColor=WHITE,
        fontName='Helvetica-Bold', alignment=TA_CENTER,
    )
    styles['cover_sub'] = ParagraphStyle(
        'cover_sub',
        fontSize=13, leading=18, textColor=colors.HexColor('#bfdbfe'),
        fontName='Helvetica', alignment=TA_CENTER,
    )
    styles['toc_title'] = ParagraphStyle(
        'toc_title',
        fontSize=16, leading=20, textColor=GRAY_900,
        fontName='Helvetica-Bold', spaceBefore=8, spaceAfter=4,
    )
    styles['toc_item'] = ParagraphStyle(
        'toc_item',
        fontSize=11, leading=18, textColor=GRAY_700,
        fontName='Helvetica', leftIndent=12,
    )
    styles['section_title'] = ParagraphStyle(
        'section_title',
        fontSize=18, leading=22, textColor=WHITE,
        fontName='Helvetica-Bold',
    )
    styles['section_sub'] = ParagraphStyle(
        'section_sub',
        fontSize=10, leading=14, textColor=colors.HexColor('#bfdbfe'),
        fontName='Helvetica',
    )
    styles['h3'] = ParagraphStyle(
        'h3',
        fontSize=12, leading=16, textColor=GRAY_900,
        fontName='Helvetica-Bold', spaceBefore=14, spaceAfter=4,
    )
    styles['body'] = ParagraphStyle(
        'body',
        fontSize=10, leading=15, textColor=GRAY_700,
        fontName='Helvetica', spaceAfter=6, alignment=TA_JUSTIFY,
    )
    styles['body_bold'] = ParagraphStyle(
        'body_bold',
        fontSize=10, leading=15, textColor=GRAY_900,
        fontName='Helvetica-Bold', spaceAfter=4,
    )
    styles['callout_title'] = ParagraphStyle(
        'callout_title',
        fontSize=10, leading=14, textColor=BLUE_DARK,
        fontName='Helvetica-Bold', spaceAfter=4,
    )
    styles['callout_title_green'] = ParagraphStyle(
        'callout_title_green',
        fontSize=10, leading=14, textColor=GREEN_DARK,
        fontName='Helvetica-Bold', spaceAfter=4,
    )
    styles['callout_title_amber'] = ParagraphStyle(
        'callout_title_amber',
        fontSize=10, leading=14, textColor=AMBER_DARK,
        fontName='Helvetica-Bold', spaceAfter=4,
    )
    styles['callout_body'] = ParagraphStyle(
        'callout_body',
        fontSize=9.5, leading=14, textColor=GRAY_700,
        fontName='Helvetica', spaceAfter=3,
    )
    styles['mono'] = ParagraphStyle(
        'mono',
        fontSize=9, leading=13, textColor=colors.HexColor('#22c55e'),
        fontName='Courier', spaceAfter=3,
    )
    styles['step_num'] = ParagraphStyle(
        'step_num',
        fontSize=9, leading=12, textColor=BLUE_DARK,
        fontName='Helvetica-Bold', alignment=TA_CENTER,
    )
    styles['step_text'] = ParagraphStyle(
        'step_text',
        fontSize=9.5, leading=14, textColor=GRAY_700,
        fontName='Helvetica', spaceAfter=2,
    )
    styles['bullet'] = ParagraphStyle(
        'bullet',
        fontSize=9.5, leading=14, textColor=GRAY_700,
        fontName='Helvetica', spaceAfter=2, leftIndent=14, firstLineIndent=-8,
    )
    styles['table_header'] = ParagraphStyle(
        'table_header',
        fontSize=8.5, leading=11, textColor=GRAY_500,
        fontName='Helvetica-Bold',
    )
    styles['table_cell'] = ParagraphStyle(
        'table_cell',
        fontSize=9, leading=13, textColor=GRAY_700,
        fontName='Helvetica',
    )
    styles['footer'] = ParagraphStyle(
        'footer',
        fontSize=8, leading=10, textColor=GRAY_500,
        fontName='Helvetica', alignment=TA_CENTER,
    )
    styles['flow_label'] = ParagraphStyle(
        'flow_label',
        fontSize=8.5, leading=11, textColor=GRAY_700,
        fontName='Helvetica-Bold', alignment=TA_CENTER,
    )
    styles['flow_sub'] = ParagraphStyle(
        'flow_sub',
        fontSize=7.5, leading=10, textColor=GRAY_500,
        fontName='Helvetica', alignment=TA_CENTER,
    )

    return styles

S = build_styles()

# ── Helper flowables ──────────────────────────────────────────────────────────

def spacer(h=6):
    return Spacer(1, h)

def hr():
    return HRFlowable(width='100%', thickness=0.5, color=GRAY_200, spaceAfter=8, spaceBefore=8)

def section_header(title, subtitle):
    """Blue banner header for each major section."""
    data = [[
        Paragraph(title,    S['section_title']),
        Paragraph(subtitle, S['section_sub']),
    ]]
    t = Table(data, colWidths=['100%'])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), BLUE_DARK),
        ('TOPPADDING',    (0,0), (-1,-1), 14),
        ('BOTTOMPADDING', (0,0), (-1,-1), 14),
        ('LEFTPADDING',   (0,0), (-1,-1), 16),
        ('RIGHTPADDING',  (0,0), (-1,-1), 16),
        ('ROWBACKGROUNDS',(0,0), (-1,-1), [BLUE_DARK]),
        ('SPAN', (0,0), (-1,0)),   # single merged cell
    ]))
    # Actually use two rows
    data2 = [
        [Paragraph(title, S['section_title'])],
        [Paragraph(subtitle, S['section_sub'])],
    ]
    t2 = Table(data2, colWidths=[16*cm])
    t2.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), BLUE_DARK),
        ('TOPPADDING',    (0,0), (-1,0), 14),
        ('BOTTOMPADDING', (0,0), (-1,-1), 14),
        ('LEFTPADDING',   (0,0), (-1,-1), 14),
        ('RIGHTPADDING',  (0,0), (-1,-1), 14),
        ('TOPPADDING',    (0,1), (-1,-1), 2),
    ]))
    return t2

def h3(text):
    return Paragraph(text, S['h3'])

def body(text):
    return Paragraph(text, S['body'])

def callout(type_, title, content_paragraphs):
    """Coloured callout box."""
    if type_ == 'example':
        bg, border, title_style = BLUE_LIGHT, BLUE_BORDER, S['callout_title']
    elif type_ == 'tip':
        bg, border, title_style = GREEN_LIGHT, GREEN_BORDER, S['callout_title_green']
    else:  # note
        bg, border, title_style = AMBER_LIGHT, AMBER_BORDER, S['callout_title_amber']

    inner = [Paragraph(title, title_style)] + [
        Paragraph(p, S['callout_body']) for p in content_paragraphs
    ]
    t = Table([[inner]], colWidths=[16*cm])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), bg),
        ('BOX',        (0,0), (-1,-1), 1, border),
        ('TOPPADDING',    (0,0), (-1,-1), 10),
        ('BOTTOMPADDING', (0,0), (-1,-1), 10),
        ('LEFTPADDING',   (0,0), (-1,-1), 12),
        ('RIGHTPADDING',  (0,0), (-1,-1), 12),
        ('ROUNDEDCORNERS', [4]),
    ]))
    return t

def data_table(heads, rows, col_widths=None):
    """Standard bordered table."""
    header_row = [Paragraph(h, S['table_header']) for h in heads]
    body_rows  = [[Paragraph(str(c), S['table_cell']) for c in row] for row in rows]
    all_rows   = [header_row] + body_rows

    if col_widths is None:
        n = len(heads)
        col_widths = [16*cm / n] * n

    t = Table(all_rows, colWidths=col_widths, repeatRows=1)
    t.setStyle(TableStyle([
        ('BACKGROUND',    (0,0), (-1,0), GRAY_100),
        ('FONTNAME',      (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE',      (0,0), (-1,0), 8.5),
        ('TEXTCOLOR',     (0,0), (-1,0), GRAY_500),
        ('ROWBACKGROUNDS',(0,1), (-1,-1), [WHITE, GRAY_50]),
        ('GRID',          (0,0), (-1,-1), 0.5, GRAY_200),
        ('TOPPADDING',    (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING',   (0,0), (-1,-1), 8),
        ('RIGHTPADDING',  (0,0), (-1,-1), 8),
        ('VALIGN',        (0,0), (-1,-1), 'TOP'),
    ]))
    return t

def flow_diagram(steps):
    """Horizontal flow diagram with arrows."""
    n = len(steps)
    cell_w = 16*cm / n

    cells = []
    for s in steps:
        inner = [Paragraph(s['label'], S['flow_label'])]
        if s.get('sub'):
            inner.append(Paragraph(s['sub'], S['flow_sub']))
        box = Table([[inner]], colWidths=[cell_w - 0.4*cm])
        box.setStyle(TableStyle([
            ('BOX', (0,0), (-1,-1), 0.75, GRAY_200),
            ('BACKGROUND', (0,0), (-1,-1), WHITE),
            ('TOPPADDING', (0,0), (-1,-1), 5),
            ('BOTTOMPADDING', (0,0), (-1,-1), 5),
            ('LEFTPADDING', (0,0), (-1,-1), 4),
            ('RIGHTPADDING', (0,0), (-1,-1), 4),
        ]))
        cells.append(box)

    row = [cells]
    t = Table(row, colWidths=[cell_w]*n)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), GRAY_50),
        ('BOX', (0,0), (-1,-1), 0.5, GRAY_200),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))
    return t

def numbered_steps(steps):
    """Numbered list of (title, detail) tuples."""
    items = []
    for i, (title, detail) in enumerate(steps, 1):
        num_cell = Table(
            [[Paragraph(str(i), S['step_num'])]],
            colWidths=[0.6*cm],
        )
        num_cell.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), BLUE_LIGHT),
            ('TOPPADDING', (0,0), (-1,-1), 2),
            ('BOTTOMPADDING', (0,0), (-1,-1), 2),
            ('LEFTPADDING', (0,0), (-1,-1), 1),
            ('RIGHTPADDING', (0,0), (-1,-1), 1),
        ]))
        text = Paragraph(f'<b>{title}</b> — {detail}', S['step_text'])
        row = Table([[num_cell, text]], colWidths=[0.7*cm, 15.3*cm])
        row.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('TOPPADDING', (0,0), (-1,-1), 3),
            ('BOTTOMPADDING', (0,0), (-1,-1), 3),
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
        ]))
        items.append(row)
    return items

def mono_block(lines):
    """Dark code/mono block."""
    inner = [Paragraph(line, S['mono']) for line in lines]
    t = Table([[inner]], colWidths=[16*cm])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor('#111827')),
        ('TOPPADDING', (0,0), (-1,-1), 10),
        ('BOTTOMPADDING', (0,0), (-1,-1), 10),
        ('LEFTPADDING', (0,0), (-1,-1), 14),
        ('RIGHTPADDING', (0,0), (-1,-1), 14),
    ]))
    return t

def bullet_list(items):
    return [Paragraph(f'• {item}', S['bullet']) for item in items]

# ── Cover page ────────────────────────────────────────────────────────────────

def build_cover():
    elems = []

    # Full-page blue background via a big table
    title_block = Table([[
        [
            Spacer(1, 3*cm),
            Paragraph('Workforce Transformation Platform', S['cover_title']),
            Spacer(1, 0.4*cm),
            Paragraph('Help Centre Documentation', S['cover_sub']),
            Spacer(1, 0.3*cm),
            Paragraph('Complete reference guide for all platform features', S['cover_sub']),
            Spacer(1, 2*cm),
        ]
    ]], colWidths=[16*cm])
    title_block.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), BLUE_DARK),
        ('TOPPADDING', (0,0), (-1,-1), 0),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ('LEFTPADDING', (0,0), (-1,-1), 24),
        ('RIGHTPADDING', (0,0), (-1,-1), 24),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
    ]))

    elems.append(title_block)
    elems.append(spacer(20))

    # Contents preview
    toc_style = ParagraphStyle('toc', fontSize=11, leading=20, textColor=GRAY_700, fontName='Helvetica')
    sections = [
        ('1', 'Surveys'),
        ('2', 'Announcements'),
        ('3', 'Issues from Surveys'),
        ('4', 'Action Plans & Milestones'),
        ('5', 'Tasks & Milestones'),
        ('6', 'Analytics'),
        ('7', 'Program Flow'),
    ]
    elems.append(Paragraph('Contents', S['toc_title']))
    elems.append(spacer(4))
    for num, label in sections:
        elems.append(Paragraph(f'{num}.  {label}', toc_style))

    elems.append(PageBreak())
    return elems

# ── Section 1: Surveys ────────────────────────────────────────────────────────

def build_surveys():
    elems = []
    elems.append(section_header('1. Surveys', 'How to create, configure, and publish surveys — and who can do what.'))
    elems.append(spacer(12))

    elems.append(h3('What is a survey?'))
    elems.append(body(
        'A survey is the primary way the platform gathers staff feedback. You create a set of questions, '
        'target it to a specific group (hospital, department, or unit), and staff respond. Results feed '
        'directly into the analytics dashboard and can automatically generate issues where scores are low.'
    ))

    elems.append(h3('Who can create surveys?'))
    elems.append(data_table(
        heads=['Role', 'Can Create', 'Needs Approval', 'Max Questions', 'Can Target'],
        rows=[
            ['SVP',         'Yes', 'No',           'Unlimited', 'System, Hospital, Department, Unit'],
            ['CNO / CNP',   'Yes', 'Yes — SVP',    'Unlimited', 'Hospital, Unit'],
            ['VP',          'Yes', 'Yes — SVP',    'Unlimited', 'Hospital, Department, Unit'],
            ['Director',    'Yes', 'Yes — CNO/SVP','5',         'Unit (own only)'],
            ['Manager',     'No',  '—',            '—',         '—'],
            ['Nurse/Staff', 'No',  '—',            '—',         '—'],
        ],
        col_widths=[2.5*cm, 2*cm, 3*cm, 2.5*cm, 6*cm],
    ))
    elems.append(spacer(6))
    elems.append(callout('note', 'Note: Approval rules are configured by your system admin', [
        'The approval requirements shown above are defaults. Your SVP or Admin may have changed them under '
        'Admin → Platform Configuration. Check there if you are unsure whether your survey needs approval.',
    ]))
    elems.append(spacer(10))

    elems.append(h3('Survey workflow (from creation to results)'))
    elems.append(flow_diagram([
        {'label': 'Draft',   'sub': 'Building questions'},
        {'label': 'Pending', 'sub': 'Awaiting approval'},
        {'label': 'Active',  'sub': 'Staff can respond'},
        {'label': 'Paused',  'sub': 'Temporarily stopped'},
        {'label': 'Closed',  'sub': 'No more responses'},
    ]))
    elems.append(spacer(10))

    elems.append(h3('Question types'))
    elems.append(data_table(
        heads=['Type', 'When to use', 'Example'],
        rows=[
            ['Scale (1–5)',       'Measuring sentiment or satisfaction', '"How satisfied are you with your workload?" → 1 (Very dissatisfied) to 5 (Very satisfied)'],
            ['Multiple choice',   'Selecting from fixed options',        '"Which shift do you usually work?" → Days / Evenings / Nights'],
            ['Text',             'Open-ended qualitative feedback',     '"What one thing would most improve your experience?"'],
        ],
        col_widths=[3*cm, 5*cm, 8*cm],
    ))
    elems.append(spacer(6))

    elems.append(h3('Configuring a survey — step by step'))
    steps = [
        ('Go to Surveys', 'Click Surveys in the left sidebar.'),
        ('Click "New Survey"', 'Give it a clear title (e.g. "Float Pool — Q2 Pulse") and an optional description.'),
        ('Set the close date', 'Choose a realistic window — 7–14 days is typical for pulse surveys. Staff cannot respond after this date.'),
        ('Toggle Anonymous', 'If ON, responses are never linked to a staff member\'s identity. Recommended for sensitive topics.'),
        ('Add questions', 'Click "+ Add Question". Choose a type, write the question text, and (for multiple choice) add your options.'),
        ('Set audience', 'Under Audience, choose the target org unit — system-wide, a specific hospital, department, or unit.'),
        ('Submit for approval', 'If your role requires it, click "Submit for Approval". An SVP or CNO will receive a notification to review.'),
        ('Activate', 'Once approved (or immediately if no approval needed), click Activate. Staff can now respond.'),
    ]
    for row in numbered_steps(steps):
        elems.append(row)
    elems.append(spacer(8))

    elems.append(callout('example', 'Example — Director creating a pulse survey', [
        '<b>Maria Johnson (Director of Nursing)</b> wants to check in on the Float Pool unit after recent complaints.',
        'She creates a survey titled <i>"Float Pool — March Pulse"</i> with 5 questions (the maximum allowed for Directors), '
        'targets it to the <b>Float Pool — Inpatient</b> unit, sets it to anonymous, and submits for approval. '
        'CNO Claire Nguyen approves it within 24 hours. Once Active, the 8 nurses in the unit receive it on their portal. '
        'Maria can see response counts and scores in Analytics once at least 3 responses are submitted.',
    ]))
    elems.append(spacer(8))

    elems.append(h3('Limitations to be aware of'))
    elems.extend(bullet_list([
        '<b>Directors are capped at 5 questions</b> per survey by default (admin-configurable). This prevents survey fatigue at unit level.',
        '<b>Managers cannot create surveys</b> by default. They should request one via Speak Up or ask their Director.',
        '<b>Anonymous surveys are irreversible</b> — once a response is submitted anonymously, it cannot be traced back to the individual.',
        '<b>Survey scores below 70%</b> on any engagement dimension trigger the auto-issue creation system (see Issues section).',
    ]))

    elems.append(PageBreak())
    return elems

# ── Section 2: Announcements ──────────────────────────────────────────────────

def build_announcements():
    elems = []
    elems.append(section_header('2. Announcements', 'Broadcast messages to staff with targeting, scheduling, and acknowledgement tracking.'))
    elems.append(spacer(12))

    elems.append(h3('What is an announcement?'))
    elems.append(body(
        'Announcements are official messages pushed to staff. Unlike a chat message, they are tracked — '
        'you can see who has read them, who has acknowledged them, and who has not. They appear in the '
        'nurse/staff portal and in the leadership app.'
    ))

    elems.append(h3('Priority levels'))
    elems.append(data_table(
        heads=['Priority', 'What it means', 'How it appears'],
        rows=[
            ['Critical', 'Urgent — requires immediate attention',  'Red banner at the top of the portal. Staff cannot dismiss it until they acknowledge.'],
            ['High',     'Important but not an emergency',         'Highlighted in orange in the feed. Appears above normal messages.'],
            ['Medium',   'Standard update',                        'Normal position in the feed.'],
            ['Low',      'Informational only',                     'Appears at the bottom of the feed.'],
        ],
        col_widths=[2.5*cm, 5*cm, 8.5*cm],
    ))
    elems.append(spacer(6))

    elems.append(h3('Audience targeting options'))
    elems.append(body('You can target an announcement to any combination of the following:'))
    elems.append(data_table(
        heads=['Target', 'Who receives it', 'Example use'],
        rows=[
            ['System',      'Every user on the platform',          'Platform-wide downtime notice'],
            ['Hospital',    'All staff at a specific hospital',    'Franciscan Health Indianapolis policy update'],
            ['Department',  'All staff in a department',          'Float Pool scheduling change'],
            ['Unit',        'All staff on a specific unit',       'ICU equipment update'],
            ['Role',        'All users with a specific role',     'All Managers: new reporting deadline'],
            ['Combination', 'Mix of the above',                   'All Nurses at FH-Indy AND all Managers system-wide'],
        ],
        col_widths=[2.8*cm, 5.5*cm, 7.7*cm],
    ))
    elems.append(spacer(6))

    elems.append(h3('Scheduling and lifecycle'))
    elems.append(flow_diagram([
        {'label': 'Draft',     'sub': 'Being written'},
        {'label': 'Scheduled', 'sub': 'Set to publish later'},
        {'label': 'Published', 'sub': 'Live — staff can see it'},
        {'label': 'Expired',   'sub': 'Past expiry date'},
        {'label': 'Archived',  'sub': 'Manually archived'},
    ]))
    elems.append(body(
        'You can set a <b>publish date</b> (to send later) and an <b>expiry date</b> (to automatically hide it after a certain date). '
        'Pinned announcements appear at the top of the feed regardless of age.'
    ))
    elems.append(spacer(6))

    elems.append(h3('Acknowledgement requirement'))
    elems.append(body(
        'When you turn on <b>Requires Acknowledgement</b>, staff must tap a button to confirm they have read and '
        'understood the announcement. You can set an acknowledgement due date. Leadership sees a live % acknowledged metric.'
    ))
    elems.append(body(
        '<b>Critical announcements</b> always require acknowledgement — the staff portal will show a blocking banner until the nurse confirms.'
    ))
    elems.append(spacer(6))

    elems.append(callout('example', 'Example — Critical announcement with acknowledgement', [
        '<b>Scenario:</b> A new infection control protocol is mandatory for all nurses at Franciscan Health Indianapolis, effective immediately.',
        '→ <b>Priority:</b> Critical',
        '→ <b>Audience:</b> Hospital = Franciscan Health Indianapolis + Role = Nurse',
        '→ <b>Requires Acknowledgement:</b> Yes, due within 48 hours',
        '→ <b>Result:</b> Every nurse on their portal sees a red banner. They cannot navigate away without tapping "I Acknowledge". Leadership can see 14/22 acknowledged in real time.',
    ]))
    elems.append(spacer(8))

    elems.append(callout('example', 'Example — Scheduled informational announcement', [
        '<b>Scenario:</b> The manager wants to remind the Float Pool team about the new bi-weekly check-in starting next Monday.',
        '→ <b>Priority:</b> Medium',
        '→ <b>Audience:</b> Unit = Float Pool — Inpatient',
        '→ <b>Publish date:</b> Sunday evening (so it\'s there when they start Monday)',
        '→ <b>Expiry date:</b> 2 weeks after publish',
        '→ <b>Requires Acknowledgement:</b> No',
    ]))

    elems.append(PageBreak())
    return elems

# ── Section 3: Issues ─────────────────────────────────────────────────────────

def build_issues():
    elems = []
    elems.append(section_header('3. Issues from Surveys', 'How problems are identified from survey results, tracked, and resolved.'))
    elems.append(spacer(12))

    elems.append(h3('What is an issue?'))
    elems.append(body(
        'An issue represents a specific, named problem that needs to be investigated and fixed. Issues '
        'have an owner, a severity, a due date, and a full change history. They are the central object '
        'in the platform\'s improvement cycle.'
    ))

    elems.append(h3('Two ways to create an issue'))
    elems.append(data_table(
        heads=['Method', 'Description', 'Best for'],
        rows=[
            ['Manual creation',
             'You spot a problem and create the issue yourself. Go to Issues → New Issue, fill in the title, severity, and details.',
             'Escalations, Speak Up cases, things you observe on the floor that aren\'t captured in a survey.'],
            ['Auto-create from survey',
             'The platform analyses survey responses and creates issues automatically for every unit that scores below 70% in any engagement dimension.',
             'After a survey closes — run auto-create once and get a full issue list without manual work.'],
        ],
        col_widths=[3*cm, 7*cm, 6*cm],
    ))
    elems.append(spacer(6))

    elems.append(h3('How auto-create works'))
    elems.append(body('When you click <b>"Auto-Create from Survey"</b> and select a survey, the platform runs the following logic automatically:'))
    steps = [
        ('Calculates a score per dimension per unit',
         'The 10 engagement dimensions (Advocacy, Workload, Recognition, etc.) are each scored as a % of favourable responses for every org unit that responded.'),
        ('Flags units below 70%',
         'Any unit scoring below 70% on a dimension gets an issue created. Units above 70% are skipped.'),
        ('Sets severity automatically',
         'Score below 40% → Critical (P1). Score below 55% → High (P2). Otherwise → Medium (P3).'),
        ('Determines the issue level',
         'If the same dimension is low across all units at multiple hospitals → SYSTEM issue. If low across 3+ units at one hospital → HOSPITAL. If affecting 3+ units overall → DEPARTMENT. Otherwise → UNIT.'),
        ('Skips duplicates',
         'If an issue for that unit + dimension already exists and is still open, it is not created again. You see a "skipped N duplicates" count.'),
    ]
    for row in numbered_steps(steps):
        elems.append(row)
    elems.append(spacer(8))

    elems.append(callout('example', 'Example — Auto-create after the Float Pool survey closes', [
        'After the <i>"Float Pool — March Pulse"</i> survey closes, the SVP runs Auto-Create.',
        '→ Float Pool — Inpatient scored <b>48%</b> on Overall Experience → Issue created: <i>"Low Overall Experience — Float Pool"</i>, severity HIGH, P2',
        '→ Float Pool — Inpatient scored <b>61%</b> on Leadership Comms → Issue created: <i>"Low Leadership Comms — Float Pool"</i>, severity MEDIUM, P3',
        '→ Float Pool — Inpatient scored <b>72%</b> on Recognition → No issue (above threshold)',
        'Result: <b>2 issues created, 1 skipped</b> (above threshold). Both appear immediately in the Issues list.',
    ]))
    elems.append(spacer(8))

    elems.append(h3('Issue severity and priority'))
    elems.append(data_table(
        heads=['Severity', 'Score range', 'Priority', 'What it means'],
        rows=[
            ['Critical', 'Below 40%', 'P1', 'Requires immediate attention. Escalation likely.'],
            ['High',     '40–54%',    'P2', 'Serious problem. Action plan needed within days.'],
            ['Medium',   '55–69%',    'P3', 'Below threshold. Address within current cycle.'],
            ['Low',      '70%+',      'P4', 'Monitoring only — no issue created.'],
        ],
        col_widths=[3*cm, 3*cm, 2.5*cm, 7.5*cm],
    ))
    elems.append(spacer(6))

    elems.append(h3('Issue status lifecycle'))
    elems.append(flow_diagram([
        {'label': 'Open'},
        {'label': 'Action Planned'},
        {'label': 'In Progress'},
        {'label': 'Awaiting Validation'},
        {'label': 'Resolved'},
        {'label': 'Closed'},
    ]))
    elems.append(body(
        'An issue can also become <b>Blocked</b> (stuck, reason required) or be <b>Reopened</b> if the score drops again after resolution. '
        'Every status change is logged in the issue history.'
    ))

    elems.append(PageBreak())
    return elems

# ── Section 4: Action Plans ───────────────────────────────────────────────────

def build_action_plans():
    elems = []
    elems.append(section_header('4. Action Plans & Milestones', 'How you structure your response to an issue and track progress toward fixing it.'))
    elems.append(spacer(12))

    elems.append(h3('What does "Action Planned" mean?'))
    elems.append(body(
        'When an issue moves to <b>Action Planned</b> status, it means: <i>we know what the problem is, and we have a structured plan to fix it</i>. '
        'The action plan exists, the milestones are defined, but the actual work hasn\'t started yet.'
    ))
    elems.append(body(
        'It sits between <b>Open</b> (problem identified, no plan) and <b>In Progress</b> (plan is being executed). '
        'This separation is intentional — it helps leadership distinguish between issues that are being investigated versus ones where a concrete fix is underway.'
    ))

    # Building project analogy
    analogy_rows = [
        [Paragraph('Open', S['table_cell']),            Paragraph('→ We know the roof is leaking. No plan yet.', S['table_cell'])],
        [Paragraph('Action Planned', ParagraphStyle('ap', parent=S['table_cell'], textColor=BLUE_DARK, fontName='Helvetica-Bold')),
         Paragraph('→ Architect has drawn up the repair plan. Milestones defined. Workers not started yet.', S['table_cell'])],
        [Paragraph('In Progress', S['table_cell']),     Paragraph('→ Workers are on the roof. Fix is underway.', S['table_cell'])],
        [Paragraph('Awaiting Validation', S['table_cell']), Paragraph('→ Roof is repaired. Waiting for an inspector to confirm it\'s watertight.', S['table_cell'])],
    ]
    t = Table(analogy_rows, colWidths=[3.5*cm, 12.5*cm])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), GRAY_50),
        ('BOX', (0,0), (-1,-1), 0.5, GRAY_200),
        ('GRID', (0,0), (-1,-1), 0.25, GRAY_200),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    elems.append(t)
    elems.append(spacer(10))

    elems.append(h3('What is an action plan?'))
    elems.append(body('An action plan is the formal response to an issue. One issue can have one action plan. It contains:'))
    elems.append(data_table(
        heads=['Field', 'What to put here'],
        rows=[
            ['Title',                'Short name for the plan, e.g. "Float Pool Experience Improvement Plan"'],
            ['Objective',            'What you are trying to achieve, in plain language'],
            ['Root Cause Summary',   'Why the problem exists — the underlying causes, not just the symptoms'],
            ['Planned Actions',      'A numbered list of the high-level steps you will take'],
            ['Success Criteria',     'How you will know the plan worked — ideally a measurable target like "score ≥ 70%"'],
            ['Owner',                'The person accountable for the plan being executed'],
            ['End Date',             'When the plan should be fully completed'],
        ],
        col_widths=[4*cm, 12*cm],
    ))
    elems.append(spacer(6))

    elems.append(h3('What is a milestone?'))
    elems.append(body(
        'A milestone is a phase or checkpoint within the action plan. Each milestone has a title, a due date, '
        'and a status (Pending / Completed / Overdue).'
    ))
    elems.append(body(
        'Milestones break the plan into manageable phases, each with its own deadline. As milestones are completed, '
        'the action plan\'s progress percentage updates automatically.'
    ))
    elems.append(spacer(6))

    elems.append(callout('example', 'Example — Float Pool issue: Action Plan & Milestones', [
        '<b>Issue:</b> Low Overall Experience — Float Pool (score: 48%, target: 70%)',
        '<b>Action Plan:</b> "Float Pool Experience Improvement Plan"',
        '<b>Root Cause:</b> No standardised orientation when float nurses arrive at a new unit. Scheduling is reactive. No regular touchpoint with management.',
        '<b>Success Criteria:</b> Overall Experience ≥ 70% in the follow-up pulse survey.',
        '',
        'Phase 1 — Root Cause Investigation · Due in 2 weeks · 4 tasks',
        'Phase 2 — Protocol Redesign · Due in 5 weeks · 4 tasks',
        'Phase 3 — Implementation & Training · Due in 8 weeks · 4 tasks',
        'Phase 4 — Follow-up Survey & Validation · Due in 11 weeks · 3 tasks',
    ]))
    elems.append(spacer(8))

    elems.append(h3('Progress tracking'))
    elems.append(body(
        'The action plan\'s progress bar updates automatically as milestones are marked complete. '
        'For example, if there are 4 milestones and 1 is completed, the plan shows <b>25% progress</b>. '
        'You can also manually override the progress % if needed.'
    ))
    elems.append(spacer(6))
    elems.append(callout('tip', 'Tip: When to move the issue from Action Planned → In Progress', [
        'Move the issue to <b>In Progress</b> when the first task from Phase 1 has been started — not when the plan is just written. '
        'The status should reflect reality on the ground.',
    ]))

    elems.append(PageBreak())
    return elems

# ── Section 5: Tasks ──────────────────────────────────────────────────────────

def build_tasks():
    elems = []
    elems.append(section_header('5. Tasks & Milestones', 'The individual work items that make milestones happen.'))
    elems.append(spacer(12))

    elems.append(h3('The full hierarchy'))
    elems.append(mono_block([
        'Issue',
        '    └── Action Plan',
        '              └── Milestone (Phase 1, Phase 2, ...)',
        '                          └── Tasks (the actual work)',
    ]))
    elems.append(spacer(6))
    elems.append(body(
        'Tasks are the concrete, assignable work items. Each task has one owner, a due date, a status, '
        'and a priority. Tasks are linked to an issue — they represent the work being done to resolve it. '
        'Milestones group tasks into phases conceptually; when all tasks for a phase are done, you mark '
        'the milestone as complete.'
    ))

    elems.append(h3('Task statuses'))
    elems.append(data_table(
        heads=['Status', 'Meaning', 'What to do next'],
        rows=[
            ['To Do',       'Not started yet',                           'Assign to someone and set a due date if not done already'],
            ['In Progress', 'Currently being worked on',                 'Update the task when done or if you hit a blocker'],
            ['Blocked',     'Cannot proceed — something is in the way',  'Add a note explaining the blocker. Escalate if needed.'],
            ['Done',        'Completed',                                  'If it was the last task in a milestone phase, mark the milestone complete'],
            ['Cancelled',   'No longer needed',                          'Add a reason in the description so the history is clear'],
        ],
        col_widths=[2.8*cm, 5*cm, 8.2*cm],
    ))
    elems.append(spacer(6))

    elems.append(h3('Task priority'))
    elems.append(data_table(
        heads=['Priority', 'When to use'],
        rows=[
            ['High',   'Must be done in this phase — blocking progress if missed'],
            ['Medium', 'Important but not blocking'],
            ['Low',    'Nice to have — will do if time allows'],
        ],
        col_widths=[3*cm, 13*cm],
    ))
    elems.append(spacer(6))

    elems.append(h3('How tasks relate to milestones — in practice'))
    elems.append(body(
        'Milestones define <i>what phase</i> you are in. Tasks define <i>what work</i> needs to happen in that phase. '
        'The connection is conceptual, not technical. The convention is:'
    ))
    conv = Table([[Paragraph(
        '<b>Convention:</b> Complete all tasks belonging to a phase, then mark the milestone as complete. '
        'The milestone\'s due date should align with the last task in its phase.',
        S['callout_body']
    )]], colWidths=[16*cm])
    conv.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), BLUE_LIGHT),
        ('BOX', (0,0), (-1,-1), 1, BLUE_BORDER),
        ('TOPPADDING', (0,0), (-1,-1), 8),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEFTPADDING', (0,0), (-1,-1), 12),
        ('RIGHTPADDING', (0,0), (-1,-1), 12),
    ]))
    elems.append(conv)
    elems.append(spacer(8))

    elems.append(callout('example', 'Example — Float Pool Phase 1 tasks driving the milestone', [
        '<b>Milestone:</b> Phase 1 — Root Cause Investigation · Due in 2 weeks',
        '• Conduct 1:1 interviews with float pool nurses → James Lee · High · due in 10 days',
        '• Review float pool assignment history (90 days) → James Lee · Medium · due in 8 days',
        '• Analyse Speak Up submissions related to float pool → Maria Johnson · Medium · due in 10 days',
        '• Survey float pool coordinator on process gaps → James Lee · Medium · due in 12 days',
        '',
        'Once all four tasks are Done, James clicks ✓ on the Phase 1 milestone. The action plan progress moves to 25%. The issue should then move to In Progress to begin Phase 2.',
    ]))
    elems.append(spacer(8))

    elems.append(h3('Subtasks'))
    elems.append(body(
        'A task can have subtasks — smaller steps under a parent task. For example, the task '
        '"Conduct 1:1 interviews with float pool nurses" could have subtasks for each individual nurse interview. '
        'Subtasks appear inside the parent task\'s detail panel.'
    ))

    elems.append(h3('Finding your tasks'))
    elems.append(body(
        'Go to <b>Tasks</b> in the sidebar. Use the <b>"My Tasks"</b> toggle to filter to only tasks assigned to you. '
        'Use the <b>Overdue</b> filter to see what\'s late. Click any task row to open the detail panel, '
        'which shows the linked issue, subtasks, and lets you update the status in one click.'
    ))
    elems.append(spacer(6))
    elems.append(callout('tip', 'Quick tip — status updates from the list', [
        'You don\'t need to open the detail panel to update a task\'s status. On the task list, click the status badge directly '
        'to get a dropdown of valid next statuses. This is the fastest way to move tasks forward during a daily standup or check-in.',
    ]))

    elems.append(PageBreak())
    return elems

# ── Section 6: Analytics ──────────────────────────────────────────────────────

def build_analytics():
    elems = []
    elems.append(section_header('6. Analytics', 'Understand participation, engagement scores, low-performing units, and root causes — in one place.'))
    elems.append(spacer(12))

    elems.append(h3('What is the Analytics page?'))
    elems.append(body(
        'The Analytics page is the organisation\'s engagement command centre. Every time a survey closes, its '
        'results flow automatically into these charts. You don\'t need to import or calculate anything — the '
        'platform does it for you. Use it to spot which units are struggling, which dimensions are declining, '
        'and whether root causes are being addressed.'
    ))

    elems.append(h3('The four panels'))
    elems.append(data_table(
        heads=['Panel', 'What it shows', 'When to use it'],
        rows=[
            ['Participation',           'Response count and rate for the selected survey (bar chart)',       'First check — if participation is below 60% the scores may not be representative'],
            ['Score Trends',            'Line chart of all 10 engagement dimensions over time',              'Spot upward or downward trends. Compare before vs. after an action plan.'],
            ['Low-Performing Units',    'Table of org units where any dimension is below threshold',         'Triage. These units likely need an issue created or already have one open.'],
            ['Root Cause & Sentiment',  'Donut chart of root cause categories + top theme cards',           'Understand WHY scores are low, not just where.'],
        ],
        col_widths=[3.5*cm, 6.5*cm, 6*cm],
    ))
    elems.append(spacer(6))

    elems.append(h3('Score colour thresholds'))
    elems.append(body('Every score on the platform is coloured the same way, across every chart, table, and heatmap cell.'))
    elems.append(data_table(
        heads=['Score range', 'Label', 'What it means'],
        rows=[
            ['≥ 75 %',   'Strong',   'Healthy — no action required'],
            ['60 – 74 %','Good',     'Acceptable — monitor quarterly'],
            ['45 – 59 %','Fair',     'Below target — create an issue and action plan'],
            ['30 – 44 %','Poor',     'Serious — escalate to Director / VP'],
            ['< 30 %',   'Critical', 'Crisis — immediate SVP escalation required'],
        ],
        col_widths=[3*cm, 3*cm, 10*cm],
    ))
    elems.append(spacer(6))

    elems.append(h3('The 10 engagement dimensions'))
    elems.append(body(
        'The platform tracks engagement across 10 dimensions. Each is measured independently so leadership can '
        'act on a specific pain point rather than a vague "low engagement" headline.'
    ))
    elems.append(data_table(
        heads=['Dimension', 'What it measures'],
        rows=[
            ['Advocacy',                'Would staff recommend this workplace to others?'],
            ['Organizational Pride',    'Do staff feel proud to work here?'],
            ['Workload & Wellbeing',    'Is the workload sustainable? Are staff burning out?'],
            ['Meaningful Work',         'Do staff feel their work matters and makes a difference?'],
            ['Recognition',             'Are staff acknowledged for good work?'],
            ['Leadership Communication','Does leadership share clear, honest, timely information?'],
            ['Psychological Safety',    'Can staff speak up without fear of retaliation?'],
            ['Manager Feedback',        'Does the direct manager give useful, regular feedback?'],
            ['Professional Growth',     'Are there learning and advancement opportunities?'],
            ['Overall Experience',      'Holistic satisfaction — a summary dimension'],
        ],
        col_widths=[5*cm, 11*cm],
    ))
    elems.append(spacer(6))

    elems.append(callout('example', 'Example — Float Pool analytics', [
        'After closing the Q1 Float Pool survey the analytics page shows:',
        '• Participation: 72 % (good — scores are reliable)',
        '• Overall Experience: 48 % [Fair] — triggered auto-issue creation',
        '• Workload & Wellbeing: 38 % [Poor] — lowest dimension',
        '• Root cause: 61 % of open-text comments tagged "Scheduling Burden"',
        '',
        'This tells the director: the Float Pool unit\'s main problem is scheduling, not recognition or leadership. The action plan should prioritise scheduling improvements first.',
    ]))
    elems.append(spacer(8))

    elems.append(h3('What is eNPS?'))
    elems.append(body(
        'eNPS (Employee Net Promoter Score) appears in the SVP Dashboard. It is calculated from the Advocacy '
        'dimension: staff answer "How likely are you to recommend this organisation as a place to work?" on a 0–10 scale.'
    ))
    elems.append(mono_block(['eNPS = % Promoters (9-10)  -  % Detractors (0-6)']))
    elems.append(body(
        'A score above 0 means more promoters than detractors. Above +20 is considered good for healthcare. '
        'Below −20 is a red flag that requires executive attention.'
    ))
    elems.append(spacer(6))

    elems.append(h3('The SVP Dashboard — 5 tabs explained'))
    elems.append(body('The SVP Dashboard is a senior leadership view accessible via <b>Analytics → SVP Dashboard</b>. '
                      'It combines data from all hospitals into a single screen. There are five tabs:'))
    elems.append(data_table(
        heads=['Tab', 'What it contains', 'Best used by'],
        rows=[
            ['Executive',  '6 KPI cards (Overall Engagement %, eNPS, Response Count, Low-performing Units, Open Issues, Overdue Tasks), risk alert banner, top 5 problem areas, and a list of the lowest-performing units', 'SVP / CNO — quick 60-second system health check'],
            ['Heatmap',    'Color-coded grid: each row is a hospital, each column is one of the 10 dimensions. Click any cell to drill down into that unit.',                                                               'VP / Director — identify which hospitals have which dimension problems'],
            ['Execution',  'Bar charts showing issues and tasks broken down by status, plus a severity breakdown and a "stuck items" table (issues that haven\'t moved in 14+ days)',                                      'Program managers — are action plans actually progressing?'],
            ['Leaders',    'Accountability scorecard per manager/director: task completion rate, milestone hit rate, and an execution grade (A–F)',                                                                        'SVP / VP — hold leaders accountable for follow-through'],
            ['Trends',     'Line chart of burnout/wellbeing scores over time, plus a list of units flagged as retention risks (low Advocacy scores)',                                                                      'CNO / HR — long-range wellbeing and retention monitoring'],
        ],
        col_widths=[2.5*cm, 7.5*cm, 6*cm],
    ))
    elems.append(spacer(6))
    elems.append(callout('tip', 'Tip: Use the survey selector to compare cycles', [
        'At the top of the Analytics page there is a survey selector dropdown. Switch between surveys (Q1, Q2, annual) to compare results side by side or see how scores changed after an action plan closed. '
        'The SVP Dashboard always aggregates the <i>most recent closed survey</i> per hospital unless you select a specific cycle.',
    ]))
    elems.append(spacer(8))

    elems.append(h3('Who can see analytics?'))
    elems.append(data_table(
        heads=['Role', 'Main Analytics page', 'SVP Dashboard'],
        rows=[
            ['SVP',          'Yes',               'Yes'],
            ['CNO / CNP',    'Yes',               'Yes'],
            ['VP',           'Yes',               'Read only'],
            ['Director',     'Own units only',    'No'],
            ['Manager',      'Own unit only',     'No'],
            ['Nurse / Staff','No',                'No'],
        ],
        col_widths=[4*cm, 6*cm, 6*cm],
    ))

    elems.append(PageBreak())
    return elems

# ── Section 7: Program Flow ───────────────────────────────────────────────────

def build_program_flow():
    elems = []
    elems.append(section_header('7. Program Flow', 'Track where every org unit is in the transformation cycle — from survey setup through to validated improvement.'))
    elems.append(spacer(12))

    elems.append(h3('What is Program Flow?'))
    elems.append(body(
        'Program Flow is the operational backbone of the platform. It shows, at a glance, exactly which stage '
        'each org unit (hospital, department, or unit) is in for the current engagement cycle. Think of it as '
        'a Kanban board for the entire organisation\'s transformation journey — every unit moves through the '
        'same six stages, but at its own pace.'
    ))
    elems.append(body(
        'Program Flow does not replace the Issues or Tasks pages. Instead it gives senior leadership a '
        'bird\'s-eye view: "Is 4W ICU still in root cause analysis? Has the Float Pool unit started '
        'communication yet?" — all without clicking into individual records.'
    ))

    elems.append(h3('The six stages'))
    elems.append(flow_diagram([
        {'label': 'Survey Setup',     'sub': 'SLA: 7 days'},
        {'label': 'Survey Execution', 'sub': 'SLA: 21 days'},
        {'label': 'Root Cause',       'sub': 'SLA: 14 days'},
        {'label': 'Remediation',      'sub': 'SLA: 45 days'},
        {'label': 'Communication',    'sub': 'SLA: 7 days'},
        {'label': 'Validation',       'sub': 'SLA: 21 days'},
    ]))
    elems.append(spacer(6))
    elems.append(data_table(
        heads=['Stage', 'What should be happening', 'Done when...'],
        rows=[
            ['Survey Setup',     'Questions written, target audience configured, approval obtained',           'Survey is published and open for responses'],
            ['Survey Execution', 'Staff are responding; reminders sent; participation tracked daily',          'Survey closes with ≥ 60% participation'],
            ['Root Cause',       'Results analysed; low-score dimensions investigated; issues being created',  'All issues for the cycle are created and assigned'],
            ['Remediation',      'Action plans running; tasks being completed; milestones hit',                'All action plan milestones are marked complete'],
            ['Communication',    'Leaders share outcomes and progress updates with staff',                     'Announcement published confirming actions taken'],
            ['Validation',       'Follow-up pulse survey sent; scores compared to baseline',                   'Pulse results show improvement (or issue is reopened)'],
        ],
        col_widths=[3*cm, 6.5*cm, 6.5*cm],
    ))
    elems.append(spacer(6))

    elems.append(h3('Stage states'))
    elems.append(body('Each unit\'s stage cell shows one of four states. These are colour-coded in the grid:'))
    elems.append(data_table(
        heads=['State', 'Meaning', 'What to do'],
        rows=[
            ['Not Started', 'This stage hasn\'t begun yet',                                                    'Normal — wait for the previous stage to complete'],
            ['In Progress',  'Stage is active and within its SLA window',                                      'Monitor — no action needed unless it goes stale'],
            ['Completed',    'Stage finished and signed off',                                                  'Great — the unit advances to the next stage automatically'],
            ['Blocked',      'A blocker is preventing progress (missing owner, missing approval, etc.)',        'Assign an owner or escalate to the VP / SVP'],
        ],
        col_widths=[3*cm, 7*cm, 6*cm],
    ))
    elems.append(spacer(6))

    elems.append(h3('SLA warnings and staleness'))
    elems.append(body(
        'Each stage has a default SLA (days allowed). If a unit has been in a stage longer than its SLA, the '
        'cell turns <b>amber</b> and shows an "Over SLA" chip. If no activity has been logged in the last 7 days, '
        'the cell shows a <b>Stale</b> indicator — meaning the unit is technically in progress but no one has touched it recently.'
    ))
    elems.append(callout('note', 'Note: SLAs are default targets, not hard deadlines', [
        'Exceeding an SLA triggers a visual warning and surfaces the unit in the "Stuck Items" table on the SVP Execution tab. '
        'It does not automatically block the unit or send external notifications. A director or VP should investigate when they see an over-SLA warning.',
    ]))
    elems.append(spacer(8))

    elems.append(h3('Hospital-level aggregate view'))
    elems.append(body(
        'The top rows of the Program Flow grid show <b>hospital-level aggregates</b>. An aggregate cell summarises all the departments or units underneath it:'
    ))
    elems.append(data_table(
        heads=['Aggregate shows', 'Meaning'],
        rows=[
            ['All Completed',       'Every unit under this hospital has finished this stage'],
            ['X of Y complete',     'Some units have finished, some haven\'t'],
            ['Blocked (any)',        'At least one unit under this hospital is blocked — requires attention'],
            ['Over SLA (X units)',   'X units have exceeded the stage SLA — escalation recommended'],
        ],
        col_widths=[5*cm, 11*cm],
    ))
    elems.append(spacer(6))

    elems.append(callout('example', 'Example — reading a Program Flow row', [
        'You see the following row for <b>FH Indianapolis — Float Pool</b>:',
        'Survey Setup: Completed | Survey Execution: Completed | Root Cause: Completed | Remediation: In Progress ⚠ Over SLA | Communication: Not Started | Validation: Not Started',
        '',
        'This tells you: root cause is done, but remediation (action plans) is running over SLA. Float Pool\'s action plan milestones need to be checked — are tasks blocked? Is the milestone due date past? '
        'Click into the Remediation cell to see the linked issues.',
    ]))
    elems.append(spacer(8))

    elems.append(h3('KPI cards and smart alerts'))
    elems.append(body(
        'Above the Program Flow grid, a row of KPI cards gives you a system-wide snapshot: total units in '
        'each stage, overall cycle completion percentage, and how many units are blocked or over SLA. '
        'A smart alert banner appears when critical conditions exist, for example:'
    ))
    elems.extend(bullet_list([
        '3 units have been Blocked for more than 5 days — immediate action required.',
        '7 units are over SLA in the Remediation stage. Review action plan progress.',
        '12 units have reached Validation — pulse surveys should be sent this week.',
    ]))
    elems.append(spacer(8))

    elems.append(h3('How to use Program Flow day-to-day'))
    elems.append(data_table(
        heads=['Who', 'What to look for', 'Typical action'],
        rows=[
            ['SVP',      'Any red (Blocked) or amber (Over SLA) cells across the whole grid; KPI cards',  'Call the relevant VP to unblock; check the Execution tab for stuck issues'],
            ['VP',       'Units in your hospitals that are stale or blocked',                              'Reach out to the Director to investigate; reassign ownership if needed'],
            ['Director', 'Your unit\'s current stage and whether any SLA chip is showing',               'Progress tasks, complete milestones, or log a blocker reason'],
            ['Manager',  'Usually does not use Program Flow directly — use the Tasks page instead',       'Mark tasks Done; Director will advance the stage'],
        ],
        col_widths=[2.5*cm, 7*cm, 6.5*cm],
    ))
    elems.append(spacer(6))
    elems.append(callout('tip', 'Tip: Program Flow is read-only for most roles', [
        'Directors and above can see Program Flow. Managers and staff do not have access. '
        'Advancing a stage is done automatically by the platform when the completion criteria are met — you cannot manually tick a stage as "done" unless you are an Admin or SVP. '
        'If a stage appears stuck, check that all the underlying issues and milestones are actually complete.',
    ]))
    elems.append(spacer(8))

    elems.append(h3('How Program Flow connects to the rest of the platform'))
    elems.append(mono_block([
        'Survey (Survey Setup + Execution stages)',
        '    └── Issues auto-created (Root Cause stage)',
        '              └── Action Plans + Milestones (Remediation stage)',
        '                          └── Tasks completed by managers (Remediation stage)',
        '    └── Announcement published (Communication stage)',
        '    └── Pulse survey validates improvement (Validation stage)',
    ]))
    elems.append(body(
        'Program Flow is the thread that connects all the other features. When you are unsure where a unit '
        'is in its engagement cycle, start here — it will point you to the right page.'
    ))

    return elems

# ── Page number canvas callback ───────────────────────────────────────────────

def add_page_number(canvas, doc):
    canvas.saveState()
    canvas.setFont('Helvetica', 8)
    canvas.setFillColor(GRAY_500)
    canvas.drawCentredString(
        doc.pagesize[0] / 2,
        1.2*cm,
        f'Workforce Transformation Platform  ·  Help Centre  ·  Page {canvas.getPageNumber()}'
    )
    canvas.restoreState()

# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    output = '/Users/johnthomas/workforce-platform/help-documentation.pdf'

    doc = SimpleDocTemplate(
        output,
        pagesize=A4,
        leftMargin=2.5*cm,
        rightMargin=2.5*cm,
        topMargin=2*cm,
        bottomMargin=2*cm,
        title='Workforce Transformation Platform — Help Centre',
        author='Workforce Platform',
    )

    story = []
    story += build_cover()
    story += build_surveys()
    story += build_announcements()
    story += build_issues()
    story += build_action_plans()
    story += build_tasks()
    story += build_analytics()
    story += build_program_flow()

    doc.build(story, onFirstPage=add_page_number, onLaterPages=add_page_number)
    print(f'PDF generated: {output}')

if __name__ == '__main__':
    main()
