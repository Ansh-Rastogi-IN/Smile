"use client"
import { useState, useRef, useEffect } from 'react'

export default function CameraInterface() {
  const [isActive, setIsActive] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [message, setMessage] = useState('')
  const [totalSmiles, setTotalSmiles] = useState(0)
  const [previewImage, setPreviewImage] = useState(null)
  const [showPreview, setShowPreview] = useState(false)
  const [autoMode, setAutoMode] = useState(true)
  const [smileScore, setSmileScore] = useState(0)
  const [isDetecting, setIsDetecting] = useState(false)
  const [bestSmileScore, setBestSmileScore] = useState(0)
  const [smileStreak, setSmileStreak] = useState(0)
  
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const detectionIntervalRef = useRef(null)
  const lastCaptureTimeRef = useRef(0)
  const faceApiRef = useRef(null)
  const isLoadingModelsRef = useRef(false)
  const smileHistoryRef = useRef([])
  const peakSmileRef = useRef(0)
  const isDetectingRef = useRef(false)
  const smileStreakRef = useRef(0)

  useEffect(() => {
    // Get initial count
    fetch('http://localhost:3001/count')
      .then(res => res.json())
      .then(data => setTotalSmiles(data.total_count))
      .catch(() => {})

    return () => {
      stopCamera()
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current)
      }
    }
  }, [])

  async function loadModels() {
    if (isLoadingModelsRef.current || faceApiRef.current) {
      return
    }
    
    isLoadingModelsRef.current = true
    setMessage('Loading AI models...')
    
    try {
      // Load face-api from CDN as fallback
      if (!window.faceapi) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script')
          script.src = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/dist/face-api.min.js'
          script.onload = resolve
          script.onerror = reject
          document.head.appendChild(script)
        })
      }
      
      const faceapi = window.faceapi
      if (!faceapi) {
        throw new Error('face-api not available')
      }
      
      faceApiRef.current = faceapi
      
      const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model'
      
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL)
      await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
      
      isLoadingModelsRef.current = false
      
      if (autoMode) {
        setMessage('✅ AI Ready - Smile to capture automatically!')
      } else {
        setMessage('✅ AI Ready - Manual capture mode')
      }
    } catch (err) {
      console.error('❌ Model loading failed:', err)
      setMessage('⚠️ AI unavailable - using manual mode')
      isLoadingModelsRef.current = false
    }
  }

  async function detectSmile() {
    if (!videoRef.current || !faceApiRef.current || !isDetectingRef.current) {
      return
    }
    
    const faceapi = faceApiRef.current
    const video = videoRef.current
    
    try {
      // stronger detection options for reliability (try larger inputSize)
      const detectorOptions = new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.45 })

      let detections = await faceapi
        .detectAllFaces(video, detectorOptions)
        .withFaceExpressions()

      // Fallback: try single face detector if nothing found (sometimes more reliable)
      if ((!detections || detections.length === 0) && faceapi.detectSingleFace) {
        try {
          const single = await faceapi
            .detectSingleFace(video, detectorOptions)
            .withFaceExpressions()
          if (single) {
            detections = [single]
          }
        } catch (e) {
          // Silent fallback
        }
      }

      if (detections && detections.length > 0) {
        const expressions = detections[0]?.expressions || {}
        const currentSmile = (expressions.happy ?? expressions.smile ?? 0) || 0
        setSmileScore(currentSmile)
        
        // Track smile history for better detection
        smileHistoryRef.current.push(currentSmile)
        if (smileHistoryRef.current.length > 10) {
          smileHistoryRef.current.shift()
        }
        
        // Calculate average smile over last few frames
        const avgSmile = smileHistoryRef.current.reduce((a, b) => a + b, 0) / smileHistoryRef.current.length
        
        // Track peak smile in current session
        if (currentSmile > peakSmileRef.current) {
          peakSmileRef.current = currentSmile
        }
        
        // Count consecutive high smile frames (streak)
        if (currentSmile >= 0.65) {
          smileStreakRef.current = smileStreakRef.current + 1
          setSmileStreak(smileStreakRef.current)
        } else {
          smileStreakRef.current = 0
          setSmileStreak(0)
          peakSmileRef.current = Math.max(peakSmileRef.current * 0.95, currentSmile) // Decay peak
        }
        
        // Update best smile indicator
        if (currentSmile > bestSmileScore) {
          setBestSmileScore(currentSmile)
        }
        
        // Only auto-capture if auto mode is enabled
        if (autoMode) {
          const now = Date.now()
          const timeSinceLastCapture = now - lastCaptureTimeRef.current
          
          // More lenient capture: 2+ consecutive frames at 65%+ with 60%+ average
          const sustainedSmile = smileStreakRef.current >= 2 && currentSmile >= 0.65 && avgSmile >= 0.60
          
          if (timeSinceLastCapture > 3000 && !showPreview && countdown === 0) {
            if (sustainedSmile) {
              lastCaptureTimeRef.current = now
              peakSmileRef.current = 0
              smileHistoryRef.current = []
              smileStreakRef.current = 0
              setBestSmileScore(0)
              setSmileStreak(0)
              autoCapturePhoto()
            }
          }
        }
      } else {
        setSmileScore(0)
        smileStreakRef.current = 0
        setSmileStreak(0)
        peakSmileRef.current = Math.max(peakSmileRef.current * 0.9, 0) // Decay when no face
      }
    } catch (err) {
      console.error('Detection error:', err)
    }
  }

  async function autoCapturePhoto() {
    if (!videoRef.current || !canvasRef.current) return
    
    setMessage('✨ Perfect smile! Capturing...')
    
    // Brief flash effect
    setCountdown(1)
    await new Promise(resolve => setTimeout(resolve, 400))
    setCountdown(0)
    
    uploadPhoto()
  }

  function uploadPhoto() {
    if (!videoRef.current || !canvasRef.current) return
    
    const canvas = canvasRef.current
    const video = videoRef.current
    
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    
    // Mirror the image for selfie mode
    ctx.translate(canvas.width, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(video, 0, 0)
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    
    // Show preview
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95)
    setPreviewImage(dataUrl)
    setShowPreview(true)
    
    // Upload
    canvas.toBlob(async (blob) => {
      const formData = new FormData()
      formData.append('photo', blob, `smile-${Date.now()}.jpg`)
      
      try {
        const res = await fetch('http://localhost:3001/upload', {
          method: 'POST',
          body: formData
        })
        const data = await res.json()
        setTotalSmiles(data.total)
        setMessage('✨ Photo captured! Check the Smile Wall!')
        
        // Hide preview and resume detection
        setTimeout(() => {
          setShowPreview(false)
          if (autoMode) {
            setMessage('👀 Looking for smiles... Smile to capture!')
          } else {
            setMessage('Ready for next photo! 😊')
          }
        }, 2500)
      } catch (err) {
        console.error('Upload error:', err)
        setMessage('❌ Upload failed. Server not responding.')
        setShowPreview(false)
      }
    }, 'image/jpeg', 0.95)
  }

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          facingMode: 'user'
        } 
      })
      
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      
      setIsActive(true)
      
      // Load AI models first
      await loadModels()
      
      // Always start detection for smile tracking (UI feedback)
      if (faceApiRef.current) {
        // Use ref for immediate sync check (no state delay)
        isDetectingRef.current = true
        setIsDetecting(true)
        
        detectionIntervalRef.current = setInterval(detectSmile, 300)
        
        if (autoMode) {
          setMessage('👀 Looking for smiles... Smile to capture!')
        } else {
          setMessage('Ready! Click CAPTURE when you\'re smiling 😊')
        }
      }
    } catch (err) {
      console.error('❌ Camera error:', err)
      setMessage('❌ Camera access denied. Please allow camera permissions.')
    }
  }

  function stopCamera() {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current)
      detectionIntervalRef.current = null
    }
    isDetectingRef.current = false
    setIsDetecting(false)
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setIsActive(false)
    setSmileScore(0)
  }

  async function capturePhoto() {
    if (!videoRef.current || !canvasRef.current) return
    
    // Start countdown for manual mode
    setMessage('')
    for (let i = 3; i > 0; i--) {
      setCountdown(i)
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    setCountdown(0)
    
    uploadPhoto()
  }

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      {/* Header */}
      <header className="bg-gradient-to-b from-black/80 to-transparent absolute top-0 left-0 right-0 z-20 p-6">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div>
            <h1 className="text-xl font-bold text-white">📷 Smile Camera</h1>
            <p className="text-white/70 text-sm mt-1">
              {autoMode ? '🤖 Auto-capture enabled - Just smile!' : 'Manual capture mode'}
            </p>
          </div>
          <div className="flex items-center gap-6">
            {/* Auto Mode Toggle */}
            <div className="text-right">
              <label className="flex items-center gap-3 cursor-pointer">
                <span className="text-white/70 text-sm">Auto Mode</span>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={autoMode}
                    onChange={(e) => {
                      const newAutoMode = e.target.checked
                      setAutoMode(newAutoMode)
                      
                      if (newAutoMode) {
                        setMessage('👀 Looking for smiles... Smile to capture!')
                      } else {
                        setMessage('Ready! Click CAPTURE when you\'re smiling 😊')
                      }
                      
                      // Detection stays running for UI feedback in both modes
                      // Only auto-capture behavior changes
                    }}
                    className="sr-only"
                  />
                  <div className={`w-14 h-8 rounded-full transition ${autoMode ? 'bg-green-600' : 'bg-gray-600'}`}>
                    <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition ${autoMode ? 'translate-x-7' : 'translate-x-1'} mt-1`}></div>
                  </div>
                </div>
              </label>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-white">{totalSmiles}</div>
              <div className="text-white/70 text-sm">Total Smiles</div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Camera View */}
      <div className="flex-1 relative flex items-center justify-center">
        {/* Video Feed */}
        <div className="relative w-full h-full flex items-center justify-center bg-black">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="max-w-full max-h-full object-contain"
            style={{ transform: 'scaleX(-1)' }}
          />
          
          {/* Countdown Overlay */}
          {countdown > 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="text-white text-[200px] font-bold animate-pulse">
                {countdown}
              </div>
            </div>
          )}

          {/* Preview Overlay */}
          {showPreview && previewImage && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/90 backdrop-blur-sm animate-fade-in">
              <div className="text-center">
                <img 
                  src={previewImage} 
                  alt="Preview" 
                  className="max-w-[80vw] max-h-[70vh] rounded-2xl shadow-2xl mb-4"
                />
                <div className="text-white text-xl font-semibold">
                  ✨ Great smile! Uploading...
                </div>
              </div>
            </div>
          )}

          {/* Guide Frame */}
          {isActive && !countdown && !showPreview && (
            <>
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-[600px] h-[600px] border-4 border-white/30 rounded-full"></div>
              </div>
              
              {/* Smile Score Indicator */}
              {autoMode && (
                <div className="absolute top-24 left-1/2 transform -translate-x-1/2 z-30">
                  <div className="bg-black/80 backdrop-blur-md px-4 py-2 rounded-xl border-2 border-white/30 shadow-2xl">
                    <div className="text-white text-center">
                      <div className="text-sm font-semibold opacity-80 mb-2">🎯 Smile Quality</div>
                      
                      {/* Current Smile Bar */}
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-xs opacity-60 w-12">Now</span>
                        <div className="w-48 h-4 bg-gray-700 rounded-full overflow-hidden border border-gray-600">
                          <div 
                            className={`h-full transition-all duration-200 ${
                              smileScore >= 0.85 ? 'bg-gradient-to-r from-green-400 to-green-500' : 
                              smileScore >= 0.75 ? 'bg-gradient-to-r from-yellow-400 to-green-400' : 
                              smileScore >= 0.60 ? 'bg-gradient-to-r from-blue-400 to-yellow-400' : 
                              'bg-blue-500'
                            }`}
                            style={{ width: `${smileScore * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-base font-bold w-14">{Math.round(smileScore * 100)}%</span>
                      </div>
                      
                      {/* Best Smile Indicator */}
                      <div className="flex items-center gap-3">
                        <span className="text-xs opacity-60 w-12">Best</span>
                        <div className="w-48 h-2 bg-gray-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                            style={{ width: `${bestSmileScore * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-semibold w-14 text-purple-300">{Math.round(bestSmileScore * 100)}%</span>
                      </div>
                      
                      {/* Status Messages */}
                      {smileStreak >= 3 && (
                        <div className="text-green-400 text-sm mt-3 font-semibold animate-pulse">
                          🔥 Perfect! Hold it... ({smileStreak})
                        </div>
                      )}
                      {smileScore >= 0.75 && smileStreak < 3 && (
                        <div className="text-yellow-300 text-sm mt-3">
                          😊 Great smile! Keep it steady...
                        </div>
                      )}
                      {smileScore < 0.75 && smileScore >= 0.50 && (
                        <div className="text-blue-300 text-sm mt-3">
                          🙂 Getting there... smile bigger!
                        </div>
                      )}
                      {smileScore < 0.50 && (
                        <div className="text-gray-400 text-sm mt-3">
                          😐 Show me that smile!
                        </div>
                      )}
                      
                      <div className="text-xs opacity-40 mt-3 border-t border-gray-700 pt-2">
                        AI: {isDetecting ? '✅' : '⏳'} | Cooldown: 5s | Quality: {smileStreak >= 3 ? 'Excellent' : 'Tracking'}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Footer Controls */}
      <footer className="bg-gradient-to-t from-black/80 to-transparent absolute bottom-0 left-0 right-0 z-20 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Status Message */}
          {message && (
            <div className="text-center mb-4">
              <div className="inline-block px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-full text-white text-sm">
                {message}
              </div>
            </div>
          )}

          {/* Control Buttons */}
          <div className="flex items-center justify-center gap-6">
            {!isActive ? (
              <button
                onClick={startCamera}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white text-lg font-bold rounded-xl shadow-lg transition transform hover:scale-105 active:scale-95"
              >
                🎥 Start Camera
              </button>
            ) : (
              <>
                {autoMode && (
                  <div className="px-4 py-2 bg-green-600/20 border-2 border-green-500 text-green-300 text-sm font-semibold rounded-lg">
                    🤖 Auto Mode Active - Just smile and I'll capture!
                  </div>
                )}
                
                <button
                  onClick={capturePhoto}
                  disabled={countdown > 0 || showPreview}
                  className="px-8 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-xl font-bold rounded-xl shadow-2xl transition transform hover:scale-105 active:scale-95"
                >
                  📸 CAPTURE
                </button>
                
                <button
                  onClick={stopCamera}
                  className="px-4 py-3 bg-red-600/80 hover:bg-red-700 text-white text-base font-semibold rounded-lg transition"
                >
                  Stop
                </button>
              </>
            )}

            <a
              href="/wall"
              className="px-4 py-3 bg-purple-600/80 hover:bg-purple-700 text-white text-base font-semibold rounded-lg transition"
            >
              View Wall
            </a>

            <a
              href="/"
              className="px-4 py-3 bg-gray-700/80 hover:bg-gray-600 text-white text-base font-semibold rounded-lg transition"
            >
              Home
            </a>
          </div>

          {/* Instructions */}
          <div className="text-center mt-6 text-white/60 text-sm space-y-1">
            {autoMode ? (
              <>
                <p>🎯 <strong>Smart Capture</strong>: AI waits for your best smile</p>
                <p>😊 Smile naturally and hold it - camera captures at peak quality</p>
                <p>⏱️ 5-second cooldown ensures no duplicate shots</p>
                <p>🔥 Keep smiling steadily for 3+ frames = instant capture!</p>
              </>
            ) : (
              <>
                <p>👉 Position your face in the center circle</p>
                <p>😊 Give your best smile and click CAPTURE</p>
                <p>⏱️ 3-second countdown before photo</p>
              </>
            )}
          </div>
        </div>
      </footer>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}
