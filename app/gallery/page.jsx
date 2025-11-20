"use client"
import { useState, useEffect } from 'react'

export default function Gallery() {
  const [images, setImages] = useState([])
  const [selectedImages, setSelectedImages] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [filter, setFilter] = useState('all') // all, selected, unselected
  const [sortBy, setSortBy] = useState('newest') // newest, oldest, camera
  const [driveLink, setDriveLink] = useState('https://drive.google.com/drive/folders/11Ox_qUZBi-XrbQdKPkD9YwM9CaXh9MRE')
  const [showDriveLinkInput, setShowDriveLinkInput] = useState(false)
  const [totalSmiles, setTotalSmiles] = useState(0)

  useEffect(() => {
    fetchImages()
    fetchTotalSmiles()
    // Load saved drive link
    const savedLink = localStorage.getItem('driveFolderLink')
    if (savedLink) setDriveLink(savedLink)
    // Refresh every 10 seconds
    const interval = setInterval(() => {
      fetchImages()
      fetchTotalSmiles()
    }, 10000)
    return () => clearInterval(interval)
  }, [])

  function saveDriveLink() {
    if (driveLink.trim()) {
      localStorage.setItem('driveFolderLink', driveLink.trim())
      alert('Drive folder link saved!')
      setShowDriveLinkInput(false)
    }
  }

  function openDriveFolder() {
    if (driveLink.trim()) {
      window.open(driveLink, '_blank')
    } else {
      alert('Please set your Google Drive folder link first')
      setShowDriveLinkInput(true)
    }
  }

  async function downloadSelected() {
    if (selectedImages.length === 0) {
      alert('Please select images to download')
      return
    }

    alert(`Starting download of ${selectedImages.length} images...`)

    // Download each selected image using the download endpoint
    for (const imageId of selectedImages) {
      const image = images.find(img => img.id === imageId)
      if (image) {
        try {
          const a = document.createElement('a')
          a.href = `http://localhost:3001/download/${image.filename}`
          a.download = image.filename
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          // Delay between downloads to prevent browser blocking
          await new Promise(resolve => setTimeout(resolve, 500))
        } catch (error) {
          console.error(`Failed to download ${image.filename}:`, error)
        }
      }
    }
    
    setTimeout(() => {
      alert(`Download initiated for ${selectedImages.length} images! Check your Downloads folder.`)
    }, 1000)
  }

  async function fetchImages() {
    try {
      const res = await fetch('http://localhost:3001/gallery')
      const data = await res.json()
      setImages(data.images || [])
      setLoading(false)
    } catch (error) {
      console.error('Failed to fetch images:', error)
      setLoading(false)
    }
  }

  async function fetchTotalSmiles() {
    try {
      const res = await fetch('http://localhost:3001/count')
      const data = await res.json()
      setTotalSmiles(data.total_count || 0)
    } catch (error) {
      console.error('Failed to fetch total smiles:', error)
    }
  }

  function toggleSelection(imageId) {
    setSelectedImages(prev =>
      prev.includes(imageId)
        ? prev.filter(id => id !== imageId)
        : [...prev, imageId]
    )
  }

  function selectAll() {
    const filtered = getFilteredImages()
    setSelectedImages(filtered.map(img => img.id))
  }

  function deselectAll() {
    setSelectedImages([])
  }

  async function deleteSelected() {
    if (!confirm(`Delete ${selectedImages.length} selected images?`)) return

    setLoading(true)
    try {
      const res = await fetch('http://localhost:3001/gallery/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageIds: selectedImages })
      })

      if (res.ok) {
        setSelectedImages([])
        await fetchImages()
      }
    } catch (error) {
      console.error('Failed to delete images:', error)
    }
    setLoading(false)
  }

  async function uploadToDrive() {
    if (selectedImages.length === 0) {
      alert('Please select images to upload')
      return
    }

    setUploading(true)
    try {
      const res = await fetch('http://localhost:3001/gallery/upload-drive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageIds: selectedImages })
      })

      const data = await res.json()
      if (res.ok) {
        alert(`Successfully uploaded ${data.uploaded} images to Google Drive!`)
        setSelectedImages([])
        await fetchImages()
      } else {
        alert(`Upload failed: ${data.message}`)
      }
    } catch (error) {
      console.error('Failed to upload to Drive:', error)
      alert('Upload failed. Please try again.')
    }
    setUploading(false)
  }

  async function resetCounter() {
    if (!confirm('Are you sure you want to reset the smile counter to 0? This will not delete any images.')) {
      return
    }

    try {
      const res = await fetch('http://localhost:3001/reset-counter', {
        method: 'POST'
      })

      const data = await res.json()
      if (res.ok) {
        alert('✅ Counter reset to 0 successfully!')
        await fetchImages()
        await fetchTotalSmiles()
      } else {
        alert(`Reset failed: ${data.message}`)
      }
    } catch (error) {
      console.error('Failed to reset counter:', error)
      alert('Reset failed. Please try again.')
    }
  }

  function getFilteredImages() {
    let filtered = [...images]

    // Apply filter
    if (filter === 'selected') {
      filtered = filtered.filter(img => selectedImages.includes(img.id))
    } else if (filter === 'unselected') {
      filtered = filtered.filter(img => !selectedImages.includes(img.id))
    }

    // Apply sort
    filtered.sort((a, b) => {
      if (sortBy === 'newest') return b.timestamp - a.timestamp
      if (sortBy === 'oldest') return a.timestamp - b.timestamp
      if (sortBy === 'camera') return (a.camera || '').localeCompare(b.camera || '')
      return 0
    })

    return filtered
  }

  const filteredImages = getFilteredImages()

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-purple-900 text-white">
      {/* Header */}
      <header className="bg-black/50 backdrop-blur-sm border-b border-gray-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">📸 Gallery Dashboard</h1>
              <p className="text-xs text-white/60">{images.length} total images | {selectedImages.length} selected | 😊 {totalSmiles} total smiles</p>
            </div>
            <div className="flex gap-2">
              <a href="/" className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg transition text-sm">
                Home
              </a>
              <a href="/camera" className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg transition text-sm">
                Camera
              </a>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* Controls Bar */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-4 mb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Selection Controls */}
            <div className="flex gap-2">
              <button
                onClick={selectAll}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-semibold transition"
              >
                Select All
              </button>
              <button
                onClick={deselectAll}
                className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-semibold transition"
              >
                Deselect All
              </button>
            </div>

            {/* Filter & Sort */}
            <div className="flex gap-2">
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="px-3 py-1.5 bg-gray-900 border border-gray-600 rounded-lg text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Images</option>
                <option value="selected">Selected Only</option>
                <option value="unselected">Unselected Only</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-1.5 bg-gray-900 border border-gray-600 rounded-lg text-sm focus:outline-none focus:border-blue-500"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="camera">By Camera</option>
              </select>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowDriveLinkInput(!showDriveLinkInput)}
                className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-semibold transition flex items-center gap-2"
              >
                ⚙️ Drive Settings
              </button>
              <button
                onClick={openDriveFolder}
                disabled={!driveLink.trim()}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-sm font-semibold transition flex items-center gap-2"
              >
                📁 Open Drive Folder
              </button>
              <button
                onClick={downloadSelected}
                disabled={selectedImages.length === 0}
                className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-sm font-semibold transition flex items-center gap-2"
              >
                💾 Download ({selectedImages.length})
              </button>
              <button
                onClick={uploadToDrive}
                disabled={selectedImages.length === 0 || uploading}
                className="px-4 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-sm font-semibold transition flex items-center gap-2"
              >
                {uploading ? '⏳ Uploading...' : `📤 Auto Upload (${selectedImages.length})`}
              </button>
              <button
                onClick={deleteSelected}
                disabled={selectedImages.length === 0}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-sm font-semibold transition"
              >
                🗑️ Delete ({selectedImages.length})
              </button>
              <button
                onClick={resetCounter}
                className="px-4 py-1.5 bg-orange-600 hover:bg-orange-700 rounded-lg text-sm font-semibold transition flex items-center gap-2"
              >
                🔄 Reset Counter
              </button>
            </div>
          </div>
        </div>

        {/* Drive Link Settings Panel */}
        {showDriveLinkInput && (
          <div className="bg-purple-900/30 backdrop-blur-sm border border-purple-600/50 rounded-lg p-4 mb-4">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <span>🔗</span> Google Drive Folder Link
            </h3>
            <p className="text-sm text-white/60 mb-3">
              Paste your Google Drive folder link here. You can then quickly open it to manually drag and drop selected images.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={driveLink}
                onChange={(e) => setDriveLink(e.target.value)}
                placeholder="https://drive.google.com/drive/folders/..."
                className="flex-1 px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-sm focus:outline-none focus:border-purple-500"
              />
              <button
                onClick={saveDriveLink}
                className="px-6 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm font-semibold transition"
              >
                Save Link
              </button>
              <button
                onClick={() => setShowDriveLinkInput(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition"
              >
                Cancel
              </button>
            </div>
            {driveLink && (
              <p className="text-xs text-green-400 mt-2">✓ Link saved and ready to use</p>
            )}
          </div>
        )}

        {/* Images Grid */}
        {loading ? (
          <div className="text-center py-20">
            <div className="text-4xl mb-4">⏳</div>
            <p className="text-white/60">Loading images...</p>
          </div>
        ) : filteredImages.length === 0 ? (
          <div className="text-center py-20 bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg">
            <div className="text-6xl mb-4">📷</div>
            <p className="text-xl text-white/80 mb-2">No images found</p>
            <p className="text-sm text-white/40">Capture some smiles to see them here!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {filteredImages.map((image) => (
              <div
                key={image.id}
                className={`relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                  selectedImages.includes(image.id)
                    ? 'border-blue-500 ring-2 ring-blue-500/50'
                    : 'border-gray-700 hover:border-blue-400'
                }`}
                onClick={() => toggleSelection(image.id)}
              >
                {/* Image */}
                <div className="aspect-square bg-gray-900">
                  <img
                    src={image.url}
                    alt={`Capture ${image.id}`}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>

                {/* Selection Indicator */}
                <div className={`absolute top-2 right-2 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                  selectedImages.includes(image.id)
                    ? 'bg-blue-500 border-white'
                    : 'bg-black/50 border-white/50 group-hover:bg-black/70'
                }`}>
                  {selectedImages.includes(image.id) && (
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>

                {/* Info Overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-xs font-semibold">{new Date(image.timestamp).toLocaleString()}</p>
                  {image.camera && (
                    <p className="text-[10px] text-white/60">📍 {image.camera}</p>
                  )}
                  {image.uploaded && (
                    <p className="text-[10px] text-green-400">✅ Uploaded to Drive</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
