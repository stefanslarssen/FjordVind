import React, { useState, useRef } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

/**
 * ImageUpload - Gjenbrukbar komponent for bildeopplasting
 *
 * Props:
 * - onUpload: (images) => void - Callback when images are uploaded
 * - maxFiles: number - Maximum number of files (default: 10)
 * - accept: string - Accepted file types (default: 'image/*')
 * - entityId: string - ID of related entity (sample, treatment, etc.)
 * - entityType: string - Type of entity ('sample', 'treatment', 'observation')
 */
export default function ImageUpload({
  onUpload,
  maxFiles = 10,
  accept = 'image/*',
  entityId,
  entityType = 'sample',
  compact = false
}) {
  const [images, setImages] = useState([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const inputRef = useRef(null)

  async function handleFiles(files) {
    if (!files || files.length === 0) return

    const fileArray = Array.from(files)

    // Check max files
    if (images.length + fileArray.length > maxFiles) {
      setError(`Maks ${maxFiles} bilder tillatt`)
      return
    }

    // Validate file types
    const validFiles = fileArray.filter(file =>
      file.type.startsWith('image/')
    )

    if (validFiles.length !== fileArray.length) {
      setError('Kun bildefiler er tillatt')
      return
    }

    setError('')
    setUploading(true)

    try {
      const formData = new FormData()
      validFiles.forEach(file => formData.append('images', file))
      if (entityId) {
        formData.append(entityType === 'sample' ? 'sampleId' : 'treatmentId', entityId)
      }

      const response = await fetch(`${API_URL}/api/upload/images`, {
        method: 'POST',
        body: formData
      })

      if (response.ok) {
        const data = await response.json()
        const newImages = [...images, ...data.images]
        setImages(newImages)
        onUpload?.(newImages)
      } else {
        const data = await response.json()
        setError(data.error || 'Kunne ikke laste opp bildene')
      }
    } catch (err) {
      setError('Nettverksfeil ved opplasting')
    } finally {
      setUploading(false)
    }
  }

  function handleDrag(e) {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  function handleDrop(e) {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    handleFiles(e.dataTransfer.files)
  }

  async function removeImage(imageId) {
    try {
      const response = await fetch(`${API_URL}/api/images/${imageId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        const newImages = images.filter(img => img.id !== imageId)
        setImages(newImages)
        onUpload?.(newImages)
      }
    } catch (err) {
      console.error('Failed to delete image:', err)
    }
  }

  if (compact) {
    return (
      <div>
        <input
          type="file"
          ref={inputRef}
          accept={accept}
          multiple={maxFiles > 1}
          onChange={(e) => handleFiles(e.target.files)}
          style={{ display: 'none' }}
        />

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          {images.map((img, idx) => (
            <div key={img.id || idx} style={{ position: 'relative' }}>
              <img
                src={`${API_URL}${img.url}`}
                alt={img.originalName || `Bilde ${idx + 1}`}
                style={{
                  width: '50px',
                  height: '50px',
                  objectFit: 'cover',
                  borderRadius: '6px',
                  border: '1px solid var(--border)'
                }}
              />
              <button
                type="button"
                onClick={() => removeImage(img.id)}
                style={{
                  position: 'absolute',
                  top: '-6px',
                  right: '-6px',
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  border: 'none',
                  background: '#ef4444',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                X
              </button>
            </div>
          ))}

          {images.length < maxFiles && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              style={{
                width: '50px',
                height: '50px',
                borderRadius: '6px',
                border: '2px dashed var(--border)',
                background: 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-secondary)',
                fontSize: '20px'
              }}
            >
              {uploading ? '...' : '+'}
            </button>
          )}
        </div>

        {error && (
          <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
            {error}
          </div>
        )}
      </div>
    )
  }

  return (
    <div>
      <input
        type="file"
        ref={inputRef}
        accept={accept}
        multiple={maxFiles > 1}
        onChange={(e) => handleFiles(e.target.files)}
        style={{ display: 'none' }}
      />

      {/* Drop zone */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${dragActive ? 'var(--primary)' : 'var(--border)'}`,
          borderRadius: '8px',
          padding: '24px',
          textAlign: 'center',
          cursor: 'pointer',
          background: dragActive ? 'rgba(59, 130, 246, 0.05)' : 'transparent',
          transition: 'all 0.2s'
        }}
      >
        <div style={{ fontSize: '32px', marginBottom: '8px' }}>
          {uploading ? '...' : '+'}
        </div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          {uploading ? 'Laster opp...' : 'Dra og slipp bilder her, eller klikk for a velge'}
        </div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '4px' }}>
          Maks {maxFiles} bilder, JPEG/PNG/GIF/WebP
        </div>
      </div>

      {error && (
        <div style={{
          color: '#ef4444',
          fontSize: '13px',
          marginTop: '8px',
          padding: '8px 12px',
          background: 'rgba(239, 68, 68, 0.1)',
          borderRadius: '6px'
        }}>
          {error}
        </div>
      )}

      {/* Image previews */}
      {images.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
          gap: '12px',
          marginTop: '16px'
        }}>
          {images.map((img, idx) => (
            <div
              key={img.id || idx}
              style={{
                position: 'relative',
                aspectRatio: '1',
                borderRadius: '8px',
                overflow: 'hidden',
                border: '1px solid var(--border)'
              }}
            >
              <img
                src={`${API_URL}${img.url}`}
                alt={img.originalName || `Bilde ${idx + 1}`}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  removeImage(img.id)
                }}
                style={{
                  position: 'absolute',
                  top: '4px',
                  right: '4px',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  border: 'none',
                  background: 'rgba(239, 68, 68, 0.9)',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                X
              </button>
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                padding: '4px 8px',
                background: 'rgba(0,0,0,0.6)',
                color: 'white',
                fontSize: '11px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {img.originalName || img.filename}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{
        marginTop: '8px',
        fontSize: '12px',
        color: 'var(--text-secondary)'
      }}>
        {images.length} av {maxFiles} bilder lastet opp
      </div>
    </div>
  )
}
