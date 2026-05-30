/**
 * Sound Platform — Sign-Up Page
 * Phase: 5-A + i18n
 */

import React, { useState, useId } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '../lib/firebase';
import './AuthPage.css';

export function SignUpPage() {
  const { t } = useTranslation('auth');
  const navigate    = useNavigate();
  const emailId     = useId();
  const passId      = useId();
  const displayId   = useId();

  const [displayName, setDisplayName] = useState('');
  const [email,       setEmail]       = useState('');
  const [password,    setPassword]    = useState('');
  const [error,       setError]       = useState<string | null>(null);
  const [loading,     setLoading]     = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      if (displayName.trim()) {
        await updateProfile(cred.user, { displayName: displayName.trim() });
      }
      navigate('/', { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t('signup.error');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-card__title">Sound</h1>
        <p className="auth-card__subtitle">{t('signup.title')}</p>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="auth-form__field">
            <label htmlFor={displayId}>{t('signup.name')}</label>
            <input
              id={displayId}
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              autoComplete="name"
              placeholder={t('signup.namePlaceholder')}
              disabled={loading}
            />
          </div>

          <div className="auth-form__field">
            <label htmlFor={emailId}>{t('signup.email')}</label>
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
            <label htmlFor={passId}>{t('signup.password')}</label>
            <input
              id={passId}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              placeholder="••••••••"
              disabled={loading}
              dir="ltr"
            />
          </div>

          {error && (
            <p className="auth-form__error" role="alert">{error}</p>
          )}

          <button type="submit" className="auth-form__submit" disabled={loading}>
            {loading ? t('signup.submitting') : t('signup.submit')}
          </button>
        </form>

        <p className="auth-card__footer">
          {t('signup.hasAccount')}{' '}
          <Link to="/login" className="auth-card__link">{t('signup.signIn')}</Link>
        </p>
      </div>
    </div>
  );
}
