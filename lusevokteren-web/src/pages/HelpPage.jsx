import { useState } from 'react'
import {
  QuestionMarkCircleIcon,
  BookOpenIcon,
  ChatBubbleLeftRightIcon,
  EnvelopeIcon,
  PhoneIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline'

const faqItems = [
  {
    category: 'Generelt',
    questions: [
      {
        q: 'Hva er FjordVind?',
        a: 'FjordVind er en profesjonell løsning for overvåking og registrering av lakselus i norske oppdrettsanlegg. Appen hjelper deg med å holde oversikt over lusenivåer, motta varsler, og generere rapporter.'
      },
      {
        q: 'Hvilke enheter støttes?',
        a: 'FjordVind fungerer på alle moderne nettlesere (Chrome, Firefox, Safari, Edge), iOS (iPhone/iPad), Android, og Windows desktop.'
      },
      {
        q: 'Er dataene mine sikre?',
        a: 'Ja. All data krypteres under overføring (TLS) og lagres sikkert i Norge. Vi følger GDPR og har strenge sikkerhetstiltak.'
      }
    ]
  },
  {
    category: 'Lusetelling',
    questions: [
      {
        q: 'Hvor mange fisk bør jeg telle?',
        a: 'Mattilsynet krever minimum 10 fisk per merd. Vi anbefaler 20 fisk for bedre nøyaktighet.'
      },
      {
        q: 'Hva er grenseverdien for lakselus?',
        a: 'Grenseverdien er 0.5 voksne hunnlus per fisk i gjennomsnitt. I perioden uke 21-26 (våravlusning) er grensen 0.2.'
      },
      {
        q: 'Kan jeg redigere en lagret telling?',
        a: 'Ja, innen 24 timer. Gå til Historikk, klikk på tellingen, og velg "Rediger".'
      }
    ]
  },
  {
    category: 'Varsler',
    questions: [
      {
        q: 'Hvorfor mottar jeg ikke varsler?',
        a: 'Sjekk at varsler er aktivert i Innstillinger, og at telefonens innstillinger tillater varsler fra appen.'
      },
      {
        q: 'Kan jeg tilpasse terskelverdiene?',
        a: 'Ja, i Innstillinger → Varsler kan du sette egne terskelverdier for når du vil bli varslet.'
      }
    ]
  },
  {
    category: 'Abonnement',
    questions: [
      {
        q: 'Hva inkluderer gratis prøveperiode?',
        a: '14 dagers full tilgang til Profesjonell-planen uten forpliktelser.'
      },
      {
        q: 'Kan jeg bytte plan?',
        a: 'Ja, du kan oppgradere eller nedgradere når som helst i Innstillinger → Abonnement.'
      }
    ]
  }
]

const quickLinks = [
  {
    title: 'Hurtigstart',
    description: 'Kom i gang på 5 minutter',
    icon: BookOpenIcon,
    href: '/docs/hurtigstart'
  },
  {
    title: 'Brukermanual',
    description: 'Komplett veiledning',
    icon: BookOpenIcon,
    href: '/docs/brukermanual'
  },
  {
    title: 'Kontakt support',
    description: 'Vi hjelper deg gjerne',
    icon: ChatBubbleLeftRightIcon,
    href: '#contact'
  }
]

function FAQItem({ question, answer }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="border-b border-gray-200 dark:border-gray-700">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-4 flex justify-between items-center text-left hover:text-blue-600 dark:hover:text-blue-400"
      >
        <span className="font-medium text-gray-900 dark:text-white">{question}</span>
        {isOpen ? (
          <ChevronUpIcon className="h-5 w-5 text-gray-500" />
        ) : (
          <ChevronDownIcon className="h-5 w-5 text-gray-500" />
        )}
      </button>
      {isOpen && (
        <div className="pb-4 text-gray-600 dark:text-gray-300">
          {answer}
        </div>
      )}
    </div>
  )
}

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState(null)

  const filteredFaq = faqItems.map(category => ({
    ...category,
    questions: category.questions.filter(
      item =>
        item.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.a.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.questions.length > 0)

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <QuestionMarkCircleIcon className="h-16 w-16 mx-auto text-blue-600 dark:text-blue-400 mb-4" />
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Hvordan kan vi hjelpe?
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          Finn svar på vanlige spørsmål eller kontakt support
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-8">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Søk i hjelpesenter..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Quick Links */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        {quickLinks.map((link) => (
          <a
            key={link.title}
            href={link.href}
            className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
          >
            <link.icon className="h-8 w-8 text-blue-600 dark:text-blue-400 mb-2" />
            <h3 className="font-semibold text-gray-900 dark:text-white">{link.title}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">{link.description}</p>
          </a>
        ))}
      </div>

      {/* FAQ */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-8">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Ofte stilte spørsmål
        </h2>

        {filteredFaq.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-300 text-center py-8">
            Ingen resultater funnet. Prøv et annet søkeord eller kontakt support.
          </p>
        ) : (
          filteredFaq.map((category) => (
            <div key={category.category} className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">
                {category.category}
              </h3>
              <div>
                {category.questions.map((item, index) => (
                  <FAQItem key={index} question={item.q} answer={item.a} />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Contact Section */}
      <div id="contact" className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Kontakt support
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          Fant du ikke svaret? Vi er her for å hjelpe!
        </p>

        <div className="grid md:grid-cols-2 gap-4">
          <a
            href="mailto:support@nordfjordsolutions.no"
            className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg hover:shadow-md transition-shadow"
          >
            <EnvelopeIcon className="h-6 w-6 text-blue-600" />
            <div>
              <div className="font-medium text-gray-900 dark:text-white">E-post</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">support@nordfjordsolutions.no</div>
            </div>
          </a>

          <a
            href="tel:+4700000000"
            className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-lg hover:shadow-md transition-shadow"
          >
            <PhoneIcon className="h-6 w-6 text-blue-600" />
            <div>
              <div className="font-medium text-gray-900 dark:text-white">Telefon</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">Man-fre 08-16</div>
            </div>
          </a>
        </div>
      </div>

      {/* Keyboard Shortcuts */}
      <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Tastatursnarveier
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { key: 'N', action: 'Ny telling' },
            { key: 'D', action: 'Dashboard' },
            { key: 'H', action: 'Historikk' },
            { key: 'M', action: 'Kart' },
            { key: 'S', action: 'Innstillinger' },
            { key: '?', action: 'Vis hjelp' },
          ].map((shortcut) => (
            <div key={shortcut.key} className="flex items-center gap-2">
              <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm font-mono">
                {shortcut.key}
              </kbd>
              <span className="text-sm text-gray-600 dark:text-gray-300">{shortcut.action}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
