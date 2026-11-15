import { useId, useState, type ReactNode } from 'react';
import { Dialog, DialogBody } from './Dialog';

function question() {
  const a = 6 + Math.floor(Math.random() * 7);
  const b = 6 + Math.floor(Math.random() * 4);
  return { a, b };
}

/**
 * Parental gate (wireframe B8): a sum a young child is unlikely to solve.
 * It keeps grown-up screens away from children by accident; it is not a
 * security feature, and the content behind it says so.
 */
export function GrownUpGate({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  // Mounting fresh each time it opens gives a new question and clears the last answer.
  return open ? (
    <Gate onClose={onClose} title={title}>
      {children}
    </Gate>
  ) : null;
}

function Gate({ onClose, title, children }: { onClose: () => void; title: string; children: ReactNode }) {
  const [q, setQ] = useState(question);
  const [answer, setAnswer] = useState('');
  const [passed, setPassed] = useState(false);
  const [error, setError] = useState('');
  const id = useId();

  return (
    <Dialog open onClose={onClose} title={passed ? title : 'For grown-ups'} className="font-grown">
      <DialogBody>
        {passed ? (
          children
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (Number(answer) === q.a * q.b) setPassed(true);
              else {
                setError('Not quite. Ask a grown-up to help.');
                setQ(question());
                setAnswer('');
              }
            }}
          >
            <span className="inline-block rounded-full bg-grownup-soft px-3 py-1 text-xs font-extrabold text-grownup">For grown-ups</span>
            <label htmlFor={id} className="mt-3 block text-xl font-extrabold text-ink">
              What is {q.a} × {q.b}?
            </label>
            <input
              id={id}
              inputMode="numeric"
              autoComplete="off"
              value={answer}
              onChange={(e) => setAnswer(e.target.value.replace(/\D/g, '').slice(0, 3))}
              className="mt-2 min-h-[48px] w-full rounded-xl border-2 border-line px-3 text-lg font-bold"
              aria-describedby={`${id}-msg`}
            />
            <p id={`${id}-msg`} role="alert" className="mt-1 min-h-[1.25rem] text-sm font-bold text-[#B8540F]">
              {error}
            </p>
            <button type="submit" className="btn btn-grownup mt-2 w-full">
              Continue
            </button>
          </form>
        )}
      </DialogBody>
    </Dialog>
  );
}
