export const APP_VERSION = '2.0.0';
export const SECTIONS = [
  { id: 'session', label: 'بيانات الجلسة', short: 'البيانات' },
  { id: 'parties', label: 'الأطراف', short: 'الأطراف' },
  { id: 'attendance', label: 'الحضور', short: 'الحضور' },
  { id: 'requests', label: 'الطلبات', short: 'الطلبات' },
  { id: 'review', label: 'المراجعة', short: 'المراجعة' }
];
export const ROLE_LABELS = { plaintiff: 'مدعي', defendant: 'مدعى عليه', intervener: 'خصم مدخل' };
export const GENDER_LABELS = { M: 'ذكر', F: 'أنثى', C: 'شركة أو جهة اعتبارية' };
export const COUNT_LABELS = { S: 'مفرد', D: 'مثنى', P: 'جمع' };
export const ORDER_LABELS = { 0: 'بدون ترتيب', 1: 'الأول', 2: 'الثاني', 3: 'الثالث', 4: 'الرابع' };
export const REQUEST_LABELS = {
  none: 'بدون طلب',
  reserve: 'حجز الدعوى للحكم',
  reject: 'رفض الدعوى',
  delay: 'أجل للرد والتعقيب',
  investigate: 'إحالة الدعوى للتحقيق',
  custom: 'طلب مخصص'
};
export const ATTENDANCE_LABELS = { yes: 'حضر', no: 'لم يحضر' };
export const MODE_LABELS = { physical: 'حضوري', virtual: 'عن بُعد / اتصال مرئي' };
export const REP_LABELS = { self: 'بشخصه', agent: 'وكيل', rep: 'ممثل', manager: 'مدير', gov: 'مستشار حكومي' };

export function newParty(role, order = 1) {
  return { id: crypto.randomUUID(), role, order, gender: 'M', count: 'S', name: '' };
}
export function newRecord() {
  return {
    schemaVersion: APP_VERSION,
    id: crypto.randomUUID(),
    meta: { caseNumber: '', title: '', date: new Date().toISOString().slice(0, 10) },
    parties: [newParty('plaintiff'), newParty('defendant')],
    answers: {},
    manualText: null,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
}
