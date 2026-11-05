import './styles.css';
import { APP_VERSION, ATTENDANCE_LABELS, COUNT_LABELS, GENDER_LABELS, MODE_LABELS, ORDER_LABELS, REP_LABELS, REQUEST_LABELS, ROLE_LABELS, SECTIONS, newParty, newRecord } from './constants.js';
import { partyName, roleLabel } from './grammar.js';
import { generateDraft } from './drafting.js';
import { resetDependentAnswers } from './questionnaire.js';
import { getRecord, listRecords, removeRecord, saveRecord } from './storage.js';

const root = document.querySelector('#app');
let record = null;
let section = 'session';
let archiveMode = true;
let search = '';
let saveTimer;

const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;' }[ch]));
const toast = message => { const el = document.querySelector('.toast'); if (!el) return; el.textContent = message; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 2600); };
const currentText = () => record?.manualText ?? generateDraft(record);
const rerender = () => { render(); queueSave(); };
const queueSave = () => { if (!record) return; clearTimeout(saveTimer); saveTimer = setTimeout(() => saveRecord(record).catch(() => toast('تعذر الحفظ المحلي')), 250); };
const update = (fn) => { fn(record); record.manualText = record.manualText; rerender(); };
const answerFor = id => record.answers[id] || {};
const setAnswer = (id, key, value) => update(r => { r.answers[id] = resetDependentAnswers(r.answers[id] || {}, key, value); });
const options = (values, selected, action) => `<div class="choice-grid">${Object.entries(values).map(([key,label]) => `<button class="choice ${selected === key ? 'selected' : ''}" data-action="${action}" data-value="${esc(key)}">${esc(label)}</button>`).join('')}</div>`;
const field = (label, value, action, type = 'text', placeholder = '') => `<div class="field"><label>${esc(label)}</label><input type="${type}" value="${esc(value)}" placeholder="${esc(placeholder)}" data-input="${action}"></div>`;

function renderTopbar() {
  return `<header class="topbar"><div class="brand"><div class="brand-mark">⚖</div><span>نظام محاضر الجلسات الذكية</span></div><div class="top-actions"><button class="button secondary" data-nav="archive">الأرشيف</button><button class="button gold" data-nav="new">+ محضر جديد</button></div></header>`;
}
function renderProgress() {
  return `<nav class="progress" aria-label="مراحل المحضر">${SECTIONS.map(s => `<button class="step ${section === s.id ? 'active' : ''} ${isSectionDone(s.id) ? 'done' : ''}" data-section="${s.id}">${esc(s.short)}</button>`).join('')}</nav>`;
}
function isSectionDone(id) {
  if (!record) return false;
  if (id === 'session') return Boolean(record.meta.caseNumber || record.meta.date);
  if (id === 'parties') return record.parties.length > 1 || record.parties.every(p => p.gender && p.count);
  if (id === 'attendance') return record.parties.every(p => answerFor(p.id).attended);
  if (id === 'requests') return record.parties.filter(p => answerFor(p.id).attended === 'yes').every(p => answerFor(p.id).request);
  return false;
}
function renderSession() {
  return `<h1 class="heading">بيانات الجلسة</h1><p class="subheading">ابدأ بالبيانات التعريفية للمحضر. تُحفظ المسودة تلقائياً على هذا الجهاز.</p><div class="question-card">${field('رقم القضية', record.meta.caseNumber, 'meta.caseNumber', 'text', 'أدخل رقم القضية')}${field('عنوان المحضر', record.meta.title, 'meta.title', 'text', 'مثلاً: محضر جلسة')}${field('تاريخ الجلسة', record.meta.date, 'meta.date', 'date')}</div>`;
}
function renderParties() {
  const cards = record.parties.map((p, index) => `<div class="question-card"><div class="button-row" style="justify-content:space-between"><h2 class="question-title">${esc(partyName(p))}</h2>${record.parties.length > 2 ? `<button class="button danger" data-remove-party="${p.id}">حذف الطرف</button>` : ''}</div>${options(ROLE_LABELS,p.role,`party:${p.id}:role`)}${field('اسم الطرف (اختياري)',p.name,`party:${p.id}:name`)}<div class="field"><label>النوع</label>${options(GENDER_LABELS,p.gender,`party:${p.id}:gender`)}</div><div class="field"><label>العدد</label>${options(COUNT_LABELS,p.count,`party:${p.id}:count`)}</div><div class="field"><label>الترتيب</label>${options(ORDER_LABELS,String(p.order),`party:${p.id}:order`)}</div></div>`).join('');
  return `<h1 class="heading">الأطراف</h1><p class="subheading">اضبط بيانات كل طرف بصورة مستقلة حتى لا تختلط الصياغة أو الطلبات.</p><div class="button-row"><button class="button secondary" data-add-party="plaintiff">+ مدعٍ</button><button class="button secondary" data-add-party="defendant">+ مدعى عليه</button><button class="button secondary" data-add-party="intervener">+ خصم مدخل</button></div>${cards}`;
}
function renderAttendanceParty(p) {
  const a = answerFor(p.id);
  let html = `<div class="question-card"><h2 class="question-title">${esc(partyName(p))}</h2><p class="question-title">هل حضر ${esc(partyName(p))}؟</p>${options(ATTENDANCE_LABELS,a.attended,`answer:${p.id}:attended`)}`;
  if (a.attended === 'yes') {
    html += `<div class="field"><label>صفة الحاضر</label>${options(REP_LABELS,a.repType,`answer:${p.id}:repType`)}</div>`;
    if (a.repType && a.repType !== 'self') {
      html += `<div class="field"><label>جنس الحاضر</label>${options({M:'ذكر',F:'أنثى'},a.repGender,`answer:${p.id}:repGender`)}</div>`;
      html += field(a.repType === 'gov' ? 'اسم المستشار' : 'اسم الحاضر', a.repName, `answer:${p.id}:repName`);
      if (a.repType === 'gov') html += field('الجهة أو الإدارة', a.govEntity, `answer:${p.id}:govEntity`);
    }
    if (a.repType) {
      html += `<div class="field"><label>طريقة الحضور</label>${options(MODE_LABELS,a.mode,`answer:${p.id}:mode`)}</div>`;
      html += `<div class="field"><label>هل تحققت المحكمة من هوية الحاضر؟</label>${options({yes:'نعم، بواقع بطاقة الهوية',no:'لا',unanswered:'لم تتم الإجابة'},a.verified,`answer:${p.id}:verified`)}</div>`;
    }
  }
  return `${html}</div>`;
}
function renderAttendance() {
  return `<h1 class="heading">الحضور</h1><p class="subheading">لن تظهر التفاصيل الفرعية إلا بعد اختيار الحضور. لا يُفترض التحقق من الهوية تلقائياً.</p>${record.parties.map(renderAttendanceParty).join('')}`;
}
function renderRequests() {
  const attendees = record.parties.filter(p => answerFor(p.id).attended === 'yes');
  return `<h1 class="heading">الأقوال والطلبات</h1><p class="subheading">سجّل الطلب المرتبط بكل حاضر، أو اتركه بلا طلب.</p>${attendees.length ? attendees.map(p => { const a=answerFor(p.id); return `<div class="question-card"><h2 class="question-title">طلب ${esc(partyName(p))}</h2>${options(REQUEST_LABELS,a.request || 'none',`answer:${p.id}:request`)}${a.request === 'custom' ? `<div class="field"><label>نص الطلب المخصص</label><textarea data-input="answer:${p.id}:customRequest" placeholder="اكتب الطلب كما أقره المستخدم">${esc(a.customRequest)}</textarea></div>` : ''}</div>`; }).join('') : '<div class="question-card empty">لا يوجد طرف حاضر مثبت حتى الآن.</div>'}`;
}
function renderReview() {
  return `<h1 class="heading">المراجعة النهائية</h1><p class="subheading">يمكنك تعديل النص يدوياً. عند تعديل إجابة، لن يُستبدل النص المعدل دون اختيار إعادة التوليد.</p>${record.manualText !== null ? '<div class="notice">يوجد نص معدل يدوياً. إعادة التوليد ستستبدله بالنص الناتج من الإجابات.</div>' : ''}<div class="field"><label for="manual-text">نص المحضر</label><textarea id="manual-text" data-manual-text placeholder="سيظهر النص المولد هنا">${esc(currentText())}</textarea></div><div class="button-row" style="margin-top:14px"><button class="button" data-copy>نسخ النص</button><button class="button secondary" data-download="txt">تصدير TXT</button><button class="button secondary" data-download="doc">تصدير Word</button><button class="button secondary" data-print>طباعة / حفظ PDF</button><button class="button danger" data-regenerate>إعادة التوليد</button></div>`;
}
function sectionContent() {
  return ({ session:renderSession, parties:renderParties, attendance:renderAttendance, requests:renderRequests, review:renderReview })[section]();
}
function renderEditor() {
  root.innerHTML = `${renderTopbar()}<main class="main"><div class="workspace"><section class="panel panel-pad">${renderProgress()}${sectionContent()}<div class="actions"><button class="button secondary" data-prev ${section==='session'?'disabled':''}>السابق</button><button class="button" data-next ${section==='review'?'disabled':''}>التالي</button></div></section><aside class="panel preview"><div class="preview-head"><span>المعاينة المباشرة</span><button class="button secondary" data-copy>نسخ</button></div><div class="document">${esc(currentText()) || '<span class="empty">سيظهر نص المحضر هنا أثناء الإجابة.</span>'}</div></aside></div></main><div class="toast"></div>`;
}
async function renderArchive() {
  const records = (await listRecords()).filter(r => `${r.meta?.caseNumber||''} ${r.meta?.title||''}`.includes(search));
  root.innerHTML = `${renderTopbar()}<main class="main"><section class="panel panel-pad"><h1 class="heading">الأرشيف الشخصي</h1><p class="subheading">المحاضر محفوظة محلياً في هذا المتصفح فقط. احتفظ بنسخة احتياطية مستقلة عند الحاجة.</p><div class="archive-toolbar"><input class="search" style="max-width:360px" value="${esc(search)}" data-search placeholder="ابحث برقم القضية أو العنوان"><button class="button gold" data-nav="new">+ محضر جديد</button><button class="button secondary" data-export-backup>تصدير نسخة احتياطية</button><label class="button secondary">استيراد نسخة<input class="sr-only" type="file" accept=".json,application/json" data-import></label></div>${records.length ? `<div class="records">${records.map(r => `<article class="record"><span class="notice">${esc(r.meta?.caseNumber || 'بلا رقم')}</span><h3>${esc(r.meta?.title || 'محضر جلسة')}</h3><div class="record-meta"><span>تاريخ الجلسة: ${esc(r.meta?.date || 'غير محدد')}</span><span>آخر تعديل: ${new Date(r.updatedAt).toLocaleString('ar-AE')}</span></div><div class="record-actions"><button class="button" data-open="${r.id}">فتح وتعديل</button><button class="button danger" data-delete="${r.id}">حذف</button></div></article>`).join('')}</div>` : '<div class="empty">لا توجد محاضر محفوظة بعد.</div>'}</section></main><div class="toast"></div>`;
}
function render() { archiveMode ? renderArchive() : renderEditor(); }

function download(name, content, type) { const url=URL.createObjectURL(new Blob([content],{type})); const a=document.createElement('a'); a.href=url; a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(url),500); }
function exportBackup() { listRecords().then(records => download(`نسخة_محاضر_${new Date().toISOString().slice(0,10)}.json`, JSON.stringify({ version:APP_VERSION, exportedAt:new Date().toISOString(), records },null,2), 'application/json')); }
function importBackup(file) { const reader=new FileReader(); reader.onload=async()=>{ try { const data=JSON.parse(reader.result); const records=Array.isArray(data)?data:data.records; if(!Array.isArray(records)) throw new Error(); const existing=new Set((await listRecords()).map(r=>r.id)); let added=0; for(const item of records) if(item?.id && item?.parties && !existing.has(item.id)){ await saveRecord(item); added++; } toast(`تم استيراد ${added} محضر`); render(); } catch { toast('ملف النسخة الاحتياطية غير صالح'); } }; reader.readAsText(file); }

root.addEventListener('click', async event => {
  const target=event.target.closest('button,label'); if(!target) return;
  if(target.dataset.nav==='new'){ record=newRecord(); archiveMode=false; section='session'; render(); queueSave(); return; }
  if(target.dataset.nav==='archive'){ archiveMode=true; record=null; render(); return; }
  if(target.dataset.section){ section=target.dataset.section; render(); return; }
  if(target.dataset.prev){ section=SECTIONS[Math.max(0,SECTIONS.findIndex(s=>s.id===section)-1)].id; render(); return; }
  if(target.dataset.next){ section=SECTIONS[Math.min(SECTIONS.length-1,SECTIONS.findIndex(s=>s.id===section)+1)].id; render(); return; }
  if(target.dataset.action){ const [kind,id,key]=target.dataset.action.split(':'); if(kind==='answer') setAnswer(id,key,target.dataset.value); if(kind==='party') update(r=>{r.parties.find(p=>p.id===id)[key]=target.dataset.value;}); return; }
  if(target.dataset.addParty){ update(r=>{ const same=r.parties.filter(p=>p.role===target.dataset.addParty); r.parties.push(newParty(target.dataset.addParty,(Math.max(0,...same.map(p=>Number(p.order)||0))+1))); }); return; }
  if(target.dataset.removeParty){ update(r=>{r.parties=r.parties.filter(p=>p.id!==target.dataset.removeParty); delete r.answers[target.dataset.removeParty];}); return; }
  if(target.dataset.open){ record=await getRecord(target.dataset.open); archiveMode=false; section='session'; render(); return; }
  if(target.dataset.delete){ if(confirm('هل تريد حذف هذا المحضر نهائياً؟')){ await removeRecord(target.dataset.delete); toast('تم حذف المحضر'); renderArchive(); } return; }
  if(target.dataset.copy){ navigator.clipboard?.writeText(currentText()).then(()=>toast('تم نسخ النص')); return; }
  if(target.dataset.regenerate){ record.manualText=null; rerender(); toast('تمت إعادة التوليد'); return; }
  if(target.dataset.download){ const text=currentText(); if(target.dataset.download==='txt') download('محضر_جلسة.txt',text,'text/plain;charset=utf-8'); else download('محضر_جلسة.doc',`<html dir="rtl"><meta charset="utf-8"><body style="direction:rtl;font-family:Arial;white-space:pre-wrap">${esc(text)}</body></html>`,'application/msword'); toast('تم تجهيز الملف'); return; }
  if(target.dataset.print){ window.print(); return; }
  if(target.dataset.exportBackup){ exportBackup(); return; }
});
root.addEventListener('input', event => {
  const el=event.target;
  if(el.dataset.search !== undefined){ search=el.value; renderArchive(); return; }
  if(el.dataset.manualText !== undefined){ record.manualText=el.value; queueSave(); const doc=document.querySelector('.document'); if(doc) doc.textContent=el.value; return; }
  if(!el.dataset.input) return;
  const [kind,id,key]=el.dataset.input.split(':');
  if(kind==='meta') update(r=>{r.meta[key]=el.value;});
  if(kind==='party') update(r=>{r.parties.find(p=>p.id===id)[key]=el.value;});
  if(kind==='answer') setAnswer(id,key,el.value);
});
root.addEventListener('change', event => { if(event.target.dataset.import && event.target.files[0]) importBackup(event.target.files[0]); });

if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
render();
