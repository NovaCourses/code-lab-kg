import { useState, useEffect } from 'react'

export function AuthModal({ isOpen, mode, onModeChange, onClose, onSubmit, error, t, googleEnabled }) {
  const [form, setForm] = useState({ full_name: '', email: '', password: '' })

  useEffect(() => {
    if (!isOpen) return
    setForm({ full_name: '', email: '', password: '' })
  }, [isOpen, mode])

  if (!isOpen) return null

  const submit = (event) => {
    event.preventDefault()
    if (mode === 'register') {
      onSubmit(form)
      return
    }
    onSubmit({ email: form.email, password: form.password })
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section className="modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div className="tab-switch">
            <button className={mode === 'login' ? 'tab active' : 'tab'} onClick={() => onModeChange('login')}>
              {t('authWelcome')}
            </button>
            <button className={mode === 'register' ? 'tab active' : 'tab'} onClick={() => onModeChange('register')}>
              {t('authCreate')}
            </button>
          </div>
          <button type="button" className="chip" onClick={onClose}>
            {t('close')}
          </button>
        </div>
        {error && <p className="alert error">{error}</p>}
        <form className="form-stack" onSubmit={submit}>
          {mode === 'register' && (
            <label>
              {t('fullName')}
              <input
                value={form.full_name}
                onChange={(event) => setForm((prev) => ({ ...prev, full_name: event.target.value }))}
                required
              />
            </label>
          )}
          <label>
            {t('email')}
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              required
            />
          </label>
          <label>
            {t('password')}
            <input
              type="password"
              value={form.password}
              onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
              required
              minLength={6}
            />
          </label>
          <button className="premium-button" type="submit">
            {mode === 'login' ? t('login') : t('register')}
          </button>
        </form>
        {googleEnabled && (
          <a className="btn btn-ghost full-width" href="/auth/google/login">
            {t('continueGoogle')}
          </a>
        )}
      </section>
    </div>
  )
}
