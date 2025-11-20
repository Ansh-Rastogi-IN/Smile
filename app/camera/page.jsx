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
      // Optimized detection for better accuracy
      const detectorOptions = new faceapi.TinyFaceDetectorOptions({ 
        inputSize: 416, 
        scoreThreshold: 0.5 
      })

      let detections = await faceapi
        .detectAllFaces(video, detectorOptions)
        .withFaceExpressions()

      // Fallback to single face detection for better reliability
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
        const currentSmile = (expressions.happy ?? 0) || 0
        setSmileScore(currentSmile)
        
        // Track smile history for smoother detection
        smileHistoryRef.current.push(currentSmile)
        if (smileHistoryRef.current.length > 8) {
          smileHistoryRef.current.shift()
        }
        
        // Calculate rolling average for stability
        const avgSmile = smileHistoryRef.current.reduce((a, b) => a + b, 0) / smileHistoryRef.current.length
        
        // Track peak smile
        if (currentSmile > peakSmileRef.current) {
          peakSmileRef.current = currentSmile
        }
        
        // Improved streak counting - more forgiving
        if (currentSmile >= 0.60) {
          smileStreakRef.current = smileStreakRef.current + 1
          setSmileStreak(smileStreakRef.current)
        } else {
          smileStreakRef.current = 0
          setSmileStreak(0)
          peakSmileRef.current = Math.max(peakSmileRef.current * 0.95, currentSmile)
        }
        
        // Update best smile
        if (currentSmile > bestSmileScore) {
          setBestSmileScore(currentSmile)
        }
        
        // Auto-capture logic - capture at peak smile moment
        if (autoMode) {
          const now = Date.now()
          const timeSinceLastCapture = now - lastCaptureTimeRef.current
          
          // Trigger when: sustained smile for 3+ frames at 60%+ AND average is 55%+
          const sustainedSmile = smileStreakRef.current >= 3 && currentSmile >= 0.60 && avgSmile >= 0.55
          
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
        peakSmileRef.current = Math.max(peakSmileRef.current * 0.9, 0)
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
    
    // Use actual video dimensions for best quality
    const width = video.videoWidth || video.width || 1920
    const height = video.videoHeight || video.height || 1080
    
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d', { alpha: false })
    
    // Better image quality settings
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    
    // Mirror the image for selfie mode (horizontal flip)
    ctx.translate(canvas.width, 0)
    ctx.scale(-1, 1)
    
    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    
    // Reset transform
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    
    // Show preview with high quality
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95)
    setPreviewImage(dataUrl)
    setShowPreview(true)
    
    // Upload with high quality
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
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
          facingMode: 'user',
          frameRate: { ideal: 30 },
          aspectRatio: { ideal: 16/9 }
        } 
      })
      
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        
        // Wait for video metadata to load for proper dimensions
        await new Promise((resolve) => {
          videoRef.current.onloadedmetadata = resolve
        })
        
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
    <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col">
      {/* Minimalist Header */}
      <header className="absolute top-0 left-0 right-0 z-20 p-8">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <span className="text-white text-xl">📷</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white tracking-tight">Smile Camera</h1>
              <p className="text-white/40 text-xs">
                {autoMode ? 'Auto-detect mode' : 'Manual mode'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-8">
            {/* Auto Mode Toggle */}
            <label className="flex items-center gap-3 cursor-pointer group">
              <span className="text-white/50 text-sm font-medium group-hover:text-white/70 transition">Auto</span>
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
                  }}
                  className="sr-only"
                />
                <div className={`w-12 h-6 rounded-full transition-all duration-300 ${autoMode ? 'bg-blue-500' : 'bg-white/20'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full shadow-lg transform transition-all duration-300 ${autoMode ? 'translate-x-7' : 'translate-x-1'} mt-1`}></div>
                </div>
              </div>
            </label>
            
            {/* Counter */}
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10">
              <div className="text-xl font-bold text-white">{totalSmiles}</div>
              <div className="text-white/40 text-xs">captures</div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Camera View */}
      <div className="flex-1 relative flex items-center justify-center p-8">
        {/* Video Container */}
        <div className="relative w-full max-w-5xl aspect-video rounded-3xl overflow-hidden shadow-2xl border border-white/10 bg-black">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{ transform: 'scaleX(-1)' }}
          />
          
          {/* Countdown Overlay */}
          {countdown > 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-xl">
              <div className="text-white text-[120px] font-light tracking-wider animate-pulse">
                {countdown}
              </div>
            </div>
          )}

          {/* Preview Overlay */}
          {showPreview && previewImage && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/95 backdrop-blur-xl">
              <div className="text-center space-y-4">
                <img 
                  src={previewImage} 
                  alt="Preview" 
                  className="max-w-[90%] max-h-[75vh] rounded-2xl shadow-2xl mx-auto"
                />
                <div className="text-white/80 text-base font-light">
                  Perfect capture! Uploading...
                </div>
              </div>
            </div>
          )}

          {/* Minimal Guide */}
          {isActive && !countdown && !showPreview && (
            <>
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-64 h-64 border-2 border-white/20 rounded-full"></div>
              </div>
              
              {/* Clean Smile Score Indicator */}
              {autoMode && (
                <div className="absolute top-8 left-1/2 transform -translate-x-1/2 z-30">
                  <div className="bg-black/60 backdrop-blur-xl px-6 py-4 rounded-2xl border border-white/10">
                    <div className="text-white space-y-3">
                      {/* Current Score */}
                      <div className="flex items-center gap-4">
                        <span className="text-xs text-white/40 w-8">Now</span>
                        <div className="w-44 h-2 bg-white/10 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-200 ${
                              smileScore >= 0.75 ? 'bg-gradient-to-r from-green-400 to-emerald-500' : 
                              smileScore >= 0.60 ? 'bg-gradient-to-r from-blue-400 to-cyan-500' : 
                              'bg-blue-500/50'
                            }`}
                            style={{ width: `${smileScore * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-medium w-12 text-right">{Math.round(smileScore * 100)}%</span>
                      </div>
                      
                      {/* Best Score */}
                      <div className="flex items-center gap-4">
                        <span className="text-xs text-white/40 w-8">Best</span>
                        <div className="w-44 h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-purple-400 to-pink-400 transition-all duration-500"
                            style={{ width: `${bestSmileScore * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-light w-12 text-right text-purple-300">{Math.round(bestSmileScore * 100)}%</span>
                      </div>
                      
                      {/* Status */}
                      <div className="pt-2 border-t border-white/10">
                        {smileStreak >= 3 && (
                          <div className="text-green-400 text-xs font-medium animate-pulse">
                            Perfect! Capturing now... ({smileStreak})
                          </div>
                        )}
                        {smileScore >= 0.60 && smileStreak >= 1 && smileStreak < 3 && (
                          <div className="text-cyan-300 text-xs">
                            Hold that smile... ({smileStreak})
                          </div>
                        )}
                        {smileScore >= 0.60 && smileStreak < 1 && (
                          <div className="text-blue-300 text-xs">
                            Great! Keep smiling
                          </div>
                        )}
                        {smileScore >= 0.40 && smileScore < 0.60 && (
                          <div className="text-blue-300 text-xs">
                            Almost there...
                          </div>
                        )}
                        {smileScore < 0.40 && (
                          <div className="text-white/30 text-xs">
                            Waiting for smile...
                          </div>
                        )}
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

      {/* Minimalist Footer Controls */}
      <footer className="absolute bottom-0 left-0 right-0 z-20 p-8">
        <div className="max-w-7xl mx-auto space-y-4">
          {/* Status Message */}
          {message && (
            <div className="text-center">
              <div className="inline-block px-4 py-2 bg-white/5 backdrop-blur-sm rounded-full text-white/70 text-xs font-light border border-white/10">
                {message}
              </div>
            </div>
          )}

          {/* Control Buttons */}
          <div className="flex items-center justify-center gap-4">
            {!isActive ? (
              <button
                onClick={startCamera}
                className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white text-sm font-medium rounded-full shadow-lg transition-all duration-300 transform hover:scale-105 active:scale-95"
              >
                Start Camera
              </button>
            ) : (
              <>
                <button
                  onClick={capturePhoto}
                  disabled={countdown > 0 || showPreview}
                  className="px-10 py-3 bg-white hover:bg-white/90 disabled:bg-white/20 disabled:cursor-not-allowed text-slate-900 disabled:text-white/30 text-sm font-semibold rounded-full shadow-lg transition-all duration-200 transform hover:scale-105 active:scale-95"
                >
                  Capture
                </button>
                
                <button
                  onClick={stopCamera}
                  className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white/70 hover:text-white text-xs font-medium rounded-full border border-white/10 transition-all duration-200"
                >
                  Stop
                </button>
              </>
            )}
          </div>

          {/* Minimal Instructions */}
          {isActive && (
            <div className="text-center text-white/30 text-xs font-light">
              {autoMode ? (
                <p>AI-powered detection • Hold your smile for automatic capture</p>
              ) : (
                <p>Position yourself in the circle • Click capture when ready</p>
              )}
            </div>
          )}
        </div>
      </footer>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}
