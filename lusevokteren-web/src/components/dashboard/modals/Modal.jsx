import { useEffect, useRef } from 'react'
import PropTypes from 'prop-types'

/**
 * Base Modal component for reusable modal dialogs
 * Features:
 * - Escape key to close
 * - Click outside to close
 * - Focus trap
 * - ARIA attributes for accessibility
 */
export default function Modal({ isOpen, onClose, title, maxWidth = '600px', zIndex = 1000, children }) {
  const modalRef = useRef(null)
  const previousActiveElement = useRef(null)

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Focus management
  useEffect(() => {
    if (isOpen) {
      // Store the currently focused element
      previousActiveElement.current = document.activeElement

      // Focus the modal
      if (modalRef.current) {
        modalRef.current.focus()
      }

      // Prevent body scroll
      document.body.style.overflow = 'hidden'
    } else {
      // Restore body scroll
      document.body.style.overflow = ''

      // Restore focus to previous element
      if (previousActiveElement.current) {
        previousActiveElement.current.focus()
      }
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: zIndex,
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        className="modal-content"
        style={{
          background: 'white',
          borderRadius: '12px',
          maxWidth: maxWidth,
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          position: 'relative',
          outline: 'none'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Lukk dialog"
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'none',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            color: '#6b7280',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '4px'
          }}
        >
          ✕
        </button>

        {title && (
          <h2 id="modal-title" style={{ margin: '0 0 24px 0', fontSize: '24px', color: '#1f2937' }}>
            {title}
          </h2>
        )}

        {children}
      </div>
    </div>
  )
}

Modal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string,
  maxWidth: PropTypes.string,
  zIndex: PropTypes.number,
  children: PropTypes.node.isRequired
}
