export const QUESTION_IDS = {
  attendance: 'attendance',
  representative: 'representative',
  mode: 'mode',
  identity: 'identity',
  request: 'request'
};
export function visibleQuestions(answer = {}) {
  const questions = [QUESTION_IDS.attendance];
  if (answer.attended === 'yes') {
    questions.push(QUESTION_IDS.representative);
    if (answer.repType) questions.push(QUESTION_IDS.mode, QUESTION_IDS.identity);
    if (answer.repType) questions.push(QUESTION_IDS.request);
  }
  return questions;
}
export function resetDependentAnswers(answer, key, value) {
  const next = { ...answer, [key]: value };
  if (key === 'attended' && value === 'no') return { attended: 'no' };
  if (key === 'repType' && value === 'self') {
    delete next.repGender; delete next.repName; delete next.govEntity;
  }
  if (key === 'request' && value !== 'custom') delete next.customRequest;
  return next;
}
