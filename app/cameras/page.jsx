"use client"
import { useState, useEffect } from 'react'

export default function CamerasManagement() {
  const [cameras, setCameras] = useState([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [newCamera, setNewCamera] = useState({
    name: '',
    location: '',
    apiKey: ''
  })
  const [editingId, setEditingId] = useState(null)

  useEffect(() => {
    fetchCameras()
  }, [])

  async function fetchCameras() {
    try {
      const res = await fetch('http://localhost:3001/cameras')
      const data = await res.json()
      setCameras(data.cameras || [])
    } catch (error) {
      console.error('Failed to fetch cameras:', error)
    }
  }

  async function addCamera() {
    if (!newCamera.name || !newCamera.location) {
      alert('Please fill in camera name and location')
      return
    }

    try {
      const res = await fetch('http://localhost:3001/cameras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCamera)
      })
      
      if (res.ok) {
        const data = await res.json()
        setNewCamera({ name: '', location: '', apiKey: '' })
        setShowAddForm(false)
        fetchCameras()
      }
    } catch (error) {
      console.error('Failed to add camera:', error)
      alert('Failed to add camera')
    }
  }

  async function deleteCamera(id) {
    if (!confirm('Are you sure you want to delete this camera?')) return

    try {
      const res = await fetch(`http://localhost:3001/cameras/${id}`, {
        method: 'DELETE'
      })
      
      if (res.ok) {
        fetchCameras()
      }
    } catch (error) {
      console.error('Failed to delete camera:', error)
    }
  }

  async function toggleCamera(id, active) {
    try {
      const res = await fetch(`http://localhost:3001/cameras/${id}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !active })
      })
      
      if (res.ok) {
        fetchCameras()
      }
    } catch (error) {
      console.error('Failed to toggle camera:', error)
    }
  }

  function generateApiKey() {
    const key = 'cam_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    setNewCamera({ ...newCamera, apiKey: key })
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text)
    alert('Copied to clipboard!')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-blue-900 text-white">
      {/* Header */}
      <header className="bg-black/50 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-3 py-2">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">📹 Camera Management</h1>
            <div className="flex gap-2">
              <a href="/" className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg transition text-sm">
                Home
              </a>
              <a href="/gallery" className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 rounded-lg transition text-sm">
                Gallery
              </a>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-3 py-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-blue-400">{cameras.length}</div>
            <div className="text-xs text-white/60">Total Cameras</div>
          </div>
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-green-400">{cameras.filter(c => c.active).length}</div>
            <div className="text-xs text-white/60">Active</div>
          </div>
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-gray-400">{cameras.filter(c => !c.active).length}</div>
            <div className="text-xs text-white/60">Inactive</div>
          </div>
        </div>

        {/* Add Camera Button */}
        <div className="mb-4">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition text-sm flex items-center justify-center gap-2"
          >
            {showAddForm ? '✕ Cancel' : '+ Add New Camera'}
          </button>
        </div>

        {/* Add Camera Form */}
        {showAddForm && (
          <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-4 mb-4">
            <h2 className="text-lg font-bold mb-3">Add New Camera</h2>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold mb-1">Camera Name</label>
                <input
                  type="text"
                  value={newCamera.name}
                  onChange={(e) => setNewCamera({ ...newCamera, name: e.target.value })}
                  placeholder="e.g., Front Entrance"
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">Location</label>
                <input
                  type="text"
                  value={newCamera.location}
                  onChange={(e) => setNewCamera({ ...newCamera, location: e.target.value })}
                  placeholder="e.g., Building A - Floor 1"
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-1">API Key</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCamera.apiKey}
                    onChange={(e) => setNewCamera({ ...newCamera, apiKey: e.target.value })}
                    placeholder="Click Generate or enter custom key"
                    className="flex-1 px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-blue-500 font-mono"
                    readOnly
                  />
                  <button
                    onClick={generateApiKey}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold text-sm transition"
                  >
                    Generate
                  </button>
                </div>
                <p className="text-xs text-white/40 mt-1">This key will be used by the Raspberry Pi to authenticate</p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={addCamera}
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-semibold text-sm transition"
                >
                  Add Camera
                </button>
                <button
                  onClick={() => {
                    setShowAddForm(false)
                    setNewCamera({ name: '', location: '', apiKey: '' })
                  }}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold text-sm transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Cameras List */}
        <div className="space-y-3">
          {cameras.length === 0 ? (
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-8 text-center">
              <div className="text-4xl mb-3">📹</div>
              <p className="text-white/60">No cameras added yet</p>
              <p className="text-sm text-white/40 mt-1">Click "Add New Camera" to get started</p>
            </div>
          ) : (
            cameras.map((camera) => (
              <div
                key={camera.id}
                className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-4 hover:border-blue-500/50 transition"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-bold">{camera.name}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        camera.active 
                          ? 'bg-green-600/20 text-green-400 border border-green-500/50' 
                          : 'bg-gray-600/20 text-gray-400 border border-gray-500/50'
                      }`}>
                        {camera.active ? '● Active' : '○ Inactive'}
                      </span>
                    </div>
                    
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2 text-white/60">
                        <span className="font-semibold">📍 Location:</span>
                        <span>{camera.location}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 text-white/60">
                        <span className="font-semibold">🔑 API Key:</span>
                        <code className="bg-gray-900 px-2 py-0.5 rounded text-xs font-mono">{camera.apiKey}</code>
                        <button
                          onClick={() => copyToClipboard(camera.apiKey)}
                          className="text-blue-400 hover:text-blue-300 text-xs"
                        >
                          📋 Copy
                        </button>
                      </div>

                      <div className="flex items-center gap-2 text-white/60">
                        <span className="font-semibold">📊 Captures:</span>
                        <span>{camera.captureCount || 0} smiles</span>
                      </div>

                      {camera.lastCapture && (
                        <div className="flex items-center gap-2 text-white/60">
                          <span className="font-semibold">🕐 Last Active:</span>
                          <span>{new Date(camera.lastCapture).toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => toggleCamera(camera.id, camera.active)}
                      className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition ${
                        camera.active
                          ? 'bg-yellow-600/20 text-yellow-400 hover:bg-yellow-600/30'
                          : 'bg-green-600/20 text-green-400 hover:bg-green-600/30'
                      }`}
                    >
                      {camera.active ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      onClick={() => deleteCamera(camera.id)}
                      className="px-3 py-1.5 bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded-lg font-semibold text-xs transition"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Setup Instructions */}
        {cameras.length > 0 && (
          <div className="mt-6 bg-blue-900/20 border border-blue-700 rounded-lg p-4">
            <h2 className="text-lg font-bold mb-2 text-blue-400">🔧 Raspberry Pi Setup</h2>
            <div className="text-sm text-white/80 space-y-2">
              <p>1. Install dependencies on your Raspberry Pi:</p>
              <code className="block bg-gray-900 px-3 py-2 rounded text-xs font-mono">
                pip3 install opencv-python requests picamera2
              </code>
              
              <p>2. Configure camera with API key and server URL</p>
              <p>3. The Pi will auto-detect smiles and upload to: <code className="bg-gray-900 px-2 py-1 rounded text-xs">http://YOUR_SERVER:3001/upload</code></p>
              <p>4. Each image will be tagged with camera location automatically</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
