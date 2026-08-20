import { test } from 'node:test';
import assert from 'node:assert/strict';

// Silnik oceny odpowiedzi nie dotyka pamięci, więc idzie testować wprost.
const { grade, normalize } = await import('../js/grade.js');

test('wielkość liter, kropki i cudzysłowy nie psują trafienia', () => {
  const item = { en: 'Click Save to confirm your changes' };
  const wynik = grade(item, '  click save to confirm your changes.  ');
  assert.equal(wynik.verdict, 'exact');
  assert.equal(wynik.correct, true);
});

test('skrót i pełna forma znaczą to samo', () => {
  assert.equal(normalize("I've been testing it"), normalize('I have been testing it'));
  const item = { en: 'I have been testing it' };
  assert.equal(grade(item, "I've been testing it").correct, true);
});

test('inny poprawny wariant to trafienie, ale z podpowiedzią wzorca', () => {
  const item = { en: 'See you tomorrow', accept: ['See you later'] };
  const wynik = grade(item, 'see you later');
  assert.equal(wynik.verdict, 'variant');
  assert.equal(wynik.correct, true);
});

test('przewidziany błąd dostaje własną diagnozę', () => {
  const item = {
    en: 'The system sends a confirmation email',
    traps: [{ input: 'The system send a confirmation email', why: 'system to ono → sends.' }],
  };
  const wynik = grade(item, 'The system send a confirmation email');
  assert.equal(wynik.verdict, 'trap');
  assert.equal(wynik.correct, false);
  assert.equal(wynik.why, 'system to ono → sends.');
});

test('literówka liczy się jako dobrze', () => {
  const item = { en: 'This method is deprecated' };
  const wynik = grade(item, 'This method is depricated');
  assert.equal(wynik.verdict, 'typo');
  assert.equal(wynik.correct, true);
});

test('zły czas czasownika to NIE literówka — to błąd', () => {
  const item = { en: 'I test the app now' };
  const wynik = grade(item, 'I tested the app now');
  assert.equal(wynik.correct, false, 'tested zamiast test to zmiana formy, nie czeski błąd');
  assert.notEqual(wynik.verdict, 'typo');
});

test('puste pole to zawsze błąd, bez wyjątków', () => {
  const wynik = grade({ en: 'Anything at all' }, '   ');
  assert.equal(wynik.verdict, 'wrong');
  assert.equal(wynik.correct, false);
});

test('nieregularna zła forma czasownika to błąd, nie literówka (find/found)', () => {
  const item = { en: 'I found a duplicate row', lemma: 'find' };
  const wynik = grade(item, 'I find a duplicate row');
  assert.equal(wynik.correct, false, 'find zamiast found to zmiana formy, nie czeski błąd');
  assert.notEqual(wynik.verdict, 'typo');
});
