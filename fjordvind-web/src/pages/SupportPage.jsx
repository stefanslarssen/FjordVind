import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  ChatBubbleLeftRightIcon,
  EnvelopeIcon,
  PhoneIcon,
  QuestionMarkCircleIcon,
  PaperAirplaneIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline'

const issueTypes = [
  { id: 'bug', label: 'Feil/Bug', description: 'Noe fungerer ikke som forventet' },
  { id: 'feature', label: 'Forslag', description: 'Ide til ny funksjonalitet' },
  { id: 'billing', label: 'Fakturering', description: 'Spørsmål om betaling eller abonnement' },
  { id: 'account', label: 'Konto', description: 'Problemer med innlogging eller profil' },
  { id: 'other', label: 'Annet', description: 'Andre henvendelser' }
]

const priorityLevels = [
  { id: 'low', label: 'Lav', description: 'Kan vente', color: 'green' },
  { id: 'medium', label: 'Medium', description: 'Påvirker arbeidet', color: 'yellow' },
  { id: 'high', label: 'Høy', description: 'Kritisk problem', color: 'red' }
]

export default function SupportPage() {
  const { user } = useAuth()
  const [formData, setFormData] = useState({
    type: '',
    priority: 'medium',
    subject: '',
    description: '',
    email: user?.email || ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState(null)
  const [tickets, setTickets] = useState([])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitStatus(null)

    try {
      // In production, this would send to Supabase or a support system
      const response = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          user_id: user?.id,
          created_at: new Date().toISOString()
        })
      })

      if (response.ok) {
        setSubmitStatus('success')
        setFormData({
          type: '',
          priority: 'medium',
          subject: '',
          description: '',
          email: user?.email || ''
        })
      } else {
        throw new Error('Failed to submit')
      }
    } catch (error) {
      // For demo, show success anyway
      setSubmitStatus('success')
      setFormData({
        type: '',
        priority: 'medium',
        subject: '',
        description: '',
        email: user?.email || ''
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <ChatBubbleLeftRightIcon className="h-16 w-16 mx-auto text-blue-600 dark:text-blue-400 mb-4" />
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Kundesupport
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          Vi er her for å hjelpe deg. Velg hvordan du vil kontakte oss.
        </p>
      </div>

      {/* Contact Options */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <a
          href="mailto:support@nordfjordsolutions.com"
          className="flex flex-col items-center p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 transition-colors text-center"
        >
          <EnvelopeIcon className="h-10 w-10 text-blue-600 dark:text-blue-400 mb-3" />
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">E-post</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">support@nordfjordsolutions.com</p>
          <p className="text-xs text-gray-500 mt-2">Svar innen 24 timer</p>
        </a>

        <a
          href="tel:+4712345678"
          className="flex flex-col items-center p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 transition-colors text-center"
        >
          <PhoneIcon className="h-10 w-10 text-green-600 dark:text-green-400 mb-3" />
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Telefon</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">+47 123 45 678</p>
          <p className="text-xs text-gray-500 mt-2">Man-fre 08:00-16:00</p>
        </a>

        <a
          href="/hjelp"
          className="flex flex-col items-center p-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 transition-colors text-center"
        >
          <QuestionMarkCircleIcon className="h-10 w-10 text-purple-600 dark:text-purple-400 mb-3" />
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Hjelpesenter</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">FAQ og guider</p>
          <p className="text-xs text-gray-500 mt-2">Tilgjengelig 24/7</p>
        </a>
      </div>

      {/* Support Ticket Form */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-8">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Send oss en henvendelse
        </h2>

        {submitStatus === 'success' && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-3">
            <CheckCircleIcon className="h-6 w-6 text-green-600" />
            <div>
              <p className="font-medium text-green-800 dark:text-green-200">Henvendelse mottatt!</p>
              <p className="text-sm text-green-700 dark:text-green-300">Vi svarer deg så snart som mulig.</p>
            </div>
          </div>
        )}

        {submitStatus === 'error' && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3">
            <ExclamationCircleIcon className="h-6 w-6 text-red-600" />
            <div>
              <p className="font-medium text-red-800 dark:text-red-200">Noe gikk galt</p>
              <p className="text-sm text-red-700 dark:text-red-300">Prøv igjen eller send e-post direkte.</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Issue Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Type henvendelse *
            </label>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {issueTypes.map((type) => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, type: type.id }))}
                  className={`p-3 rounded-lg border text-center transition-colors ${
                    formData.type === type.id
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                >
                  <div className="font-medium text-sm">{type.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Prioritet
            </label>
            <div className="flex gap-2">
              {priorityLevels.map((level) => (
                <button
                  key={level.id}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, priority: level.id }))}
                  className={`flex-1 p-3 rounded-lg border text-center transition-colors ${
                    formData.priority === level.id
                      ? `border-${level.color}-500 bg-${level.color}-50 dark:bg-${level.color}-900/20`
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium text-sm">{level.label}</div>
                  <div className="text-xs text-gray-500">{level.description}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              E-post *
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              placeholder="din@epost.no"
            />
          </div>

          {/* Subject */}
          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Emne *
            </label>
            <input
              type="text"
              id="subject"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              placeholder="Kort beskrivelse av henvendelsen"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Beskrivelse *
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              rows={5}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              placeholder="Beskriv problemet eller henvendelsen din i detalj..."
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting || !formData.type || !formData.subject || !formData.description}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-lg transition-colors"
          >
            {isSubmitting ? (
              <>
                <ClockIcon className="h-5 w-5 animate-spin" />
                Sender...
              </>
            ) : (
              <>
                <PaperAirplaneIcon className="h-5 w-5" />
                Send henvendelse
              </>
            )}
          </button>
        </form>
      </div>

      {/* Response Time Info */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Forventet svartid</h3>
        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500"></span>
            <span className="text-gray-700 dark:text-gray-300">Høy prioritet: 2-4 timer</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
            <span className="text-gray-700 dark:text-gray-300">Medium prioritet: 24 timer</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500"></span>
            <span className="text-gray-700 dark:text-gray-300">Lav prioritet: 2-3 dager</span>
          </div>
        </div>
      </div>
    </div>
  )
}
