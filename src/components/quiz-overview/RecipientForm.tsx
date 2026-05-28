import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container } from '../atoms/Container';
import { Input } from '../atoms/Input';
import { Checkbox } from '../atoms/Checkbox';
import { Button } from '../atoms/Button';
import { SectionLabel } from '../landing/SectionPrimitives';
import { getUser, setUser } from '../../lib/storage';
import type { QuizMeta } from '../../types';

interface RecipientFormProps {
  quiz: QuizMeta;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Recipient form — name + email + consent checkbox.
 * Persists profile to localStorage so user doesn't re-type next time.
 * Submit button enables only when all fields valid + checkbox ticked.
 */
export function RecipientForm({ quiz }: RecipientFormProps) {
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
    // Navigate to the actual quiz player
    // (NOTE: /quiz/[id]/take route will be built in next round)
    navigate(`/quiz/${quiz.id}/take`);
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
            Who's earning this cert?
          </h2>
          <p className="
            mt-3 font-mono text-sm sm:text-base text-fg-3 leading-relaxed
            max-w-[40rem]
          ">
            <span className="text-fg-5">// </span>
            Both fields appear on the certificate. Your email is hashed for the
            public registry — never stored or shared in plaintext.
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
                  I agree to the integrity rules above and understand that{' '}
                  <span className="text-fg-0 font-medium">
                    3 violations will auto-submit my attempt.
                  </span>
                </>
              }
              description={
                <>
                  My integrity record is baked into the cert hash and visible on the
                  public verification page.
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
                enter-secure-mode →
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
