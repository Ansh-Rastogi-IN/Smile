"use client"
import { useEffect, useState } from 'react'
import Grid from '../../components/Grid'
import Counter from '../../components/Counter'
import WebSocketClient from '../../components/WebSocketClient'

const GRID_SIZE = 12 // 3x4 grid (12 tiles total)

export default function WallPage() {
  const [images, setImages] = useState(Array(GRID_SIZE).fill('/mock/placeholder-1.svg'))
  const [total, setTotal] = useState(0)
  const [showConfirm, setShowConfirm] = useState(false)
  const [latestImage, setLatestImage] = useState(null)

  // Load existing images on mount
  useEffect(() => {
    fetch('http://localhost:3001/recent-images')
      .then(res => res.json())
      .then(data => {
        console.log('📥 Loaded recent images:', data.images)
        if (data.images && data.images.length > 0) {
          const loadedImages = [...data.images]
          // Fill remaining slots with placeholders
          while (loadedImages.length < GRID_SIZE) {
            loadedImages.push('/mock/placeholder-1.svg')
          }
          // Trim to grid size
          if (loadedImages.length > GRID_SIZE) {
            loadedImages.length = GRID_SIZE
          }
          setImages(loadedImages)
          setTotal(data.total_count || data.images.length)
        }
      })
      .catch(err => console.error('Failed to load recent images:', err))
  }, [])

  // handler for new smile events
  function handleNewSmile(data) {
    const img = data.image
    
    // Ignore if no image URL provided (initial connection event)
    if (!img) return
    
    const newTotal = data.total_count ?? total + 1
    setTotal(newTotal)
    
    // Trigger spotlight animation
    setLatestImage(img)
    setTimeout(() => setLatestImage(null), 2000)
    
    setImages(prev => {
      const next = [img, ...prev]
      if (next.length > GRID_SIZE) next.length = GRID_SIZE
      return next
    })
  }

  async function handleClearWall() {
    try {
      const res = await fetch('http://localhost:3001/clear-images', {
        method: 'POST'
      })
      const data = await res.json()
      console.log('🗑️ Clear response:', data)
      
      // Reset local state
      setImages(Array(GRID_SIZE).fill('/mock/placeholder-1.svg'))
      setTotal(0)
      setShowConfirm(false)
    } catch (err) {
      console.error('Failed to clear wall:', err)
      alert('Failed to clear wall. Please try again.')
    }
  }

  return (
    <div className="w-screen h-screen flex flex-col bg-gradient-to-br from-gray-900 via-black to-gray-900 overflow-hidden">
      <header className="pt-3 pb-2 flex items-center justify-between w-full px-6 bg-gradient-to-b from-black/60 to-transparent backdrop-blur-sm flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">✨ Smile Wall</h1>
          <p className="text-gray-400 text-xs mt-0.5">Live captured moments</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowConfirm(true)}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs transition"
          >
            🗑️ Clear
          </button>
          <a 
            href="/" 
            className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-xs transition"
          >
            ← Home
          </a>
        </div>
      </header>

      <main className="flex-1 w-full flex items-center justify-center px-4 py-2 relative min-h-0">
        <Grid images={images} latestImage={latestImage} />
        
        {/* Latest Image Spotlight */}
        {latestImage && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-50">
            <div className="animate-spotlight">
              <img 
                src={latestImage} 
                alt="New smile!" 
                className="w-48 h-48 object-cover rounded-xl shadow-2xl border-4 border-yellow-400 animate-pop-in"
              />
              <div className="text-center mt-3 text-yellow-300 text-xl font-bold animate-pulse">
                📸 New Smile!
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="pb-3 bg-gradient-to-t from-black/60 to-transparent backdrop-blur-sm w-full flex-shrink-0">
        <Counter total={total} />
      </footer>

      <WebSocketClient url={`http://localhost:3001`} onNewSmile={handleNewSmile} onTotal={(n)=>setTotal(n)} />

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-gray-900 border-2 border-red-500 rounded-2xl p-8 max-w-md mx-4 shadow-2xl animate-scale-in">
            <h2 className="text-2xl font-bold text-white mb-4">⚠️ Clear Smile Wall?</h2>
            <p className="text-gray-300 mb-6">
              This will permanently delete all {total} captured photos from the server. This action cannot be undone.
            </p>
            <div className="flex gap-4">
              <button
                onClick={handleClearWall}
                className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition"
              >
                Yes, Clear All
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-lg transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      <style jsx>{`
        @keyframes pop-in {
          0% {
            transform: scale(0) rotate(-180deg);
            opacity: 0;
          }
          50% {
            transform: scale(1.1) rotate(5deg);
          }
          100% {
            transform: scale(1) rotate(0deg);
            opacity: 1;
          }
        }
        @keyframes spotlight {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes scale-in {
          from {
            transform: scale(0.9);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        .animate-pop-in {
          animation: pop-in 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        }
        .animate-spotlight {
          animation: spotlight 1s ease-in-out infinite;
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}
