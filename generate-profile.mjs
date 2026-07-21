import { readFile, writeFile } from 'node:fs/promises';

const COLORS = {
  keyword: '#FF7B72',
  variable: '#79C0FF',
  key: '#00FF9C',
  string: '#A5D6FF',
  punct: '#C9D1D9',
  muted: '#8B949E',
  bright: '#E6EDF3',
  lineNo: '#6E7681',
  accent: '#00FF9C',
};

const CHAR_WIDTH = 9.03;
const MAX_LINE_CHARS = 85;

const esc = (s) =>
  String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

const tspan = (text, color, bold = false) =>
  `<tspan fill="${color}"${bold ? ' font-weight="700"' : ''}>${esc(text)}</tspan>`;

const lineLength = (tokens) => tokens.reduce((n, t) => n + t.text.length, 0);

const warnIfTooLong = (name, tokens) => {
  const len = lineLength(tokens);
  if (len > MAX_LINE_CHARS) {
    console.warn(`warning: ${name} line is ${len} chars (max ~${MAX_LINE_CHARS}) — may overflow: "${tokens.map((t) => t.text).join('')}"`);
  }
};

const kw = (text) => ({ text, color: COLORS.keyword });
const vr = (text) => ({ text, color: COLORS.variable });
const key = (text) => ({ text, color: COLORS.key });
const str = (text) => ({ text, color: COLORS.string });
const punct = (text) => ({ text, color: COLORS.punct });

const quoteList = (items) => items.map((i) => `"${i}"`).join(', ');

const chromeHeader = (width, height) => `
  <rect x="1" y="1" width="${width - 2}" height="${height - 2}" rx="14" fill="#0D1117" stroke="#00FF9C" stroke-opacity="0.35" stroke-width="1.5"/>

  <path d="M1 15 A14 14 0 0 1 15 1 H${width - 15} A14 14 0 0 1 ${width - 1} 15 V40 H1 Z" fill="#161B22"/>
  <line x1="1" y1="40" x2="${width - 1}" y2="40" stroke="#00FF9C" stroke-opacity="0.15" stroke-width="1"/>

  <circle cx="26" cy="20" r="6.5" fill="#FF5F56"/>
  <circle cx="48" cy="20" r="6.5" fill="#FFBD2E"/>
  <circle cx="70" cy="20" r="6.5" fill="#27C93F"/>`;

const buildAboutLines = (about) => {
  const lines = [];
  lines.push({ indent: 0, tokens: [kw('const'), vr(' shubhanshu'), punct(' = {')] });

  for (const [name, value] of Object.entries(about)) {
    if (typeof value === 'string') {
      lines.push({ indent: 1, tokens: [key(name), punct(': '), str(`"${value}"`), punct(',')] });
    } else if (Array.isArray(value)) {
      lines.push({ indent: 1, tokens: [key(name), punct(': ['), str(quoteList(value)), punct('],')] });
    } else {
      lines.push({ indent: 1, tokens: [key(name), punct(': {')] });
      for (const [sub, items] of Object.entries(value)) {
        lines.push({ indent: 2, tokens: [key(sub), punct(': ['), str(quoteList(items)), punct('],')] });
      }
      lines.push({ indent: 1, tokens: [punct('},')] });
    }
  }

  lines.push({ indent: 0, tokens: [punct('};')] });
  lines.push({ blank: true });
  lines.push({ indent: 0, tokens: [kw('export default'), vr(' shubhanshu'), punct(';')], cursor: true });
  return lines;
};

const generateAbout = (about) => {
  const WIDTH = 900;
  const X_BY_INDENT = [70, 88, 106];
  const LINE_HEIGHT = 24;
  const FIRST_Y = 74;

  const lines = buildAboutLines(about);
  const height = FIRST_Y + (lines.length - 1) * LINE_HEIGHT + 32;

  let body = '';
  let lineNo = 0;

  lines.forEach((line, i) => {
    const y = FIRST_Y + i * LINE_HEIGHT;
    if (line.blank) return;

    lineNo += 1;
    warnIfTooLong(`about.svg #${lineNo}`, line.tokens);

    const x = X_BY_INDENT[line.indent];
    body += `
  <text x="44" y="${y}" text-anchor="end" class="mono" font-size="13" fill="${COLORS.lineNo}">${lineNo}</text>
  <text x="${x}" y="${y}" class="mono" font-size="15">${line.tokens.map((t) => tspan(t.text, t.color)).join('')}</text>`;

    if (line.cursor) {
      const cursorX = Math.round(x + lineLength(line.tokens) * CHAR_WIDTH + 8);
      body += `
  <rect x="${cursorX}" y="${y - 15}" width="10" height="19" fill="${COLORS.accent}" class="cursor"/>`;
    }
  });

  return `<svg width="${WIDTH}" height="${height}" viewBox="0 0 ${WIDTH} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <style>
    .mono { font-family: "SFMono-Regular", "SF Mono", Menlo, Consolas, "Liberation Mono", monospace; }
    .cursor { animation: blink 1.1s step-end infinite; }
    @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
  </style>
${chromeHeader(WIDTH, height)}

  <rect x="100" y="6" width="160" height="34" fill="#0D1117"/>
  <rect x="100" y="6" width="160" height="2" fill="${COLORS.accent}"/>
  <rect x="114" y="15" width="16" height="16" rx="3" fill="#3178C6"/>
  <text x="122" y="27" text-anchor="middle" class="mono" font-size="9" font-weight="700" fill="#FFFFFF">TS</text>
  <text x="140" y="27" class="mono" font-size="13" fill="${COLORS.bright}">about-me.ts</text>
  <text x="290" y="27" class="mono" font-size="13" fill="${COLORS.muted}">career.json</text>
${body}
</svg>
`;
};

const generateExperience = (experience) => {
  const WIDTH = 900;
  const FIELDS_FIRST_Y = 145;
  const FIELD_LINE_HEIGHT = 27;

  const { windowTitle, command, title, fields } = experience;
  const height = FIELDS_FIRST_Y + (fields.length - 1) * FIELD_LINE_HEIGHT + 27;

  let body = '';
  fields.forEach((field, i) => {
    const y = FIELDS_FIRST_Y + i * FIELD_LINE_HEIGHT;
    const valueTokens = [
      ...(field.highlight ? [{ text: field.highlight, color: COLORS.accent }] : []),
      { text: field.text, color: COLORS.punct },
    ];
    warnIfTooLong(`experience.svg ${field.label}`, valueTokens);

    const value = [
      field.highlight ? tspan(field.highlight, COLORS.accent, true) : '',
      tspan(field.text, COLORS.punct),
    ].join('');

    body += `
  <text x="112" y="${y}" text-anchor="end" class="mono" font-size="14" fill="${COLORS.muted}">${esc(field.label)}:</text>
  <text x="122" y="${y}" class="mono" font-size="14">${value}</text>`;
  });

  return `<svg width="${WIDTH}" height="${height}" viewBox="0 0 ${WIDTH} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <style>
    .mono { font-family: "SFMono-Regular", "SF Mono", Menlo, Consolas, "Liberation Mono", monospace; }
    .pulse { animation: pulse 2s ease-in-out infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
  </style>
${chromeHeader(WIDTH, height)}

  <text x="${WIDTH / 2}" y="24" text-anchor="middle" class="mono" font-size="13" fill="${COLORS.muted}">${esc(windowTitle)}</text>

  <text x="32" y="74" class="mono" font-size="15" font-weight="600">
    <tspan fill="${COLORS.accent}">$</tspan><tspan fill="${COLORS.punct}"> ${esc(command)}</tspan>
  </text>

  <circle cx="40" cy="107" r="6" fill="${COLORS.accent}" class="pulse"/>
  <text x="54" y="112" class="mono" font-size="16" font-weight="700">
    <tspan fill="${COLORS.bright}">${esc(title)}</tspan>
  </text>
${body}
</svg>
`;
};

const config = JSON.parse(await readFile('profile-config.json', 'utf8'));

await writeFile('about.svg', generateAbout(config.about));
console.log('generated about.svg');

await writeFile('experience.svg', generateExperience(config.experience));
console.log('generated experience.svg');
