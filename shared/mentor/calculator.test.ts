// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { evaluateExpression, extractCalculations } from './calculator';

const results = (text: string) => extractCalculations(text).map((c) => `${c.expression} = ${c.result}`);

describe('verified calculator', () => {
  it('evaluates whole-number arithmetic with precedence and brackets', () => {
    expect(results('What is 2 + 3 × 4?')).toEqual(['2 + 3 × 4 = 14']);
    expect(results('(2 + 3) * 4')).toEqual(['(2 + 3) × 4 = 20']);
    expect(results('12 ÷ 4')).toEqual(['12 ÷ 4 = 3']);
  });

  it('keeps fractions exact', () => {
    expect(results('What is 3/4 of 12?')).toEqual(['3/4 of 12 = 9']);
    expect(results('1/2 + 1/4')).toEqual(['1/2 + 1/4 = 3/4 (= 0.75)']);
    expect(results('Is 2/4 the same as a half?')).toEqual(['2/4 = 1/2 (= 0.5)']);
    expect(results('1 ÷ 3')).toEqual(['1 ÷ 3 = 1/3 (about 0.333)']);
  });

  it('understands percentages and operator words, writing them as symbols', () => {
    expect(results('What is 50% of 30?')).toEqual(['50% of 30 = 15']);
    expect(results('6 times 7')).toEqual(['6 × 7 = 42']);
    expect(results('10 divided by 4')).toEqual(['10 ÷ 4 = 5/2 (= 2.5)']);
  });

  it('only treats x as multiply between numbers', () => {
    expect(results('3 x 5')).toEqual(['3 × 5 = 15']);
    expect(results('find x when x is 4')).toEqual([]);
  });

  it('ignores plain numbers, dates and unsafe sizes, and never divides by zero', () => {
    expect(results('I have 3 apples')).toEqual([]);
    expect(results('5 / 0')).toEqual([]);
    expect(results('99999999 * 99999999')).toEqual([]);
  });
});

describe('evaluateExpression (calculate tool)', () => {
  it('evaluates a whole expression exactly', () => {
    expect(evaluateExpression('3/4 of 12')).toEqual({ ok: true, expression: '3/4 of 12', result: '9' });
    expect(evaluateExpression('2.5 + 0.25')).toEqual({ ok: true, expression: '2.5 + 0.25', result: '11/4 (= 2.75)' });
    expect(evaluateExpression('20% of 45 =')).toEqual({ ok: true, expression: '20% of 45', result: '9' });
    expect(evaluateExpression('12 ÷ 5')).toEqual({ ok: true, expression: '12 ÷ 5', result: '12/5 (= 2.4)' });
  });

  it('rejects anything that is not arithmetic instead of guessing', () => {
    expect(evaluateExpression('two plus apples').ok).toBe(false);
    expect(evaluateExpression('7 / 0')).toEqual({ ok: false, error: 'You cannot divide by zero.' });
    expect(evaluateExpression('(1 + 2').ok).toBe(false);
    expect(evaluateExpression('').ok).toBe(false);
    expect(evaluateExpression(42).ok).toBe(false);
    expect(evaluateExpression('9'.repeat(300)).ok).toBe(false);
  });
});
