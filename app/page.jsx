"use client"
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const [totalSmiles, setTotalSmiles] = useState(0)
  const router = useRouter()

  useEffect(() => {
    // Get initial count
    fetch('http://localhost:3001/count')
      .then(res => res.json())
      .then(data => setTotalSmiles(data.total_count))
      .catch(() => {})
  }, [])

  const features = [
    {
      title: '🎬 Live Smile Wall',
      description: 'Fullscreen display showing the latest smiles in real-time',
      path: '/wall',
      color: 'from-purple-600 to-blue-600',
      icon: '🖼️'
    },
    {
      title: '📷 Smart Camera',
      description: 'Auto-detect smiles or manual capture with countdown',
      path: '/camera',
      color: 'from-blue-600 to-cyan-600',
      icon: '🤖'
    },
    {
      title: '📹 Camera Manager',
      description: 'Add and manage multiple Raspberry Pi cameras',
      path: '/cameras',
      color: 'from-green-600 to-emerald-600',
      icon: '⚙️'
    },
    {
      title: '🧪 Test Studio',
      description: 'Manual testing, gallery upload, and diagnostics',
      path: '/test',
      color: 'from-yellow-600 to-orange-600',
      icon: '⚙️'
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-purple-900">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10">
        {/* Hero Section */}
        <div className="container mx-auto px-3 pt-6 pb-4 max-w-7xl">
          <div className="text-center mb-5">
            <h1 className="text-2xl md:text-3xl font-extrabold text-white mb-2.5 animate-fade-in">
              😊 Smile Wall
            </h1>
            <p className="text-sm md:text-base text-white/70 mb-2.5">
              AI-Powered Smile Detection & Real-Time Photo Wall
            </p>
            <div className="inline-flex items-center gap-1 px-2 py-1 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 mb-2.5">
              <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-white font-semibold text-xs">
                {totalSmiles.toLocaleString()} Smiles Captured
              </span>
            </div>
            <button className="px-3 py-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold rounded-full shadow-lg hover:shadow-xl transition-all text-xs">
              Get Started
            </button>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-2 gap-2.5 max-w-6xl mx-auto mb-4">
            {features.map((feature, index) => (
              <button
                key={feature.path}
                onClick={() => router.push(feature.path)}
                className="group relative overflow-hidden bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-3 text-left hover:scale-[1.02] transition-all duration-300 hover:border-white/30 hover:shadow-xl"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>
                
                <div className="relative z-10">
                  <div className="text-xl mb-1">{feature.icon}</div>
                  <h3 className="text-sm font-bold text-white mb-1 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-blue-400 group-hover:to-purple-400 transition-all">
                    {feature.title}
                  </h3>
                  <p className="text-xs text-white/60 mb-1.5 group-hover:text-white/80 transition-colors">
                    {feature.description}
                  </p>
                  <div className="flex items-center text-blue-400 text-xs font-semibold group-hover:text-blue-300">
                    Launch <span className="ml-2 transform group-hover:translate-x-2 transition-transform">→</span>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-w-4xl mx-auto">
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-2 text-center">
              <div className="text-base font-bold text-blue-400 mb-0.5">{totalSmiles}</div>
              <div className="text-[10px] text-white/60">Total Captures</div>
            </div>
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-2 text-center">
              <div className="text-base font-bold text-green-400 mb-0.5">AI</div>
              <div className="text-[10px] text-white/60">Powered</div>
            </div>
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-2 text-center">
              <div className="text-base font-bold text-purple-400 mb-0.5">Real-Time</div>
              <div className="text-[10px] text-white/60">WebSocket</div>
            </div>
            <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-2 text-center">
              <div className="text-base font-bold text-pink-400 mb-0.5">1080p</div>
              <div className="text-[10px] text-white/60">Quality</div>
            </div>
          </div>

          {/* Info Footer */}
          <div className="mt-5 text-center text-white/40 text-[10px]">
            <p>Built with Next.js 14 • TailwindCSS • Socket.IO • TensorFlow.js</p>
            <div className="mt-1.5 flex justify-center gap-2.5">
              <a href="/docs" className="text-blue-400 hover:text-blue-300">Documentation</a>
              <a href="https://twitter.com" target="_blank" className="text-blue-400 hover:text-blue-300">Twitter</a>
              <a href="mailto:contact@smilewall.com" className="text-blue-400 hover:text-blue-300">Contact</a>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(20px, -50px) scale(1.1); }
          50% { transform: translate(-20px, 20px) scale(0.9); }
          75% { transform: translate(50px, 50px) scale(1.05); }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        .animate-fade-in {
          animation: fade-in 1s ease-out;
        }
      `}</style>
    </div>
  )
}
