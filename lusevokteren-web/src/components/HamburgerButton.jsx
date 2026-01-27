import { useMobileMenu } from '../contexts/MobileMenuContext'

export default function HamburgerButton() {
  const { isMenuOpen, toggleMenu } = useMobileMenu()

  return (
    <button
      className="hamburger-btn"
      onClick={toggleMenu}
      aria-label={isMenuOpen ? 'Lukk meny' : 'Åpne meny'}
      aria-expanded={isMenuOpen}
    >
      <span className={`hamburger-line ${isMenuOpen ? 'open' : ''}`} />
      <span className={`hamburger-line ${isMenuOpen ? 'open' : ''}`} />
      <span className={`hamburger-line ${isMenuOpen ? 'open' : ''}`} />
    </button>
  )
}
