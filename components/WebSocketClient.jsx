"use client"
import React, { useEffect, useRef } from 'react'
import { io } from 'socket.io-client'

export default function WebSocketClient({ url, onNewSmile = ()=>{}, onTotal = ()=>{} }) {
  const socketRef = useRef(null)
  const fallbackTimerRef = useRef(null)
  const connectedRef = useRef(false)

  useEffect(() => {
    let connected = false
    // try native WebSocket first for raw ws messages
    try {
      const socket = io(url, { transports: ['websocket'], autoConnect: true, reconnectionAttempts: Infinity })
      socketRef.current = socket

      socket.on('connect', () => {
        connected = true
        connectedRef.current = true
        console.log('✅ WebSocket connected to', url)
        // clear fallback
        if (fallbackTimerRef.current) {
          clearInterval(fallbackTimerRef.current)
          fallbackTimerRef.current = null
        }
      })

      socket.on('initial_count', (data) => {
        console.log('📊 Initial count received:', data)
        if (data && data.total_count) onTotal(data.total_count)
      })

      socket.on('new_smile', (data) => {
        // socket.io may deliver parsed object
        console.log('📸 New smile received:', data)
        console.log('🖼️ Image URL:', data.image)
        onNewSmile(data)
        if (data && data.total_count) onTotal(data.total_count)
      })

      socket.on('wall_cleared', (data) => {
        console.log('🗑️ Wall cleared event received')
        // Trigger a page reload or reset
        window.location.reload()
      })

      // also listen to generic message if server emits raw event
      socket.on('message', (payload) => {
        try {
          const parsed = typeof payload === 'string' ? JSON.parse(payload) : payload
          if (parsed.event === 'new_smile') {
            onNewSmile(parsed)
            if (parsed.total_count) onTotal(parsed.total_count)
          }
        } catch (e) { }
      })

      socket.on('disconnect', () => {
        connected = false
        connectedRef.current = false
        startFallbackIfNeeded()
      })

      // safety fallback if not connected after 3s
      const t = setTimeout(() => {
        if (!connected) startFallbackIfNeeded()
      }, 3000)

      function startFallbackIfNeeded() {
        if (fallbackTimerRef.current) return
        const images = [
          '/mock/placeholder-1.svg',
          '/mock/placeholder-2.svg',
          '/mock/placeholder-3.svg',
          '/mock/placeholder-4.svg'
        ]
        fallbackTimerRef.current = setInterval(() => {
          const img = images[Math.floor(Math.random()*images.length)]
          onNewSmile({ event: 'new_smile', image: img, total_count: null })
        }, 7000)
      }

      return () => {
        clearTimeout(t)
        if (socket) socket.disconnect()
        if (fallbackTimerRef.current) clearInterval(fallbackTimerRef.current)
      }
    } catch (e) {
      // start fallback
      startLocalFallback()
    }

    function startLocalFallback() {
      if (fallbackTimerRef.current) return
      const images = [
        '/mock/placeholder-1.svg',
        '/mock/placeholder-2.svg',
        '/mock/placeholder-3.svg',
        '/mock/placeholder-4.svg'
      ]
      fallbackTimerRef.current = setInterval(() => {
        const img = images[Math.floor(Math.random()*images.length)]
        onNewSmile({ event: 'new_smile', image: img, total_count: null })
      }, 8000)
    }

  }, [url])

  return null
}
