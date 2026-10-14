import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container } from '../atoms/Container';
import { Input } from '../atoms/Input';
import { Checkbox } from '../atoms/Checkbox';
import { Button } from '../atoms/Button';
import { SectionLabel } from '../landing/SectionPrimitives';
import { getUser, setUser } from '../../lib/attemptSession';
import type { LevelId, QuizMeta } from '../../types';

interface RecipientFormProps {
  quiz: QuizMeta;
  /** Level the learner picked above; carried into the attempt route. */
  level: LevelId;
  levelLabel: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Recipient form — name + email + consent checkbox.
 * Persists profile to localStorage so user doesn't re-type next time.
 * Submit button enables only when all fields valid + checkbox ticked.
 */
export function RecipientForm({ quiz, level, levelLabel }: RecipientFormProps) {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});

  // Pre-fill from saved profile (no extra typing on subsequent quizzes)
  useEffect(() => {
    const saved = getUser();
    if (saved) {
      setName(saved.name);
      setEmail(saved.email);
    }
  }, []);

  function validate(): boolean {
    const e: { name?: string; email?: string } = {};
    if (name.trim().length < 2) e.name = 'Please enter your full name.';
    if (!EMAIL_RE.test(email.trim())) e.email = 'Please enter a valid email address.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit(ev: FormEvent) {
    ev.preventDefault();
    if (!validate()) return;
    // Save for next time
    setUser({ name: name.trim(), email: email.trim().toLowerCase() });
    // The player requests a signed attempt from the server; the level choice
    // travels in the query string and is validated server-side.
    navigate(`/quiz/${quiz.id}/take?level=${level}`);
  }

  const canSubmit =
    name.trim().length >= 2 &&
    EMAIL_RE.test(email.trim()) &&
    agreed;

  return (
    <section className="py-16 sm:py-24">
      <Container size="app">
        <form onSubmit={handleSubmit} noValidate>
          <SectionLabel>recipient</SectionLabel>
          <h2 className="
            mt-4 font-display font-black text-fg-0
            text-[1.75rem] leading-[1.1] tracking-[-0.03em]
            sm:text-[2.25rem] sm:leading-[1.05]
          ">
            Who's earning this credential?
          </h2>
          <p className="
            mt-3 font-mono text-sm sm:text-base text-fg-3 leading-relaxed
            max-w-[40rem]
          ">
            <span className="text-fg-5">// </span>
            The name appears on the credential. Your email is used to bind the attempt to you and is stored only as a
            salted, pseudonymous reference — it is never written to the public registry, and it is never shown on the
            verification page.
          </p>

          {/* Input grid — single col mobile, 2 col desktop */}
          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
            <Input
              label="full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Muhammad Ahmad"
              autoComplete="name"
              error={errors.name}
              inputMode="text"
              required
            />
            <Input
              label="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              error={errors.email}
              inputMode="email"
              required
            />
          </div>

          {/* Consent + submit */}
          <div className="mt-12 border-t border-bg-3 pt-10">
            <Checkbox
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              label={
                <>
                  I understand the assessment is{' '}
                  <span className="text-fg-0 font-medium">unproctored</span> and that Secure Mode signals
                  (tab switches, fullscreen exits) are self-reported by my browser and{' '}
                  <span className="text-fg-0 font-medium">auto-submit the attempt after 3 of them</span>.
                </>
              }
              description={
                <>
                  The credential is graded on the server. Attempts are also written to a pseudonymous history record so
                  retake rules and the integrity signal (self-reported violations) can be checked — no name or email is
                  stored there.
                </>
              }
            />

            <div className="mt-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                cmd
                disabled={!canSubmit}
              >
                start-{levelLabel.toLowerCase()}-attempt →
              </Button>
              <p className="font-mono text-xs text-fg-4 leading-relaxed">
                <span className="text-fg-5">$ </span>
                test starts immediately on click.
              </p>
            </div>
          </div>
        </form>
      </Container>
    </section>
  );
}
