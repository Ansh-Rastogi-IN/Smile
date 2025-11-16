"use client"
import { useState, useRef } from 'react'

export default function CameraTest() {
  const [stream, setStream] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const videoRef = useRef(null)
  const canvasRef = useRef(null)

  async function startCamera() {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 1280, height: 720 } 
      })
      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
      setMessage('✅ Camera started')
    } catch (err) {
      setMessage('❌ Camera access denied: ' + err.message)
    }
  }

  function stopCamera() {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
      setMessage('📷 Camera stopped')
    }
  }

  async function captureAndUpload() {
    if (!videoRef.current || !canvasRef.current) return
    
    const canvas = canvasRef.current
    const video = videoRef.current
    
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    
    canvas.toBlob(async (blob) => {
      setUploading(true)
      setMessage('📤 Uploading...')
      
      const formData = new FormData()
      formData.append('photo', blob, 'capture.jpg')
      
      try {
        const res = await fetch('http://localhost:3001/upload', {
          method: 'POST',
          body: formData
        })
        if (!res.ok) {
          throw new Error(`Server responded with status ${res.status}`)
        }
        const data = await res.json();
        setMessage(`✅ Uploaded! Total: ${data.total}`)
      } catch (err) {
        console.error('❌ Upload failed:', err);
        setMessage('❌ Upload failed: ' + err.message)
      } finally {
        setUploading(false)
      }
    }, 'image/jpeg', 0.9)
  }

  async function uploadFromGallery(e) {
    const file = e.target.files?.[0]
    if (!file) return
    
    setUploading(true)
    setMessage('📤 Uploading from gallery...')
    
    const formData = new FormData()
    formData.append('photo', file)
    
    try {
      const res = await fetch('http://localhost:3001/upload', {
        method: 'POST',
        body: formData
      })
      const data = await res.json()
      setMessage(`✅ Uploaded! Total: ${data.total}`)
    } catch (err) {
      setMessage('❌ Upload failed: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  async function sendTestSmile() {
    setMessage('🧪 Sending test...')
    try {
      const res = await fetch('http://localhost:3001/test-smile', {
        method: 'POST'
      })
      const data = await res.json()
      setMessage(`✅ Test sent! Total: ${data.total}`)
    } catch (err) {
      setMessage('❌ Test failed: ' + err.message)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold">Camera & Gallery Test</h1>
          <div className="flex gap-3">
            <a 
              href="/" 
              className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
            >
              Home
            </a>
            <a 
              href="/wall" 
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition"
            >
              View Wall
            </a>
          </div>
        </div>

        {message && (
          <div className="mb-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
            {message}
          </div>
        )}

        <div className="grid gap-6">
          {/* Camera Section */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h2 className="text-2xl font-semibold mb-4">📷 Live Camera</h2>
            
            <div className="mb-4 bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-auto"
                style={{ maxHeight: '400px', objectFit: 'contain' }}
              />
            </div>

            <canvas ref={canvasRef} className="hidden" />

            <div className="flex gap-3 flex-wrap">
              {!stream ? (
                <button
                  onClick={startCamera}
                  className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition"
                >
                  Start Camera
                </button>
              ) : (
                <>
                  <button
                    onClick={captureAndUpload}
                    disabled={uploading}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg font-semibold transition"
                  >
                    {uploading ? 'Uploading...' : 'Capture & Upload'}
                  </button>
                  <button
                    onClick={stopCamera}
                    className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-semibold transition"
                  >
                    Stop Camera
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Gallery Upload Section */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h2 className="text-2xl font-semibold mb-4">🖼️ Upload from Gallery</h2>
            <input
              type="file"
              accept="image/*"
              onChange={uploadFromGallery}
              disabled={uploading}
              className="block w-full text-sm text-gray-400 file:mr-4 file:py-3 file:px-6 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700 file:cursor-pointer cursor-pointer"
            />
          </div>

          {/* Test Section */}
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h2 className="text-2xl font-semibold mb-4">🧪 Test Mode</h2>
            <button
              onClick={sendTestSmile}
              className="px-6 py-3 bg-yellow-600 hover:bg-yellow-700 rounded-lg font-semibold transition"
            >
              Send Test Smile (No Image)
            </button>
            <p className="text-sm text-gray-400 mt-2">
              Triggers wall update without uploading a real image
            </p>
          </div>
        </div>

        <div className="mt-8 p-4 bg-gray-900 rounded-lg border border-gray-800 text-sm text-gray-400">
          <p className="font-semibold mb-2">ℹ️ Instructions:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Use <strong>Live Camera</strong> to capture photos from your webcam</li>
            <li>Use <strong>Gallery Upload</strong> to upload existing photos</li>
            <li>Use <strong>Test Mode</strong> to trigger wall updates without images</li>
            <li>Open the Smile Wall in another tab/window to see real-time updates</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
