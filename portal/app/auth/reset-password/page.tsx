'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Stage = 'verifying' | 'form' | 'success' | 'error'

export default function ResetPasswordPage() {
  const [stage, setStage]       = useState<Stage>('verifying')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const supabase = createClient()

  // On mount: verify the recovery token from the URL
  useEffect(() => {
    const url    = new URL(window.location.href)
    const token  = url.searchParams.get('token_hash')
    const type   = url.searchParams.get('type') as 'recovery' | null

    async function verify() {
      if (!token || type !== 'recovery') {
        setErrorMsg('Invalid or expired reset link. Please request a new one.')
        setStage('error')
        return
      }
      const { error } = await supabase.auth.verifyOtp({ token_hash: token, type: 'recovery' })
      if (error) {
        setErrorMsg(error.message)
        setStage('error')
        return
      }
      setStage('form')
    }
    verify()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setErrorMsg('Passwords do not match.'); return }
    if (password.length < 8)  { setErrorMsg('Password must be at least 8 characters.'); return }
    setLoading(true)
    setErrorMsg('')
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) { setErrorMsg(error.message); return }

    // Redirect to portal — the session is already active
    setStage('success')
    setTimeout(() => { window.location.href = '/' }, 2000)
  }

  const cardStyle: React.CSSProperties = {
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 16,
    padding: '32px 40px',
    maxWidth: 400,
    width: '100%',
    textAlign: 'center',
    fontFamily: "var(--font-sora), system-ui, sans-serif",
  }
  const pageStyle: React.CSSProperties = {
    minHeight: '100vh',
    background: '#f8fafc',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    fontFamily: "var(--font-sora), system-ui, sans-serif",
  }

  if (stage === 'verifying') {
    return (
      <div style={{ ...pageStyle, background: '#2a352a' }}>
        <style>{`@keyframes ffBreath { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.1);opacity:0.8} }`}</style>
        <img src="/favicon-icon.png" alt="" width={64} height={64}
          style={{ animation: 'ffBreath 1.8s ease-in-out infinite', marginBottom: 20 }} />
        <p style={{ margin: 0, color: 'rgba(255,255,255,0.75)', fontSize: '0.95rem', fontWeight: 500 }}>
          Verifying link…
        </p>
      </div>
    )
  }

  if (stage === 'error') {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
          <h1 style={{ margin: '0 0 8px', fontSize: '1.1rem', fontWeight: 600, color: '#0f172a' }}>Link expired</h1>
          <p style={{ margin: '0 0 24px', fontSize: '0.875rem', color: '#64748b', lineHeight: 1.6 }}>{errorMsg}</p>
          <a href="/login" style={{
            display: 'inline-block', padding: '10px 24px',
            background: '#3a4a3a', color: '#fff', borderRadius: 8,
            fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none',
          }}>
            Back to login
          </a>
        </div>
      </div>
    )
  }

  if (stage === 'success') {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
          <h1 style={{ margin: '0 0 8px', fontSize: '1.1rem', fontWeight: 600, color: '#0f172a' }}>Password updated</h1>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#64748b' }}>Redirecting you to the portal…</p>
        </div>
      </div>
    )
  }

  // stage === 'form'
  return (
    <div style={pageStyle}>
      <div style={{ ...cardStyle, textAlign: 'left' }}>
        <h1 style={{ margin: '0 0 4px', fontSize: '1.25rem', fontWeight: 600, color: '#0f172a' }}>Set new password</h1>
        <p style={{ margin: '0 0 24px', fontSize: '0.875rem', color: '#64748b' }}>Choose a strong password for your account.</p>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: 4 }}>
              New password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPass ? 'text' : 'password'}
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                style={{
                  width: '100%', padding: '8px 40px 8px 12px', border: '1px solid #d1d5db',
                  borderRadius: 8, fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box',
                }}
              />
              <button type="button" onClick={() => setShowPass(p => !p)}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}
              >
                {showPass ? '🙈' : '👁️'}
              </button>
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: 4 }}>
              Confirm password
            </label>
            <input
              type={showPass ? 'text' : 'password'}
              required
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Repeat password"
              style={{
                width: '100%', padding: '8px 12px', border: '1px solid #d1d5db',
                borderRadius: 8, fontSize: '0.875rem', outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
          {errorMsg && (
            <p style={{ margin: 0, fontSize: '0.8125rem', color: '#dc2626', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 12px' }}>
              {errorMsg}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '10px', background: '#3a4a3a', color: '#fff', border: 'none',
              borderRadius: 8, fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Updating…' : 'Update password'}
          </button>
        </form>
      </div>
    </div>
  )
}
