import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import styles from './OnboardingPage.module.css'
import { Eye, EyeOff, CheckCircle2, User, Users } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { caregiverRepo } from '@/data/repos/caregiverRepo'

type Role = 'patient' | 'caregiver' | null

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate()
  const { signUp } = useAuth()

  const [step, setStep] = useState(1)
  const [role, setRole] = useState<Role>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [caregiverCode, setCaregiverCode] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSelectRole = (selected: Role) => {
    setRole(selected)
    setStep(2)
  }

  const handleStep2 = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }
    setStep(3)
  }

  const handleStep3 = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (role === 'caregiver' && caregiverCode.length !== 6) {
      setError('Ingresá el código de 6 dígitos de tu familiar')
      return
    }
    setIsLoading(true)
    try {
      const { error: signUpError } = await signUp(email, password, name, role || 'patient')
      if (signUpError) {
        setError(signUpError.message || 'Error al crear la cuenta')
        setIsLoading(false)
        return
      }
      if (role === 'caregiver') {
        const { supabase } = await import('@/data/supabase/client')
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const result = await caregiverRepo.activateCode(caregiverCode.trim(), user.id)
          if (result === 'not_found') {
            setError('Código incorrecto o expirado. Pedile a tu familiar que genere uno nuevo.')
            setIsLoading(false)
            return
          }
          if (result === 'already_used') {
            setError('Este código ya fue usado.')
            setIsLoading(false)
            return
          }
        }
        navigate('/caregiver')
        return
      }
      setStep(4)
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

          {/* ── PASO 4: Éxito ── */}
          {step === 4 && (
            <div className={styles.success}>
              <CheckCircle2 size={64} className={styles.successIcon} />
              <h2 className={styles.formTitle}>¡Cuenta creada!</h2>
              <p className={styles.successText}>
                Te enviamos un email de confirmación.
                Verificá tu cuenta para continuar.
              </p>
              <button className={styles.btnPrimary} onClick={() => navigate('/login')}>
                Ir a iniciar sesión
              </button>
            </div>
          )}

          {/* ── PASO 1: Elegir rol ── */}
          {step === 1 && (
            <div className={styles.form}>
              <h2 className={styles.formTitle}>¿Cómo vas a usar Contigo?</h2>

              <button
                className={styles.roleCard}
                onClick={() => handleSelectRole('patient')}
                type="button"
              >
                <div className={styles.roleIcon}>
                  <User size={28} />
                </div>
                <div className={styles.roleText}>
                  <span className={styles.roleTitle}>Soy paciente</span>
                  <span className={styles.roleDesc}>
                    Quiero registrar mi medicación, glucosa, presión y cuidado de pies
                  </span>
                </div>
              </button>

              <button
                className={styles.roleCard}
                onClick={() => handleSelectRole('caregiver')}
                type="button"
              >
                <div className={`${styles.roleIcon} ${styles.roleIconBlue}`}>
                  <Users size={28} />
                </div>
                <div className={styles.roleText}>
                  <span className={styles.roleTitle}>Soy cuidador</span>
                  <span className={styles.roleDesc}>
                    Quiero ver el estado diario de mi familiar que ya usa Contigo
                  </span>
                </div>
              </button>

              <hr className={styles.divider} />

              <p className={styles.switchText}>
                ¿Ya tenés cuenta?{' '}
                <Link to="/login" className={styles.link}>Iniciar sesión</Link>
              </p>
            </div>
          )}

          {/* ── PASO 2: Email y contraseña ── */}
          {step === 2 && (
            <form onSubmit={handleStep2} className={styles.form}>
              <h2 className={styles.formTitle}>Crear cuenta</h2>

              <div className={styles.progress}>
                <div className={`${styles.progressStep} ${styles.active}`} />
                <div className={styles.progressStep} />
              </div>

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
                  placeholder="Mínimo 6 caracteres"
                  required
                  autoComplete="new-password"
                  style={{ paddingRight: '48px' }}
                />
                <button
                  type="button"
                  className={styles.passwordToggle}
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Ocultar' : 'Mostrar'}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Confirmar contraseña</label>
                <input
                  className={styles.fieldInput}
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repetí tu contraseña"
                  required
                  autoComplete="new-password"
                />
              </div>

              <button type="submit" className={styles.btnPrimary}>
                Continuar
              </button>
              <button type="button" className={styles.btnGhost} onClick={() => setStep(1)}>
                Volver
              </button>
            </form>
          )}

          {/* ── PASO 3: Nombre + código si cuidador ── */}
          {step === 3 && (
            <form onSubmit={handleStep3} className={styles.form}>
              <h2 className={styles.formTitle}>
                {role === 'caregiver' ? 'Casi listo' : 'Cuéntanos de vos'}
              </h2>

              <div className={styles.progress}>
                <div className={`${styles.progressStep} ${styles.active}`} />
                <div className={`${styles.progressStep} ${styles.active}`} />
              </div>

              {error && <div className={styles.error} role="alert">{error}</div>}

              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>¿Cómo te llamás?</label>
                <input
                  className={styles.fieldInput}
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Tu nombre"
                  required
                  autoComplete="name"
                />
              </div>

              {role === 'caregiver' && (
                <div className={styles.fieldGroup}>
                  <label className={styles.fieldLabel}>Código de tu familiar (6 dígitos)</label>
                  <input
                    className={`${styles.fieldInput} ${styles.codeInput}`}
                    type="text"
                    value={caregiverCode}
                    onChange={e => setCaregiverCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    required
                    inputMode="numeric"
                  />
                  <p className={styles.codeHint}>
                    Tu familiar lo genera desde <strong>Perfil → Modo cuidador</strong>
                  </p>
                </div>
              )}

              <button type="submit" className={styles.btnPrimary} disabled={isLoading}>
                {isLoading
                  ? 'Creando cuenta...'
                  : role === 'caregiver' ? 'Conectarme y entrar' : 'Crear cuenta'}
              </button>
              <button type="button" className={styles.btnGhost} onClick={() => setStep(2)}>
                Volver
              </button>
            </form>
          )}

        </div>

        <p className={styles.disclaimer}>
          Al usar esta aplicación, aceptás que no reemplaza el consejo médico profesional.
          Ante síntomas graves llamá al servicio de emergencias.
        </p>
      </div>
    </div>
  )
}