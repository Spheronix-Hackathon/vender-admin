'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

import api from '@/lib/api';

// ─── Step Types ───────────────────────────────────────────────────────────────
type Step = 'login' | 'login-otp' | 'login-totp' | 'forgot-email' | 'forgot-otp' | 'reset-password';

export default function LoginPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'success' | 'info' } | null>(null);
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [showPassword, setShowPassword] = useState(false);

  // Redirect if already logged in with a valid token
  useEffect(() => {
    const checkExistingSession = async () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
      if (!token) return;
      try {
        await api.get('/auth/me');
        router.replace('/');
      } catch {
        localStorage.removeItem('admin_token');
      }
    };
    checkExistingSession();
  }, [router]);

  // Countdown timer for OTP expiry
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setInterval(() => setCountdown(c => c - 1), 1000);
    return () => clearInterval(t);
  }, [countdown]);

  const setInfo = (text: string) => setMessage({ text, type: 'info' });
  const setError = (text: string) => setMessage({ text, type: 'error' });
  const setSuccess = (text: string) => setMessage({ text, type: 'success' });
  const clearMsg = () => setMessage(null);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); clearMsg();
    try {
      const res = await api.post('/auth/login', { 
        email: email.trim(), 
        password: password.trim() 
      });
      if (res.data.token) {
        localStorage.setItem('admin_token', res.data.token);
        setSuccess('Login successful! Redirecting...');
        setTimeout(() => router.replace('/'), 500);
        return;
      }
      if (res.data.requireTotp) {
        setInfo('Please enter the 6-digit code from your Authenticator app.');
        setStep('login-totp');
      } else {
        setInfo('OTP sent to your email. Check your inbox.');
        setCountdown(300);
        setStep('login-otp');
      }
    } catch (err: any) {
      if (!err.response) {
        setError('Cannot connect to backend server. Please make sure the backend is running on port 5050.');
      } else {
        setError(err.response?.data?.message || 'Login failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyTOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); clearMsg();
    try {
      const res = await api.post('/auth/verify-totp', { email, token: otp });
      localStorage.setItem('admin_token', res.data.token);
      setSuccess('Login successful! Redirecting...');
      setTimeout(() => router.replace('/'), 800);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid Authenticator code.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyLoginOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); clearMsg();
    try {
      const res = await api.post('/auth/verify-login-otp', { email, otp });
      localStorage.setItem('admin_token', res.data.token);
      setSuccess('Login successful! Redirecting...');
      setTimeout(() => router.replace('/'), 800);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendLoginOTP = async () => {
    setLoading(true); clearMsg();
    try {
      await api.post('/auth/resend-login-otp', { email });
      setInfo('New OTP sent to your email.');
      setCountdown(300);
      setOtp('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to resend OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); clearMsg();
    try {
      await api.post('/auth/forgot-password', { email });
      setInfo('Password reset OTP sent to your email.');
      setCountdown(300);
      setStep('forgot-otp');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyResetOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); clearMsg();
    try {
      await api.post('/auth/verify-reset-otp', { email, otp });
      setInfo('OTP verified! Set your new password.');
      setStep('reset-password');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendResetOTP = async () => {
    setLoading(true); clearMsg();
    try {
      await api.post('/auth/forgot-password', { email });
      setInfo('New OTP sent to your email.');
      setCountdown(300);
      setOtp('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to resend OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true); clearMsg();
    try {
      await api.post('/auth/reset-password', { email, newPassword, confirmPassword });
      setSuccess('Password reset successfully! You can now log in with your new password.');
      setTimeout(() => {
        setStep('login');
        setPassword('');
        setNewPassword('');
        setConfirmPassword('');
        clearMsg();
      }, 2500);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  const formatCountdown = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(145deg, #0a0a0f 0%, #0d1117 30%, #060919 60%, #0a0a0f 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background orbs */}
      <div style={{
        position: 'absolute', top: '15%', left: '10%',
        width: '500px', height: '500px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(0,122,255,0.12) 0%, transparent 70%)',
        filter: 'blur(40px)', pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute', bottom: '10%', right: '8%',
        width: '400px', height: '400px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(88,86,214,0.10) 0%, transparent 70%)',
        filter: 'blur(40px)', pointerEvents: 'none'
      }} />

      {/* Card */}
      <div style={{
        width: '100%', maxWidth: '440px',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.09)',
        borderRadius: '24px',
        padding: '48px 44px',
        backdropFilter: 'blur(40px)',
        boxShadow: '0 40px 80px rgba(0,0,0,0.5)',
        position: 'relative',
        zIndex: 10,
      }}>
        {/* Logo / Brand */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '16px',
            background: 'linear-gradient(135deg, #007aff 0%, #5856d6 100%)',
            margin: '0 auto 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(0,122,255,0.4)',
            fontSize: '22px',
          }}>⚡</div>
          <h1 style={{ color: '#fff', fontSize: '26px', fontWeight: '700', margin: '0 0 6px', letterSpacing: '-0.5px' }}>
            Spheronix Admin
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', margin: 0 }}>
            {step === 'login' && 'Enter your credentials to continue'}
            {step === 'login-otp' && 'Two-factor authentication (Email)'}
            {step === 'login-totp' && 'Two-factor authentication (App)'}
            {step === 'forgot-email' && 'Reset your password'}
            {step === 'forgot-otp' && 'Enter your reset OTP'}
            {step === 'reset-password' && 'Set your new password'}
          </p>
        </div>

        {/* Message Banner */}
        {message && (
          <div style={{
            padding: '12px 16px', borderRadius: '12px', marginBottom: '24px',
            fontSize: '13px', fontWeight: '500', lineHeight: '1.4',
            background: message.type === 'error' ? 'rgba(255,59,48,0.12)' :
                        message.type === 'success' ? 'rgba(52,199,89,0.12)' : 'rgba(0,122,255,0.12)',
            color: message.type === 'error' ? '#ff6b6b' :
                   message.type === 'success' ? '#30d158' : '#6eb9ff',
            border: `1px solid ${message.type === 'error' ? 'rgba(255,59,48,0.2)' :
                                  message.type === 'success' ? 'rgba(52,199,89,0.2)' : 'rgba(0,122,255,0.2)'}`,
          }}>{message.text}</div>
        )}

        {/* ── STEP: Login ── */}
        {step === 'login' && (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <InputField label="Email" type="email" value={email} onChange={setEmail} placeholder="admin@example.com" autoFocus />
            <div style={{ position: 'relative' }}>
              <InputField label="Password" type={showPassword ? 'text' : 'password'} value={password} onChange={setPassword} placeholder="••••••••••" />
              <button type="button" onClick={() => setShowPassword(v => !v)}
                style={{ position: 'absolute', right: '14px', top: '36px', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', fontSize: '12px', padding: '0' }}>
                {showPassword ? 'HIDE' : 'SHOW'}
              </button>
            </div>
            <SubmitButton loading={loading} label="Continue" />
            <button type="button" onClick={() => { setStep('forgot-email'); clearMsg(); }}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '13px', cursor: 'pointer', textAlign: 'center', marginTop: '4px', transition: 'color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#007aff')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}>
              Forgot password?
            </button>
          </form>
        )}

        {/* ── STEP: Login OTP (2FA) ── */}
        {step === 'login-otp' && (
          <form onSubmit={handleVerifyLoginOTP} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ textAlign: 'center', marginBottom: '4px' }}>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', margin: '0' }}>
                OTP sent to <strong style={{ color: 'rgba(255,255,255,0.8)' }}>{email}</strong>
              </p>
              {countdown > 0 && (
                <p style={{ color: countdown < 60 ? '#ff6b6b' : 'rgba(255,255,255,0.35)', fontSize: '12px', marginTop: '6px' }}>
                  Expires in {formatCountdown(countdown)}
                </p>
              )}
            </div>
            <OtpInput value={otp} onChange={setOtp} />
            <SubmitButton loading={loading} label="Verify & Sign In" />
            <ResendButton loading={loading} onResend={handleResendLoginOTP} />
            <BackButton onClick={() => { setStep('login'); clearMsg(); setOtp(''); }} />
          </form>
        )}

        {/* ── STEP: Login TOTP (App 2FA) ── */}
        {step === 'login-totp' && (
          <form onSubmit={handleVerifyTOTP} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ textAlign: 'center', marginBottom: '4px' }}>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', margin: '0' }}>
                Enter the code from your Authenticator app
              </p>
            </div>
            <OtpInput value={otp} onChange={setOtp} />
            <SubmitButton loading={loading} label="Verify & Sign In" />
            <BackButton onClick={() => { setStep('login'); clearMsg(); setOtp(''); }} />
          </form>
        )}

        {/* ── STEP: Forgot Password – Enter Email ── */}
        {step === 'forgot-email' && (
          <form onSubmit={handleForgotEmail} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <InputField label="Admin Email" type="email" value={email} onChange={setEmail} placeholder="admin@example.com" autoFocus />
            <SubmitButton loading={loading} label="Send Reset OTP" />
            <BackButton onClick={() => { setStep('login'); clearMsg(); }} />
          </form>
        )}

        {/* ── STEP: Forgot Password – Verify OTP ── */}
        {step === 'forgot-otp' && (
          <form onSubmit={handleVerifyResetOTP} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ textAlign: 'center', marginBottom: '4px' }}>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', margin: '0' }}>
                OTP sent to <strong style={{ color: 'rgba(255,255,255,0.8)' }}>{email}</strong>
              </p>
              {countdown > 0 && (
                <p style={{ color: countdown < 60 ? '#ff6b6b' : 'rgba(255,255,255,0.35)', fontSize: '12px', marginTop: '6px' }}>
                  Expires in {formatCountdown(countdown)}
                </p>
              )}
            </div>
            <OtpInput value={otp} onChange={setOtp} />
            <SubmitButton loading={loading} label="Verify OTP" />
            <ResendButton loading={loading} onResend={handleResendResetOTP} />
            <BackButton onClick={() => { setStep('forgot-email'); clearMsg(); setOtp(''); }} />
          </form>
        )}

        {/* ── STEP: Reset Password ── */}
        {step === 'reset-password' && (
          <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <InputField label="New Password" type="password" value={newPassword} onChange={setNewPassword} placeholder="Minimum 8 characters" autoFocus />
            <InputField label="Confirm Password" type="password" value={confirmPassword} onChange={setConfirmPassword} placeholder="Re-enter password" />
            <SubmitButton loading={loading} label="Reset Password" />
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Shared Sub-Components ────────────────────────────────────────────────────

function InputField({
  label, type, value, onChange, placeholder, autoFocus
}: {
  label: string; type: string; value: string;
  onChange: (v: string) => void; placeholder?: string; autoFocus?: boolean;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: '600', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        required
        style={{
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '12px',
          padding: '14px 16px',
          color: '#fff',
          fontSize: '15px',
          outline: 'none',
          transition: 'border-color 0.2s, background 0.2s',
          width: '100%',
          boxSizing: 'border-box',
        }}
        onFocus={e => { e.target.style.borderColor = 'rgba(0,122,255,0.6)'; e.target.style.background = 'rgba(255,255,255,0.08)'; }}
        onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.background = 'rgba(255,255,255,0.06)'; }}
      />
    </div>
  );
}

function OtpInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <label style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', fontWeight: '600', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
        One-Time Password
      </label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
        placeholder="6-digit OTP"
        required
        maxLength={6}
        autoFocus
        style={{
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '12px',
          padding: '14px 16px',
          color: '#fff',
          fontSize: '24px',
          fontFamily: 'monospace',
          letterSpacing: '10px',
          textAlign: 'center',
          outline: 'none',
          width: '100%',
          boxSizing: 'border-box',
          transition: 'border-color 0.2s, background 0.2s',
        }}
        onFocus={e => { e.target.style.borderColor = 'rgba(0,122,255,0.6)'; e.target.style.background = 'rgba(255,255,255,0.08)'; }}
        onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.background = 'rgba(255,255,255,0.06)'; }}
      />
    </div>
  );
}

function SubmitButton({ loading, label }: { loading: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      style={{
        background: loading ? 'rgba(0,122,255,0.4)' : 'linear-gradient(135deg, #007aff 0%, #5856d6 100%)',
        color: '#fff',
        border: 'none',
        borderRadius: '12px',
        padding: '15px',
        fontSize: '15px',
        fontWeight: '600',
        cursor: loading ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s',
        width: '100%',
        boxShadow: loading ? 'none' : '0 4px 20px rgba(0,122,255,0.35)',
        letterSpacing: '-0.2px',
        marginTop: '4px',
      }}
    >
      {loading ? (
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <span style={{
            display: 'inline-block', width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)',
            borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite'
          }} />
          Processing...
        </span>
      ) : label}
    </button>
  );
}

function ResendButton({ loading, onResend }: { loading: boolean; onResend: () => void }) {
  return (
    <button
      type="button"
      onClick={onResend}
      disabled={loading}
      style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '12px',
        padding: '12px',
        color: 'rgba(255,255,255,0.6)',
        fontSize: '13px',
        fontWeight: '500',
        cursor: loading ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s',
        width: '100%',
      }}
      onMouseEnter={e => { if (!loading) { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#fff'; }}}
      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
    >
      🔁 Resend OTP
    </button>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: 'none', border: 'none',
        color: 'rgba(255,255,255,0.35)', fontSize: '13px',
        cursor: 'pointer', textAlign: 'center', transition: 'color 0.2s',
      }}
      onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
      onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}
    >
      ← Back
    </button>
  );
}
