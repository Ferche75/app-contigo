import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './EmergencyFab.module.css'
import { Phone, MessageCircle } from 'lucide-react'
import { Modal } from '@/components/ui/Modal/Modal'
import { Button } from '@/components/ui/Button/Button'
import { useAuth } from '@/context/AuthContext'

export const EmergencyFab: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [showMenu, setShowMenu] = useState(false)

  const handleEmergencyCall = () => {
    const emergencyNumber = user?.emergencyContacts?.find(c => c.isPrimary)?.phone || '911'
    window.location.href = `tel:${emergencyNumber}`
    setShowMenu(false)
  }

  const handleWhatsApp = () => {
    const contact = user?.emergencyContacts?.find(c => c.whatsapp)
    if (contact?.whatsapp) {
      const message = encodeURIComponent(
        `Hola ${contact.name}, necesito ayuda. Estoy usando Contigo.`
      )
      window.open(`https://wa.me/${contact.whatsapp}?text=${message}`, '_blank')
    }
    setShowMenu(false)
  }

  const handleFullEmergency = () => {
    navigate('/emergency')
    setShowMenu(false)
  }

  return (
    <>
      {/* Main FAB */}
      <button
        className={styles.fab}
        onClick={() => setShowMenu(true)}
        aria-label="Botón de emergencia"
      >
        <Phone size={28} />
      </button>

      {/* Emergency Menu Modal */}
      <Modal
        isOpen={showMenu}
        onClose={() => setShowMenu(false)}
        title="Emergencia"
        description="¿Qué necesitas hacer?"
        size="small"
      >
        <div className={styles.emergencyOptions}>
          <Button
            variant="danger"
            size="large"
            fullWidth
            leftIcon={<Phone size={24} />}
            onClick={handleEmergencyCall}
          >
            Llamar a contacto de emergencia
          </Button>

          {user?.emergencyContacts?.some(c => c.whatsapp) && (
            <Button
              variant="secondary"
              size="large"
              fullWidth
              leftIcon={<MessageCircle size={24} />}
              onClick={handleWhatsApp}
            >
              Enviar WhatsApp
            </Button>
          )}

          <Button
            variant="outline"
            size="large"
            fullWidth
            onClick={handleFullEmergency}
          >
            Ver más opciones de emergencia
          </Button>

          <Button
            variant="ghost"
            size="medium"
            fullWidth
            onClick={() => setShowMenu(false)}
          >
            Cancelar
          </Button>
        </div>
      </Modal>
    </>
  )
}
