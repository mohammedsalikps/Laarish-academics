/**
 * Deterministic calculator for the mentor.
 *
 * Arithmetic in a learner's question ("what is 3/4 of 12?", "12 x 7") is
 * computed exactly here with rational numbers, and the verified results are
 * given to the AI model, so it never has to guess a calculation. No eval is
 * used: expressions are tokenised and parsed with a small grammar.
 *
 *   expr   := term (('+' | '-') term)*
 *   term   := factor (('*' | '/' | 'of') factor)*
 *   factor := '-' factor | number '%'? | '(' expr ')'
 */

interface Rational {
  n: bigint;
  d: bigint;
}

type Token = { kind: 'num'; value: Rational; text: string } | { kind: 'op'; value: '+' | '-' | '*' | '/' | 'of'; text: string } | { kind: 'paren'; value: '(' | ')'; text: string } | { kind: 'pct'; text: string } | { kind: 'other'; text: string };

export interface Calculation {
  expression: string;
  result: string;
}

const MAX_ABS = 10n ** 12n;

function gcd(a: bigint, b: bigint): bigint {
  a = a < 0n ? -a : a;
  b = b < 0n ? -b : b;
  while (b) [a, b] = [b, a % b];
  return a || 1n;
}

function make(n: bigint, d: bigint): Rational {
  if (d === 0n) throw new Error('division by zero');
  if (d < 0n) {
    n = -n;
    d = -d;
  }
  const g = gcd(n, d);
  const r = { n: n / g, d: d / g };
  if ((r.n < 0n ? -r.n : r.n) > MAX_ABS || r.d > MAX_ABS) throw new Error('too large');
  return r;
}

const add = (a: Rational, b: Rational) => make(a.n * b.d + b.n * a.d, a.d * b.d);
const sub = (a: Rational, b: Rational) => make(a.n * b.d - b.n * a.d, a.d * b.d);
const mul = (a: Rational, b: Rational) => make(a.n * b.n, a.d * b.d);
const div = (a: Rational, b: Rational) => make(a.n * b.d, a.d * b.n);

function parseNumber(text: string): Rational {
  const [whole, frac = ''] = text.split('.');
  const scale = 10n ** BigInt(frac.length);
  return make(BigInt(whole || '0') * scale + BigInt(frac || '0'), scale);
}

const WORD_OPS: Record<string, Token> = {
  plus: { kind: 'op', value: '+', text: '+' },
  minus: { kind: 'op', value: '-', text: '-' },
  times: { kind: 'op', value: '*', text: '×' },
  of: { kind: 'op', value: 'of', text: 'of' },
};

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  // Operator words need word boundaries ("often" is not "of"); "x" only counts as
  // "times" when a number or bracket follows it ("12 x 7", "3x4").
  const re = /(\d+(?:\.\d+)?)|(multiplied\s+by|divided\s+by|plus|minus|times|of)(?![a-z])|([+\-*/×÷()%]|x(?=\s*[\d(]))|(\S+?)(?=[\s\d+\-*/×÷()%]|$)|\s+/giy;
  let m: RegExpExecArray | null;
  while (re.lastIndex < input.length && (m = re.exec(input))) {
    const [all, num, word, sym, other] = m;
    if (num) tokens.push({ kind: 'num', value: parseNumber(num), text: num });
    else if (word) {
      const w = word.toLowerCase().replace(/\s+/g, ' ');
      if (w === 'multiplied by') tokens.push({ kind: 'op', value: '*', text: '×' });
      else if (w === 'divided by') tokens.push({ kind: 'op', value: '/', text: '÷' });
      else tokens.push(WORD_OPS[w]);
    } else if (sym) {
      if (sym === '(' || sym === ')') tokens.push({ kind: 'paren', value: sym, text: sym });
      else if (sym === '%') tokens.push({ kind: 'pct', text: '%' });
      else if (sym === '+' || sym === '-') tokens.push({ kind: 'op', value: sym, text: sym });
      else if (sym === '*' || sym === '×' || sym.toLowerCase() === 'x') tokens.push({ kind: 'op', value: '*', text: '×' });
      else tokens.push({ kind: 'op', value: '/', text: sym === '÷' ? '÷' : '/' });
    } else if (other) tokens.push({ kind: 'other', text: other });
    if (!all) break;
  }
  return tokens;
}

class Parser {
  private i = 0;
  constructor(private readonly tokens: Token[]) {}

  parse(): Rational {
    const value = this.expr();
    if (this.i !== this.tokens.length) throw new Error('trailing tokens');
    return value;
  }

  private peek() {
    return this.tokens[this.i];
  }

  private expr(): Rational {
    let left = this.term();
    for (let t = this.peek(); t?.kind === 'op' && (t.value === '+' || t.value === '-'); t = this.peek()) {
      this.i += 1;
      const right = this.term();
      left = t.value === '+' ? add(left, right) : sub(left, right);
    }
    return left;
  }

  private term(): Rational {
    let left = this.factor();
    for (let t = this.peek(); t?.kind === 'op' && (t.value === '*' || t.value === '/' || t.value === 'of'); t = this.peek()) {
      this.i += 1;
      const right = this.factor();
      left = t.value === '/' ? div(left, right) : mul(left, right);
    }
    return left;
  }

  private factor(): Rational {
    const t = this.peek();
    if (!t) throw new Error('unexpected end');
    if (t.kind === 'op' && t.value === '-') {
      this.i += 1;
      return mul(make(-1n, 1n), this.factor());
    }
    if (t.kind === 'num') {
      this.i += 1;
      if (this.peek()?.kind === 'pct') {
        this.i += 1;
        return div(t.value, make(100n, 1n));
      }
      return t.value;
    }
    if (t.kind === 'paren' && t.value === '(') {
      this.i += 1;
      const inner = this.expr();
      const close = this.peek();
      if (close?.kind !== 'paren' || close.value !== ')') throw new Error('missing )');
      this.i += 1;
      return inner;
    }
    throw new Error('unexpected token');
  }
}

export function formatRational(r: Rational): string {
  if (r.d === 1n) return r.n.toString();
  let d = r.d;
  while (d % 2n === 0n) d /= 2n;
  while (d % 5n === 0n) d /= 5n;
  const fraction = `${r.n}/${r.d}`;
  if (d === 1n) {
    // Terminating decimal: show it exactly.
    let digits = 0;
    let scaled = r.n;
    let den = r.d;
    while (den !== 1n && digits < 12) {
      scaled *= 10n;
      digits += 1;
      const g = gcd(scaled, den);
      scaled /= g;
      den /= g;
    }
    const neg = scaled < 0n;
    const abs = (neg ? -scaled : scaled).toString().padStart(digits + 1, '0');
    const decimal = `${neg ? '-' : ''}${abs.slice(0, -digits)}.${abs.slice(-digits)}`;
    return `${fraction} (= ${decimal})`;
  }
  const approx = Number(r.n) / Number(r.d);
  return `${fraction} (about ${approx.toFixed(3)})`;
}

/** Finds and evaluates arithmetic expressions in a message. Returns at most `limit` results. */
export function extractCalculations(text: string, limit = 3): Calculation[] {
  if (text.length > 600) return [];
  const tokens = tokenize(text);
  const results: Calculation[] = [];
  const isMath = (t: Token) => t.kind !== 'other';
  let start = 0;
  while (start < tokens.length && results.length < limit) {
    if (!isMath(tokens[start])) {
      start += 1;
      continue;
    }
    let end = start;
    while (end < tokens.length && isMath(tokens[end])) end += 1;
    const run = trimRun(tokens.slice(start, end));
    const numbers = run.filter((t) => t.kind === 'num').length;
    const ops = run.filter((t) => t.kind === 'op').length;
    if (numbers >= 2 && ops >= 1) {
      try {
        const value = new Parser(run).parse();
        results.push({ expression: formatTokens(run), result: formatRational(value) });
      } catch {
        /* not a valid expression: ignore */
      }
    }
    start = end;
  }
  return results;
}

function formatTokens(tokens: Token[]): string {
  return tokens
    .map((t) => t.text)
    .join(' ')
    .replace(/\( /g, '(')
    .replace(/ \)/g, ')')
    .replace(/ %/g, '%')
    .replace(/(\d) \/ (?=\d)/g, '$1/');
}

export type Evaluation = { ok: true; expression: string; result: string } | { ok: false; error: string };

/**
 * Evaluates one whole expression exactly (used by the AI model's `calculate`
 * tool). Anything that is not arithmetic is rejected rather than guessed.
 */
export function evaluateExpression(expression: unknown): Evaluation {
  if (typeof expression !== 'string' || !expression.trim()) return { ok: false, error: 'Give an arithmetic expression, for example "3/4 of 12".' };
  if (expression.length > 200) return { ok: false, error: 'That expression is too long.' };
  const tokens = tokenize(expression.replace(/[=?]\s*$/, ''));
  if (tokens.length === 0 || tokens.some((t) => t.kind === 'other')) {
    return { ok: false, error: 'Only numbers, + - × ÷ /, "of", % and brackets are supported.' };
  }
  try {
    const value = new Parser(tokens).parse();
    return { ok: true, expression: formatTokens(tokens), result: formatRational(value) };
  } catch (err) {
    const message = (err as Error).message;
    if (message === 'division by zero') return { ok: false, error: 'You cannot divide by zero.' };
    if (message === 'too large') return { ok: false, error: 'Those numbers are too large for this calculator.' };
    return { ok: false, error: 'That is not a complete arithmetic expression.' };
  }
}

/** Removes leading/trailing operators and unbalanced brackets around an expression run. */
function trimRun(run: Token[]): Token[] {
  let s = 0;
  let e = run.length;
  const badStart = (t: Token) => (t.kind === 'op' && t.value !== '-') || t.kind === 'pct' || (t.kind === 'paren' && t.value === ')');
  const badEnd = (t: Token) => t.kind === 'op' || (t.kind === 'paren' && t.value === '(');
  while (s < e && badStart(run[s])) s += 1;
  while (e > s && badEnd(run[e - 1])) e -= 1;
  return run.slice(s, e);
}
