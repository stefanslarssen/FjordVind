import { createContext, useContext, useState, useCallback } from 'react'

const MobileMenuContext = createContext(null)

export function MobileMenuProvider({ children }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const openMenu = useCallback(() => setIsMenuOpen(true), [])
  const closeMenu = useCallback(() => setIsMenuOpen(false), [])
  const toggleMenu = useCallback(() => setIsMenuOpen(prev => !prev), [])

  return (
    <MobileMenuContext.Provider value={{ isMenuOpen, openMenu, closeMenu, toggleMenu }}>
      {children}
    </MobileMenuContext.Provider>
  )
}

export function useMobileMenu() {
  const context = useContext(MobileMenuContext)
  if (!context) {
    throw new Error('useMobileMenu must be used within a MobileMenuProvider')
  }
  return context
}
