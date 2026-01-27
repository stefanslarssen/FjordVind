import { useMobileMenu } from '../contexts/MobileMenuContext'

export default function MobileOverlay() {
  const { isMenuOpen, closeMenu } = useMobileMenu()

  if (!isMenuOpen) return null

  return (
    <div
      className="mobile-overlay"
      onClick={closeMenu}
      aria-hidden="true"
    />
  )
}
