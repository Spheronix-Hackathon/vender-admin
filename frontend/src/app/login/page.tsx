'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { ShieldCheck, QrCode, Key, Copy, Check, ArrowLeft, Mail, AlertTriangle } from 'lucide-react';

// ─── Step Types ───────────────────────────────────────────────────────────────
type Step = 'login' | 'setup-2fa' | 'login-2fa' | 'forgot-2fa';

export default function LoginPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [copiedKey, setCopiedKey] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'error' | 'success' | 'info' } | null>(null);
  const [loading, setLoading] = useState(false);
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

  const setInfo = (text: string) => setMessage({ text, type: 'info' });
  const setError = (text: string) => setMessage({ text, type: 'error' });
  const setSuccess = (text: string) => setMessage({ text, type: 'success' });
  const clearMsg = () => setMessage(null);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  // Step 1: Submit Email & Password
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    clearMsg();

    try {
      const cleanEmail = email.trim().toLowerCase();
      const res = await api.post('/auth/login', { 
        email: cleanEmail, 
        password: password.trim() 
      });

      if (res.data.status === 'SETUP_2FA') {
        // First-time 2FA registration or after Super Admin reset
        setQrCode(res.data.qrCode);
        setSecretKey(res.data.secretKey);
        setOtp('');
        setStep('setup-2fa');
        setInfo('Scan the QR code with Google Authenticator or Microsoft Authenticator, then enter the 6-digit code.');
      } else if (res.data.status === 'REQUIRE_2FA') {
        // Returning admin with 2FA already configured
        setOtp('');
        setStep('login-2fa');
        setInfo('Enter the 6-digit code from your Authenticator app.');
      } else {
        setError('Unexpected authentication response. Please try again.');
      }
    } catch (err: any) {
      if (!err.response) {
        setError('Cannot connect to backend server. Please verify the backend is online.');
      } else {
        setError(err.response?.data?.message || 'Login failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Step 2A: Confirm First-Time 2FA Setup
  const handleConfirmSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setError('Please enter the full 6-digit code from your Authenticator app.');
      return;
    }
    setLoading(true);
    clearMsg();

    try {
      const res = await api.post('/auth/confirm-2fa-setup', { 
        email: email.trim().toLowerCase(), 
        token: otp.trim() 
      });
      localStorage.setItem('admin_token', res.data.token);
      setSuccess('Two-factor authentication configured successfully! Redirecting...');
      setTimeout(() => router.replace('/'), 700);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid 6-digit code. Please verify your phone clock and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2B: Verify Returning 2FA Login
  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setError('Please enter the 6-digit code from your Authenticator app.');
      return;
    }
    setLoading(true);
    clearMsg();

    try {
      const res = await api.post('/auth/verify-2fa', { 
        email: email.trim().toLowerCase(), 
        token: otp.trim() 
      });
      localStorage.setItem('admin_token', res.data.token);
      setSuccess('Verification successful! Redirecting...');
      setTimeout(() => router.replace('/'), 700);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid Authenticator code. Please check your app and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Helper: Copy Base32 Secret Key
  const handleCopyKey = () => {
    if (!secretKey) return;
    navigator.clipboard.writeText(secretKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

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

      {/* Main Glass Card */}
      <div style={{
        width: '100%', maxWidth: '460px',
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.09)',
        borderRadius: '24px',
        padding: '40px 36px',
        backdropFilter: 'blur(40px)',
        boxShadow: '0 40px 80px rgba(0,0,0,0.5)',
        position: 'relative',
        zIndex: 10,
      }}>
        {/* Logo / Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '16px',
            background: 'linear-gradient(135deg, #007aff 0%, #5856d6 100%)',
            margin: '0 auto 14px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(0,122,255,0.4)',
            fontSize: '22px',
          }}>
            {step === 'setup-2fa' ? <QrCode size={26} color="#fff" /> : 
             step === 'login-2fa' ? <ShieldCheck size={28} color="#fff" /> : 
             step === 'forgot-2fa' ? <AlertTriangle size={26} color="#fff" /> : '⚡'}
          </div>
          <h1 style={{ color: '#fff', fontSize: '24px', fontWeight: '700', margin: '0 0 6px', letterSpacing: '-0.5px' }}>
            {step === 'login' && 'Spheronix Admin'}
            {step === 'setup-2fa' && 'Set Up 2FA Authenticator'}
            {step === 'login-2fa' && 'Two-Factor Authentication'}
            {step === 'forgot-2fa' && '2FA Reset Assistance'}
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', margin: 0 }}>
            {step === 'login' && 'Enter your admin email and password to continue'}
            {step === 'setup-2fa' && 'First-time registration: Scan the QR code with your phone'}
            {step === 'login-2fa' && `Enter the 6-digit code for ${email}`}
            {step === 'forgot-2fa' && 'Lost your device? Contact Super Admin for a reset'}
          </p>
        </div>

        {/* Status / Message Banner */}
        {message && (
          <div style={{
            padding: '12px 16px', borderRadius: '12px', marginBottom: '20px',
            fontSize: '13px', fontWeight: '500', lineHeight: '1.4',
            background: message.type === 'error' ? 'rgba(255,59,48,0.12)' :
                        message.type === 'success' ? 'rgba(52,199,89,0.12)' : 'rgba(0,122,255,0.12)',
            color: message.type === 'error' ? '#ff6b6b' :
                   message.type === 'success' ? '#30d158' : '#6eb9ff',
            border: `1px solid ${message.type === 'error' ? 'rgba(255,59,48,0.2)' :
                                  message.type === 'success' ? 'rgba(52,199,89,0.2)' : 'rgba(0,122,255,0.2)'}`,
          }}>{message.text}</div>
        )}

        {/* ── STEP 1: Email & Password Login ── */}
        {step === 'login' && (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <InputField label="Admin Email" type="email" value={email} onChange={setEmail} placeholder="admin@example.com" autoFocus />
            <div style={{ position: 'relative' }}>
              <InputField label="Password" type={showPassword ? 'text' : 'password'} value={password} onChange={setPassword} placeholder="••••••••••" />
              <button 
                type="button" 
                onClick={() => setShowPassword(v => !v)}
                style={{ 
                  position: 'absolute', right: '14px', top: '36px', 
                  background: 'none', border: 'none', cursor: 'pointer', 
                  color: 'rgba(255,255,255,0.4)', fontSize: '11px', fontWeight: '700', padding: '0' 
                }}>
                {showPassword ? 'HIDE' : 'SHOW'}
              </button>
            </div>
            <SubmitButton loading={loading} label="Continue" />
          </form>
        )}

        {/* ── STEP 2A: First-Time 2FA Setup (QR Code Display) ── */}
        {step === 'setup-2fa' && (
          <form onSubmit={handleConfirmSetup} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* QR Code Container */}
            <div style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
              margin: '0 auto',
              width: 'fit-content'
            }}>
              {qrCode ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img 
                  src={qrCode} 
                  alt="2FA QR Code" 
                  style={{ width: '190px', height: '190px', display: 'block', borderRadius: '8px' }} 
                />
              ) : (
                <div style={{ width: '190px', height: '190px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>
                  Loading QR Code...
                </div>
              )}
            </div>

            {/* Manual Secret Key Helper */}
            {secretKey && (
              <div style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '12px',
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px'
              }}>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.5px' }}>
                    Manual Setup Key
                  </div>
                  <div style={{ fontFamily: 'monospace', fontSize: '12px', color: '#6eb9ff', letterSpacing: '1.5px', wordBreak: 'break-all' }}>
                    {secretKey}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCopyKey}
                  title="Copy Key"
                  style={{
                    background: copiedKey ? 'rgba(52,199,89,0.2)' : 'rgba(255,255,255,0.08)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '6px 10px',
                    color: copiedKey ? '#30d158' : '#fff',
                    fontSize: '11px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.2s',
                    flexShrink: 0
                  }}
                >
                  {copiedKey ? <Check size={12} /> : <Copy size={12} />}
                  {copiedKey ? 'Copied' : 'Copy'}
                </button>
              </div>
            )}

            <div style={{ textAlign: 'center' }}>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', margin: '0 0 10px' }}>
                Enter the 6-digit code shown in your Authenticator app:
              </p>
              <OtpInput value={otp} onChange={setOtp} />
            </div>

            <SubmitButton loading={loading} label="Confirm & Activate 2FA" />
            <BackButton onClick={() => { setStep('login'); clearMsg(); setOtp(''); }} />
          </form>
        )}

        {/* ── STEP 2B: Returning 2FA Login ── */}
        {step === 'login-2fa' && (
          <form onSubmit={handleVerify2FA} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', margin: '0 0 12px' }}>
                Open <strong>Google Authenticator</strong> or <strong>Microsoft Authenticator</strong> on your phone and enter your 6-digit code:
              </p>
              <OtpInput value={otp} onChange={setOtp} />
            </div>

            <SubmitButton loading={loading} label="Verify & Sign In" />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center', marginTop: '6px' }}>
              <button
                type="button"
                onClick={() => { setStep('forgot-2fa'); clearMsg(); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255,255,255,0.45)',
                  fontSize: '12px',
                  cursor: 'pointer',
                  transition: 'color 0.2s',
                  padding: '4px 8px'
                }}
                onMouseEnter={e => (e.currentTarget.style.color = '#6eb9ff')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.45)')}
              >
                Lost your phone / Authenticator? Contact Super Admin →
              </button>
              <BackButton onClick={() => { setStep('login'); clearMsg(); setOtp(''); }} />
            </div>
          </form>
        )}

        {/* ── STEP 3: Forgot 2FA / Device Lost Assistance ── */}
        {step === 'forgot-2fa' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={{
              background: 'rgba(255,149,0,0.08)',
              border: '1px solid rgba(255,149,0,0.25)',
              borderRadius: '16px',
              padding: '18px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Key size={18} color="#ff9f0a" />
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#ff9f0a', letterSpacing: '0.3px' }}>
                  2FA RESET PROCEDURE
                </span>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13px', margin: 0, lineHeight: '1.5' }}>
                For high security, junior admin 2FA keys can only be reset by the Super Admin. Once reset, you will automatically be presented with a new QR code upon your next login.
              </p>
            </div>

            <div style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '16px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: '700', letterSpacing: '0.5px' }}>
                Super Admin Email
              </span>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <span style={{ color: '#fff', fontSize: '14px', fontWeight: '600', fontFamily: 'monospace' }}>
                  yashwanthkumar87657@gmail.com
                </span>
                <a
                  href={`mailto:yashwanthkumar87657@gmail.com?subject=Spheronix%20Admin%202FA%20Reset%20Request&body=Hi%20Super%20Admin,%0D%0A%0D%0APlease%20reset%202FA%20for%20my%20account:%20${encodeURIComponent(email || 'my-admin-email@example.com')}.%0D%0AI%20have%20lost%20access%20to%20my%20Authenticator%20app.`}
                  style={{
                    background: 'rgba(0,122,255,0.2)',
                    border: '1px solid rgba(0,122,255,0.4)',
                    color: '#6eb9ff',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    fontSize: '12px',
                    fontWeight: '600',
                    textDecoration: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    cursor: 'pointer',
                    flexShrink: 0
                  }}
                >
                  <Mail size={13} /> Email
                </a>
              </div>
            </div>

            <BackButton onClick={() => { setStep('login'); clearMsg(); }} />
          </div>
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        value={value}
        onChange={e => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
        placeholder="••••••"
        required
        maxLength={6}
        autoFocus
        style={{
          background: 'rgba(255,255,255,0.08)',
          border: '2px solid rgba(0,122,255,0.5)',
          borderRadius: '14px',
          padding: '14px 16px',
          color: '#fff',
          fontSize: '26px',
          fontFamily: 'monospace',
          letterSpacing: '12px',
          textAlign: 'center',
          outline: 'none',
          width: '240px',
          boxSizing: 'border-box',
          boxShadow: '0 4px 20px rgba(0,122,255,0.25)',
          transition: 'border-color 0.2s, background 0.2s',
        }}
        onFocus={e => { e.target.style.borderColor = 'rgba(0,122,255,0.9)'; e.target.style.background = 'rgba(255,255,255,0.12)'; }}
        onBlur={e => { e.target.style.borderColor = 'rgba(0,122,255,0.5)'; e.target.style.background = 'rgba(255,255,255,0.08)'; }}
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

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: 'none', border: 'none',
        color: 'rgba(255,255,255,0.4)', fontSize: '13px',
        cursor: 'pointer', textAlign: 'center', transition: 'color 0.2s',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
        marginTop: '6px'
      }}
      onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
      onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
    >
      <ArrowLeft size={14} /> Back to Login
    </button>
  );
}
