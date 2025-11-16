"use client"
import { useState, useRef, useEffect } from 'react'

export default function SmileDetector() {
  const [isLoading, setIsLoading] = useState(true)
  const [isRunning, setIsRunning] = useState(false)
  const [detectionStatus, setDetectionStatus] = useState('Initializing...')
  const [smileCount, setSmileCount] = useState(0)
  const [lastCapture, setLastCapture] = useState(null)
  const [sensitivity, setSensitivity] = useState(0.7) // 0.5-0.9 range
  const [cooldown, setCooldown] = useState(3000) // ms between captures
  
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const detectionIntervalRef = useRef(null)
  const lastCaptureTimeRef = useRef(0)
  const faceApiRef = useRef(null)

  useEffect(() => {
    loadModels()
    return () => {
      stopDetection()
    }
  }, [])

  async function loadModels() {
    setDetectionStatus('Loading AI models...')
    try {
      // Load face-api from CDN as fallback
      if (!window.faceapi) {
        console.log('Loading face-api from CDN...')
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
      console.log('✅ face-api loaded from CDN')

      const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model'

      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
      ])
      
      setIsLoading(false)
      setDetectionStatus('✅ Ready to detect smiles')
    } catch (err) {
      setDetectionStatus('❌ Failed to load models: ' + err.message)
      console.error('Model loading error:', err)
      console.error('Error details:', err.stack)
    }
  }

  async function startDetection() {
    try {
      setDetectionStatus('Starting camera...')
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 1280, height: 720 } 
      })
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      
      setIsRunning(true)
      setDetectionStatus('👀 Watching for smiles...')
      
      // Start detection loop
      detectionIntervalRef.current = setInterval(detectSmile, 300)
    } catch (err) {
      setDetectionStatus('❌ Camera error: ' + err.message)
    }
  }

  async function detectSmile() {
    if (!videoRef.current || !faceApiRef.current) return
    
    const faceapi = faceApiRef.current
    const video = videoRef.current
    
    try {
      const detections = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceExpressions()
      
      if (detections && detections.length > 0) {
        const expressions = detections[0].expressions
        const smileScore = expressions.happy || 0
        
        setDetectionStatus(`😊 Smile: ${Math.round(smileScore * 100)}%`)
        
        // Check if smile threshold met and cooldown passed
        const now = Date.now()
        if (smileScore >= sensitivity && 
            now - lastCaptureTimeRef.current > cooldown) {
          captureAndUpload()
          lastCaptureTimeRef.current = now
        }
      } else {
        setDetectionStatus('👀 No face detected')
      }
    } catch (err) {
      console.error('Detection error:', err)
    }
  }

  function stopDetection() {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current)
      detectionIntervalRef.current = null
    }
    
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject
      stream.getTracks().forEach(track => track.stop())
      videoRef.current.srcObject = null
    }
    
    setIsRunning(false)
    setDetectionStatus('⏸️ Detection stopped')
  }

  async function captureAndUpload() {
    if (!videoRef.current || !canvasRef.current) return
    
    const canvas = canvasRef.current
    const video = videoRef.current
    
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    
    // Show preview
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
    setLastCapture(dataUrl)
    
    canvas.toBlob(async (blob) => {
      const formData = new FormData()
      formData.append('photo', blob, `smile-${Date.now()}.jpg`)
      
      try {
        const res = await fetch('http://localhost:3001/upload', {
          method: 'POST',
          body: formData
        })
        const data = await res.json()
        setSmileCount(data.total)
        setDetectionStatus(`📸 Smile captured! Total: ${data.total}`)
      } catch (err) {
        console.error('Upload error:', err)
      }
    }, 'image/jpeg', 0.9)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-black to-indigo-900 text-white p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl md:text-2xl font-bold">😊 Smile Detector</h1>
          <div className="flex gap-3">
            <a 
              href="/"
              className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded-lg transition text-xs"
            >
              Home
            </a>
            <a 
              href="/test" 
              className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded-lg transition text-xs"
            >
              Manual Test
            </a>
            <a 
              href="/wall" 
              className="px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded-lg transition text-xs"
            >
              View Wall
            </a>
          </div>
        </div>

        {/* Status Bar */}
        <div className="mb-6 p-4 bg-gray-800 rounded-lg border-2 border-gray-700">
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold">{detectionStatus}</span>
            <span className="text-lg font-bold text-blue-400">{smileCount} smiles</span>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Camera View */}
          <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <h2 className="text-base font-semibold mb-3">📹 Live Camera</h2>
            
            <div className="mb-4 bg-black rounded-lg overflow-hidden aspect-video">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            </div>

            <canvas ref={canvasRef} className="hidden" />

            <div className="flex gap-3">
              {!isRunning ? (
                <button
                  onClick={startDetection}
                  disabled={isLoading}
                  className="flex-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 rounded-lg font-semibold transition text-sm"
                >
                  {isLoading ? 'Loading...' : 'Start Detection'}
                </button>
              ) : (
                <button
                  onClick={stopDetection}
                  className="flex-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded-lg font-semibold transition text-sm"
                >
                  Stop Detection
                </button>
              )}
            </div>
          </div>

          {/* Settings & Preview */}
          <div className="space-y-6">
            {/* Last Capture */}
            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <h2 className="text-base font-semibold mb-3">📸 Last Capture</h2>
              <div className="bg-black rounded-lg overflow-hidden aspect-video">
                {lastCapture ? (
                  <img src={lastCapture} alt="Last smile" className="w-full h-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    No captures yet
                  </div>
                )}
              </div>
            </div>

            {/* Settings */}
            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
              <h2 className="text-base font-semibold mb-4">⚙️ Settings</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Smile Sensitivity: {Math.round(sensitivity * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="0.9"
                    step="0.05"
                    value={sensitivity}
                    onChange={(e) => setSensitivity(parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Lower = more sensitive, Higher = only big smiles
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Cooldown: {cooldown / 1000}s
                  </label>
                  <input
                    type="range"
                    min="1000"
                    max="10000"
                    step="1000"
                    value={cooldown}
                    onChange={(e) => setCooldown(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Time between automatic captures
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-6 p-4 bg-gray-900 rounded-lg border border-gray-800 text-sm text-gray-400">
          <p className="font-semibold mb-2">ℹ️ How it works:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>AI detects faces and analyzes facial expressions in real-time</li>
            <li>When a smile is detected above the threshold, it automatically captures</li>
            <li>Photos are instantly uploaded to the Smile Wall</li>
            <li>Cooldown prevents multiple captures of the same smile</li>
            <li>Adjust sensitivity based on lighting and distance</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
