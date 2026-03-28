import React from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './ProfilePage.module.css'
import { Card, CardHeader, CardContent } from '@/components/ui/Card/Card'
import { Button } from '@/components/ui/Button/Button'
import { 
  Phone, 
  MessageCircle, 
  MapPin, 
  AlertTriangle,
  ArrowLeft,
  Heart
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

export const EmergencyPage: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()

  const primaryContact = user?.emergencyContacts?.find(c => c.isPrimary)
  const whatsappContacts = user?.emergencyContacts?.filter(c => c.whatsapp) || []

  const handleCall = (phone: string) => {
    window.location.href = `tel:${phone}`
  }

  const handleWhatsApp = (phone: string, name: string) => {
    const message = encodeURIComponent(
      `Hola ${name}, necesito ayuda. Estoy usando Contigo.`
    )
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank')
  }

  const handleShareLocation = async () => {
    if (!navigator.geolocation) {
      alert('Tu navegador no soporta geolocalización')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        const mapsUrl = `https://maps.google.com/?q=${latitude},${longitude}`
        
        // Share via WhatsApp if available
        if (whatsappContacts.length > 0) {
          const contact = whatsappContacts[0]
          const message = encodeURIComponent(
            `Necesito ayuda. Esta es mi ubicación: ${mapsUrl}`
          )
          window.open(`https://wa.me/${contact.whatsapp}?text=${message}`, '_blank')
        } else {
          // Copy to clipboard
          navigator.clipboard.writeText(mapsUrl)
          alert('Enlace de ubicación copiado al portapapeles')
        }
      },
      () => {
        alert('No se pudo obtener tu ubicación')
      }
    )
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Button
          variant="ghost"
          size="small"
          leftIcon={<ArrowLeft size={20} />}
          onClick={() => navigate(-1)}
        >
          Volver
        </Button>
      </header>

      <div className={styles.emergencyHeader}>
        <div className={styles.emergencyIcon}>
          <Heart size={48} fill="currentColor" />
        </div>
        <h2 className={styles.emergencyTitle}>Botón de Emergencia</h2>
        <p className={styles.emergencySubtitle}>
          Estamos aquí para ayudarte. Selecciona una opción:
        </p>
      </div>

      {/* Primary Contact */}
      {primaryContact && (
        <Card className={styles.emergencyCard}>
          <CardHeader
            title="Llamar a contacto principal"
            subtitle={primaryContact.name}
            icon={<Phone size={24} />}
          />
          <CardContent>
            <Button
              variant="danger"
              size="large"
              fullWidth
              leftIcon={<Phone size={24} />}
              onClick={() => handleCall(primaryContact.phone)}
            >
              Llamar ahora
            </Button>
          </CardContent>
        </Card>
      )}

      {/* WhatsApp */}
      {whatsappContacts.length > 0 && (
        <Card className={styles.emergencyCard}>
          <CardHeader
            title="Enviar WhatsApp"
            subtitle="Notifica rápidamente"
            icon={<MessageCircle size={24} />}
          />
          <CardContent>
            <div className={styles.whatsappList}>
              {whatsappContacts.map(contact => (
                <Button
                  key={contact.id}
                  variant="secondary"
                  size="large"
                  fullWidth
                  leftIcon={<MessageCircle size={20} />}
                  onClick={() => handleWhatsApp(contact.whatsapp!, contact.name)}
                >
                  {contact.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Share Location */}
      <Card className={styles.emergencyCard}>
        <CardHeader
          title="Compartir ubicación"
          subtitle="Envía dónde estás"
          icon={<MapPin size={24} />}
        />
        <CardContent>
          <Button
            variant="outline"
            size="large"
            fullWidth
            leftIcon={<MapPin size={20} />}
            onClick={handleShareLocation}
          >
            Enviar mi ubicación
          </Button>
        </CardContent>
      </Card>

      {/* Emergency Numbers */}
      <Card>
        <CardHeader
          title="Números de emergencia"
          subtitle="Servicios públicos"
          icon={<AlertTriangle size={20} />}
        />
        <CardContent>
          <div className={styles.emergencyNumbers}>
            <Button
              variant="outline"
              size="large"
              fullWidth
              onClick={() => handleCall('911')}
            >
              Emergencias 911
            </Button>
            <Button
              variant="outline"
              size="large"
              fullWidth
              onClick={() => handleCall('107')}
            >
              SAME 107
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Disclaimer */}
      <p className={styles.disclaimer}>
        <AlertTriangle size={14} />
        En caso de emergencia médica grave, llama inmediatamente al 911 o al SAME.
        Esta app es una herramienta de apoyo, no reemplaza los servicios de emergencia.
      </p>
    </div>
  )
}
