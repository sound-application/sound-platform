/**
 * Sound Platform — Login Page
 * Phase: 5-A + i18n
 */

import React, { useState, useId } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import './AuthPage.css';

export function LoginPage() {
  const { t } = useTranslation('auth');
  const navigate  = useNavigate();
  const location  = useLocation();
  const emailId   = useId();
  const passId    = useId();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const from = (location.state as any)?.from?.pathname ?? '/general/home';

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState<string | null>(null);
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('login.error');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-card__title">Sound</h1>
        <p className="auth-card__subtitle">{t('login.title')}</p>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="auth-form__field">
            <label htmlFor={emailId}>{t('login.email')}</label>
            <input
              id={emailId}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
              disabled={loading}
              dir="ltr"
            />
          </div>

          <div className="auth-form__field">
            <label htmlFor={passId}>{t('login.password')}</label>
            <input
              id={passId}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              disabled={loading}
              dir="ltr"
            />
          </div>

          {error && (
            <p className="auth-form__error" role="alert">{error}</p>
          )}

          <button type="submit" className="auth-form__submit" disabled={loading}>
            {loading ? t('login.submitting') : t('login.submit')}
          </button>
        </form>

        <p className="auth-card__footer">
          {t('login.noAccount')}{' '}
          <Link to="/signup" className="auth-card__link">{t('login.createAccount')}</Link>
        </p>
      </div>
    </div>
  );
}
