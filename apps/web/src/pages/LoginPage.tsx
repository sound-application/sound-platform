/**
 * Sound Platform — Login Page (Shell)
 * Phase: 5-A
 *
 * Email/password auth using Firebase Auth.
 * Phase 5-A: functional — sign-in is the only write operation in this phase.
 */

import React, { useState, useId } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import './AuthPage.css';

export function LoginPage() {
  const navigate = useNavigate();
  const emailId  = useId();
  const passId   = useId();

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
      navigate('/', { replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'حدث خطأ — حاول مجدداً';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-card__title">Sound</h1>
        <p className="auth-card__subtitle">تسجيل الدخول</p>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="auth-form__field">
            <label htmlFor={emailId}>البريد الإلكتروني</label>
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
            <label htmlFor={passId}>كلمة المرور</label>
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
            {loading ? 'جاري الدخول...' : 'دخول'}
          </button>
        </form>

        <p className="auth-card__footer">
          ليس لديك حساب؟{' '}
          <Link to="/signup" className="auth-card__link">إنشاء حساب</Link>
        </p>
      </div>
    </div>
  );
}
