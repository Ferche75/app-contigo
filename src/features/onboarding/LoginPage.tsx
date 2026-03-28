import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import styles from './OnboardingPage.module.css'
import { Eye, EyeOff } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

export const LoginPage: React.FC = () => {
  const navigate = useNavigate()
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    try {
      const { error } = await signIn(email, password)
      if (error) {
        setError('Email o contraseña incorrectos')
      } else {
        navigate('/today')
      }
    } catch {
      setError('Ocurrió un error. Intentá de nuevo.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={styles.authPage}>
      <div className={styles.authContainer}>

        <div className={styles.authHeader}>
          <img src="/logoc.png" alt="Contigo" className={styles.logoImg} />
        </div>

        <div className={styles.card}>
          <form onSubmit={handleSubmit} className={styles.form}>
            <h2 className={styles.formTitle}>Iniciar sesión</h2>

            {error && <div className={styles.error} role="alert">{error}</div>}

            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Email</label>
              <input
                className={styles.fieldInput}
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                autoComplete="email"
              />
            </div>

            <div className={styles.passwordWrapper}>
              <label className={styles.fieldLabel}>Contraseña</label>
              <input
                className={styles.fieldInput}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Tu contraseña"
                required
                autoComplete="current-password"
                style={{ paddingRight: '48px' }}
              />
              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            <button type="submit" className={styles.btnPrimary} disabled={isLoading}>
              {isLoading ? 'Entrando...' : 'Iniciar sesión'}
            </button>

            <hr className={styles.divider} />

            <p className={styles.switchText}>
              ¿No tenés cuenta?{' '}
              <Link to="/register" className={styles.link}>Crear cuenta</Link>
            </p>
          </form>
        </div>

        <p className={styles.disclaimer}>
          Esta aplicación no reemplaza el consejo médico profesional.
          Ante síntomas graves llamá al servicio de emergencias.
        </p>
      </div>
    </div>
  )
}