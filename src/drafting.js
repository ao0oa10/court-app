import { REQUEST_LABELS } from './constants.js';
import { partyName, pronoun, representativeTitle, verb } from './grammar.js';

function attendanceLine(party, answer) {
  if (!answer || answer.attended === undefined) return null;
  if (answer.attended === 'no') return `${verb(party.gender, 'absent')} ${partyName(party)}.`;
  if (answer.attended !== 'yes' || !answer.repType) return null;
  const representativeGender = answer.repType === 'self' ? party.gender : (answer.repGender || 'M');
  let text;
  if (answer.repType === 'self') {
    text = `${verb(representativeGender, 'attend')} ${partyName(party)} بشخص${pronoun(party.gender, party.count)}`;
  } else if (answer.repType === 'gov') {
    text = `${verb(representativeGender, 'attend')} ${representativeTitle('gov', 'M')}`;
    if (answer.repName) text += ` "${answer.repName}"`;
    if (answer.govEntity) text += ` عن "${answer.govEntity}"`;
  } else {
    text = `${verb(representativeGender, 'attend')} ${representativeTitle(answer.repType, answer.repGender || 'M')} ${partyName(party, true)}`;
    if (answer.repName) text += ` "${answer.repName}"`;
  }
  if (answer.mode === 'virtual') text += ' عن طريق الاتصال المرئي';
  if (answer.verified === 'yes') text += ` والمحكمة تحققت من هويت${pronoun(representativeGender, 'S')} بواقع بطاقة الهوية`;
  return `${text.replace(/\s+/g, ' ').trim()}.`;
}

function requestLine(party, answer) {
  if (!answer || answer.attended !== 'yes' || !answer.request || answer.request === 'none') return null;
  const gender = answer.repType === 'self' ? party.gender : (answer.repGender || 'M');
  const subject = answer.repType === 'self' ? partyName(party) : `${gender === 'F' ? 'الحاضرة' : 'الحاضر'} عن ${partyName(party, true)}`;
  const request = answer.request === 'custom' ? (answer.customRequest || '') : REQUEST_LABELS[answer.request];
  if (!request.trim()) return null;
  return `و${verb(gender, 'request')} ${subject} ${request.trim()}.`;
}

export function generateDraft(record) {
  if (!record) return '';
  const parties = record.parties || [];
  const answers = record.answers || {};
  const answered = parties.filter(p => answers[p.id]?.attended);
  if (!answered.length) return '';
  const allAbsent = answered.length === parties.length && parties.length > 0 && parties.every(p => answers[p.id]?.attended === 'no');
  const attendance = allAbsent ? ['لم يحضر أحد.'] : parties.map(p => attendanceLine(p, answers[p.id])).filter(Boolean);
  const requests = parties.map(p => requestLine(p, answers[p.id])).filter(Boolean);
  return [...attendance, ...(requests.length ? ['', ...requests] : [])].join('\n').trim();
}
