import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './ProfilePage.module.css'
import { Card, CardHeader, CardContent } from '@/components/ui/Card/Card'
import { Button } from '@/components/ui/Button/Button'
import { Modal } from '@/components/ui/Modal/Modal'
import { Input } from '@/components/ui/Input/Input'
import { Switch } from '@/components/ui/Switch/Switch'
import { 
  User, 
  LogOut, 
  Heart, 
  Smartphone,
  Plus,
  Trash2,
  AlertCircle,
  Users,
  Phone
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useSettings } from '@/context/SettingsContext'
import { profilesRepo } from '@/data/repos/profilesRepo'
import { caregiverRepo } from '@/data/repos/caregiverRepo'
import { supabase } from '@/data/supabase/client'
import type { EmergencyContact } from '@/types'

export const ProfilePage: React.FC = () => {
  const navigate = useNavigate()
  const { user, signOut, updateProfile } = useAuth()
  const { 
    lowVisionMode, 
    toggleLowVisionMode, 
    notificationsEnabled,
    requestNotificationPermission,
    soundEnabled,
    toggleSound,
    vibrationEnabled,
    toggleVibration
  } = useSettings()

  const [showContactModal, setShowContactModal] = useState(false)
  const [contactName, setContactName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactWhatsapp, setContactWhatsapp] = useState('')
  const [contactRelationship, setContactRelationship] = useState('')

  // Phone
  const [phone, setPhone] = useState('')
  const [savingPhone, setSavingPhone] = useState(false)
  const [phoneSaved, setPhoneSaved] = useState(false)

  // Caregiver state
  const [caregiverCode, setCaregiverCode] = useState<string | null>(null)
  const [generatingCode, setGeneratingCode] = useState(false)
  const [codeExpiry, setCodeExpiry] = useState<Date | null>(null)

  useEffect(() => {
    if (user) {
      caregiverRepo.getPendingCode(user.id).then(code => {
        if (code) setCaregiverCode(code)
      })
      // Load phone
      supabase.from('profiles').select('phone').eq('id', user.id).single()
        .then(({ data }) => { if (data?.phone) setPhone(data.phone) })
    }
  }, [user])

  const handleSavePhone = async () => {
    if (!user) return
    setSavingPhone(true)
    await supabase.from('profiles').update({ phone }).eq('id', user.id)
    setSavingPhone(false)
    setPhoneSaved(true)
    setTimeout(() => setPhoneSaved(false), 2000)
  }

  const handleAddContact = async () => {
    if (!user || !contactName || !contactPhone) return
    const newContact: EmergencyContact = {
      id: crypto.randomUUID(),
      name: contactName,
      phone: contactPhone,
      whatsapp: contactWhatsapp || undefined,
      relationship: contactRelationship || undefined,
      isPrimary: user.emergencyContacts.length === 0
    }
    const updatedContacts = [...user.emergencyContacts, newContact]
    await profilesRepo.updateEmergencyContacts(user.id, updatedContacts)
    await updateProfile({ emergencyContacts: updatedContacts })
    setShowContactModal(false)
    setContactName(''); setContactPhone(''); setContactWhatsapp(''); setContactRelationship('')
  }

  const handleDeleteContact = async (contactId: string) => {
    if (!user) return
    const updatedContacts = user.emergencyContacts.filter(c => c.id !== contactId)
    await profilesRepo.updateEmergencyContacts(user.id, updatedContacts)
    await updateProfile({ emergencyContacts: updatedContacts })
  }

  const handleSetPrimary = async (contactId: string) => {
    if (!user) return
    const updatedContacts = user.emergencyContacts.map(c => ({
      ...c, isPrimary: c.id === contactId
    }))
    await profilesRepo.updateEmergencyContacts(user.id, updatedContacts)
    await updateProfile({ emergencyContacts: updatedContacts })
  }

  const handleLogout = async () => {
    await signOut()
    window.location.href = '/login'
  }

  const handleGenerateCode = async () => {
    if (!user) return
    setGeneratingCode(true)
    const code = await caregiverRepo.generateCode(user.id)
    setCaregiverCode(code)
    setCodeExpiry(new Date(Date.now() + 10 * 60 * 1000))
    setGeneratingCode(false)
  }

  const handleRevokeAccess = async () => {
    if (!user) return
    if (!confirm('¿Revocar el acceso del cuidador?')) return
    await caregiverRepo.revokeLink(user.id)
    setCaregiverCode(null)
    setCodeExpiry(null)
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h2 className={styles.title}>Perfil</h2>
      </header>

      {/* User Info */}
      <Card className={styles.userCard}>
        <CardContent>
          <div className={styles.userInfo}>
            <div className={styles.avatar}><User size={40} /></div>
            <div className={styles.userDetails}>
              <h3 className={styles.userName}>{user?.name}</h3>
              <p className={styles.userEmail}>{user?.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Phone */}
      <Card>
        <CardHeader
          title="Teléfono"
          subtitle="Para que tu cuidador pueda contactarte"
          icon={<Phone size={20} />}
        />
        <CardContent>
          <div className={styles.phoneRow}>
            <Input
              label="Tu número de WhatsApp"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+54 11 1234 5678"
              fullWidth
            />
            <Button
              variant="primary"
              size="medium"
              onClick={handleSavePhone}
              loading={savingPhone}
            >
              {phoneSaved ? '✓ Guardado' : 'Guardar'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Emergency Contacts */}
      <Card>
        <CardHeader
          title="Contactos de emergencia"
          subtitle="Personas a contactar en caso de emergencia"
          icon={<Heart size={20} />}
        />
        <CardContent>
          {user?.emergencyContacts.length === 0 ? (
            <p className={styles.emptyContacts}>No has agregado contactos de emergencia</p>
          ) : (
            <div className={styles.contactsList}>
              {user?.emergencyContacts.map(contact => (
                <div key={contact.id} className={styles.contactItem}>
                  <div className={styles.contactInfo}>
                    <span className={styles.contactName}>
                      {contact.name}
                      {contact.isPrimary && <span className={styles.primaryBadge}>Principal</span>}
                    </span>
                    <span className={styles.contactPhone}>{contact.phone}</span>
                    {contact.whatsapp && <span className={styles.contactWhatsapp}>WhatsApp: {contact.whatsapp}</span>}
                    {contact.relationship && <span className={styles.contactRelation}>{contact.relationship}</span>}
                  </div>
                  <div className={styles.contactActions}>
                    {!contact.isPrimary && (
                      <Button variant="ghost" size="small" onClick={() => handleSetPrimary(contact.id)}>
                        Hacer principal
                      </Button>
                    )}
                    <Button variant="ghost" size="small" leftIcon={<Trash2 size={16} />} onClick={() => handleDeleteContact(contact.id)}>
                      Eliminar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <Button variant="outline" size="medium" fullWidth leftIcon={<Plus size={18} />} onClick={() => setShowContactModal(true)} className={styles.addContactBtn}>
            Agregar contacto
          </Button>
        </CardContent>
      </Card>

      {/* Caregiver */}
      <Card>
        <CardHeader title="Modo cuidador" subtitle="Compartí tu estado con un familiar" icon={<Users size={20} />} />
        <CardContent>
          {caregiverCode ? (
            <div className={styles.codeBlock}>
              <p className={styles.codeHint}>Compartí este código con tu cuidador. Tiene 10 minutos de validez.</p>
              <div className={styles.codeDisplay}>{caregiverCode}</div>
              {codeExpiry && (
                <p className={styles.codeExpiry}>
                  Expira a las {codeExpiry.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
              <Button variant="outline" size="medium" fullWidth onClick={handleGenerateCode} loading={generatingCode}>
                Generar nuevo código
              </Button>
              <Button variant="ghost" size="small" fullWidth onClick={handleRevokeAccess} className={styles.revokeBtn}>
                Revocar acceso del cuidador
              </Button>
            </div>
          ) : (
            <div className={styles.codeBlock}>
              <p className={styles.codeHint}>Tu cuidador podrá ver tu medicación, glucosa, presión y revisiones de pies del día.</p>
              <Button variant="primary" size="large" fullWidth leftIcon={<Users size={20} />} onClick={handleGenerateCode} loading={generatingCode}>
                Generar código de acceso
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Settings */}
      <Card>
        <CardHeader title="Configuración" subtitle="Personaliza tu experiencia" icon={<Smartphone size={20} />} />
        <CardContent>
          <div className={styles.settingsList}>
            <Switch label="Modo de baja visión" helperText="Texto más grande y alto contraste" checked={lowVisionMode} onChange={toggleLowVisionMode} />
            <Switch label="Notificaciones" helperText="Recibir alertas de medicación" checked={notificationsEnabled} onChange={requestNotificationPermission} />
            <Switch label="Sonido de alertas" helperText="Reproducir sonido para recordatorios" checked={soundEnabled} onChange={toggleSound} />
            <Switch label="Vibración" helperText="Vibrar para alertas importantes" checked={vibrationEnabled} onChange={toggleVibration} />
          </div>
        </CardContent>
      </Card>

      <p className={styles.disclaimer}>
        <AlertCircle size={14} />
        Esta aplicación no reemplaza el consejo médico profesional. 
        Ante síntomas graves o urgencias, llamá al servicio de emergencias.
      </p>

      <Button variant="outline" size="large" fullWidth leftIcon={<LogOut size={20} />} onClick={handleLogout} className={styles.logoutBtn}>
        Cerrar sesión
      </Button>

      <footer className={styles.footer}>
        <p>Developed by cheves.co</p>
        <p className={styles.version}>Versión 1.0.0</p>
      </footer>

      {/* Add Contact Modal */}
      <Modal isOpen={showContactModal} onClose={() => setShowContactModal(false)} title="Agregar Contacto de Emergencia" size="medium"
        footer={<><Button variant="ghost" onClick={() => setShowContactModal(false)}>Cancelar</Button><Button onClick={handleAddContact}>Guardar</Button></>}
      >
        <div className={styles.form}>
          <Input label="Nombre" value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Ej: María (hija)" required fullWidth />
          <Input label="Teléfono" value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="+54 11 1234 5678" required fullWidth />
          <Input label="WhatsApp (opcional)" value={contactWhatsapp} onChange={e => setContactWhatsapp(e.target.value)} placeholder="+54 11 1234 5678" fullWidth />
          <Input label="Relación (opcional)" value={contactRelationship} onChange={e => setContactRelationship(e.target.value)} placeholder="Ej: Hijo, Esposa, Amigo" fullWidth />
        </div>
      </Modal>
    </div>
  )
}