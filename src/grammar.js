import { ROLE_LABELS } from './constants.js';

const isFeminine = (gender) => gender === 'F' || gender === 'C';

export function partyBaseName(role, gender, count, genitive = false) {
  if (role === 'plaintiff') {
    if (gender === 'M') return { S: 'المدعي', D: genitive ? 'المدعيين' : 'المدعيان', P: genitive ? 'المدعين' : 'المدعون' }[count];
    if (gender === 'F') return { S: 'المدعية', D: genitive ? 'المدعيتين' : 'المدعيتان', P: 'المدعيات' }[count];
    return 'الجهة المدعية';
  }
  if (role === 'defendant') {
    if (gender === 'M') return { S: 'المدعى عليه', D: 'المدعى عليهما', P: 'المدعى عليهم' }[count];
    return { S: 'المدعى عليها', D: 'المدعى عليهما', P: 'المدعى عليهن' }[count];
  }
  if (gender === 'M') return { S: 'الخصم المدخل', D: genitive ? 'الخصمين المدخلين' : 'الخصمان المدخلان', P: genitive ? 'الخصوم المدخلين' : 'الخصوم المدخلون' }[count];
  return 'الجهة المدخلة';
}

export function partyName(party, genitive = false) {
  const suffixes = isFeminine(party.gender)
    ? { 1: 'الأولى', 2: 'الثانية', 3: 'الثالثة', 4: 'الرابعة' }
    : { 1: 'الأول', 2: 'الثاني', 3: 'الثالث', 4: 'الرابع' };
  const base = partyBaseName(party.role, party.gender, party.count, genitive);
  return `${base}${party.order > 0 ? ` ${suffixes[party.order] || ''}` : ''}`.trim();
}

export function pronoun(gender, count) {
  if (count === 'D') return 'هما';
  if (count === 'P') return gender === 'F' ? 'هن' : 'هم';
  return isFeminine(gender) ? 'ها' : 'ه';
}
export function verb(gender, action) {
  const feminine = isFeminine(gender);
  if (action === 'attend') return feminine ? 'حضرت' : 'حضر';
  if (action === 'absent') return feminine ? 'لم تحضر' : 'لم يحضر';
  if (action === 'request') return feminine ? 'طلبت' : 'طلب';
  return action;
}
export function representativeTitle(type, gender) {
  if (type === 'agent') return gender === 'F' ? 'وكيلة' : 'وكيل';
  if (type === 'rep') return gender === 'F' ? 'ممثلة' : 'ممثل';
  if (type === 'manager') return gender === 'F' ? 'مديرة' : 'مدير';
  return gender === 'F' ? 'مستشارة إدارة قضايا الحكومة' : 'مستشار إدارة قضايا الحكومة';
}
export function roleLabel(role) { return ROLE_LABELS[role] || role; }
