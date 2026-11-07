import test from 'node:test';
import assert from 'node:assert/strict';
import { generateDraft } from '../src/drafting.js';
import { partyBaseName, partyName } from '../src/grammar.js';

const party = (id, role, gender='M', count='S') => ({ id, role, gender, count, order:0 });
test('يستخدم عبارة لم يحضر أحد عند غياب جميع الأطراف', () => {
  const p1=party('1','plaintiff'), p2=party('2','defendant');
  assert.equal(generateDraft({ parties:[p1,p2], answers:{1:{attended:'no'},2:{attended:'no'}} }), 'لم يحضر أحد.');
});
test('يفصل الحضور عن بعد ويثبت الهوية عند الإجابة بنعم', () => {
  const p=party('1','plaintiff');
  assert.match(generateDraft({ parties:[p], answers:{1:{attended:'yes',repType:'self',mode:'virtual',verified:'yes'}} }), /عن طريق الاتصال المرئي/);
  assert.match(generateDraft({ parties:[p], answers:{1:{attended:'yes',repType:'self',mode:'virtual',verified:'yes'}} }), /تحققت من هويته/);
});
test('يولد صياغة الوكيل والطلب المخصص', () => {
  const p=party('1','defendant','F');
  const text=generateDraft({ parties:[p], answers:{1:{attended:'yes',repType:'agent',repGender:'F',repName:'سارة',request:'custom',customRequest:'أجلاً للرد'}}});
  assert.match(text,/وكيلة المدعى عليها/);
  assert.match(text,/وطلبت الحاضرة عن المدعى عليها أجلاً للرد/);
});
test('يدعم المثنى في الرفع والنصب', () => {
  assert.equal(partyBaseName('plaintiff','M','D'), 'المدعيان');
  assert.equal(partyBaseName('plaintiff','M','D',true), 'المدعيين');
  assert.equal(partyName({role:'defendant',gender:'M',count:'D',order:0}), 'المدعى عليهما');
});
test('يظهر اسم الطرف في الصياغة دون تغيير المسمى القانوني', () => {
  const p = { ...party('1', 'plaintiff'), name: 'شركة النور' };
  const text = generateDraft({ parties:[p], answers:{1:{attended:'yes',repType:'self'}} });
  assert.match(text, /المدعي "شركة النور"/);
});
test('يصوغ المستشارة الحكومية المؤنثة بصيغة المؤنث', () => {
  const p = party('1', 'plaintiff');
  const text = generateDraft({ parties:[p], answers:{1:{attended:'yes',repType:'gov',repGender:'F',repName:'سارة'}}});
  assert.match(text, /حضرت مستشارة إدارة قضايا الحكومة/);
});
