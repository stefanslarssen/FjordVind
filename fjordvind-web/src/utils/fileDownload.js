// File download utility that works in both browser and Tauri

// Check if running in Tauri
const isTauri = () => {
  return window.__TAURI_INTERNALS__ !== undefined
}

// Download text content as a file
export async function downloadTextFile(content, filename, mimeType = 'text/plain') {
  if (isTauri()) {
    try {
      const { save } = await import('@tauri-apps/plugin-dialog')
      const { writeTextFile } = await import('@tauri-apps/plugin-fs')

      // Open save dialog
      const filePath = await save({
        defaultPath: filename,
        filters: [{
          name: getFilterName(filename),
          extensions: [getExtension(filename)]
        }]
      })

      if (filePath) {
        await writeTextFile(filePath, content)
        return true
      }
      return false
    } catch (error) {
      console.error('Tauri file save failed:', error)
      // Fall back to browser method
      return browserDownload(content, filename, mimeType)
    }
  } else {
    return browserDownload(content, filename, mimeType)
  }
}

// Download binary content as a file
export async function downloadBinaryFile(blob, filename) {
  if (isTauri()) {
    try {
      const { save } = await import('@tauri-apps/plugin-dialog')
      const { writeFile } = await import('@tauri-apps/plugin-fs')

      // Convert blob to Uint8Array
      const arrayBuffer = await blob.arrayBuffer()
      const uint8Array = new Uint8Array(arrayBuffer)

      // Open save dialog
      const filePath = await save({
        defaultPath: filename,
        filters: [{
          name: getFilterName(filename),
          extensions: [getExtension(filename)]
        }]
      })

      if (filePath) {
        await writeFile(filePath, uint8Array)
        return true
      }
      return false
    } catch (error) {
      console.error('Tauri binary file save failed:', error)
      // Fall back to browser method
      return browserDownloadBlob(blob, filename)
    }
  } else {
    return browserDownloadBlob(blob, filename)
  }
}

// Open HTML content for printing (PDF generation)
export function openPrintWindow(htmlContent) {
  if (isTauri()) {
    // In Tauri, we need to use a different approach
    // Create a data URL and open it
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)

    // Use Tauri's shell to open the URL in default browser
    import('@tauri-apps/plugin-shell').then(({ open }) => {
      open(url)
    }).catch(() => {
      // Fallback: try browser method
      const printWindow = window.open('', '_blank')
      if (printWindow) {
        printWindow.document.write(htmlContent)
        printWindow.document.close()
      }
    })
  } else {
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(htmlContent)
      printWindow.document.close()
    }
  }
}

// Browser fallback for text download
function browserDownload(content, filename, mimeType) {
  try {
    const BOM = mimeType.includes('csv') ? '\uFEFF' : ''
    const blob = new Blob([BOM + content], { type: `${mimeType};charset=utf-8` })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    return true
  } catch (error) {
    console.error('Browser download failed:', error)
    return false
  }
}

// Browser fallback for blob download
function browserDownloadBlob(blob, filename) {
  try {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    return true
  } catch (error) {
    console.error('Browser blob download failed:', error)
    return false
  }
}

// Helper to get file extension
function getExtension(filename) {
  const parts = filename.split('.')
  return parts.length > 1 ? parts.pop() : ''
}

// Helper to get filter name for dialog
function getFilterName(filename) {
  const ext = getExtension(filename).toLowerCase()
  switch (ext) {
    case 'csv': return 'CSV Files'
    case 'txt': return 'Text Files'
    case 'pdf': return 'PDF Files'
    case 'xlsx': return 'Excel Files'
    default: return 'All Files'
  }
}
