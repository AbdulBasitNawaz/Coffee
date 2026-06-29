import React, { useState, useEffect, useRef } from 'react'
import { motion, useScroll, useTransform, useSpring } from 'framer-motion'
import { Coffee, ChevronRight, Loader2 } from 'lucide-react'
import './App.css'

function App() {
  const [frames, setFrames] = useState([])
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [isLoaded, setIsLoaded] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const canvasRef = useRef(null)
  
  // Bind scroll progress of the viewport
  const { scrollYProgress } = useScroll()

  // Apply spring physics to smooth the scroll progress changes
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 70,
    damping: 22,
    restDelta: 0.0005
  })

  // Detect mobile viewport
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 1024)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // 1. Extract and pre-render frames from the video on mount
  useEffect(() => {
    let active = true
    let blobUrl = null
    const videoUrl = '/Liquid_ripple_inside_coffee_cup_202606292353-ezgif.com-gif-maker.webm'

    const fetchAndExtract = async () => {
      try {
        // Fetch the video file over the network as a blob first
        const response = await fetch(videoUrl)
        if (!response.ok) throw new Error('Video fetch failed')
        const blob = await response.blob()
        
        if (!active) return
        
        // Create a local blob URL to seek locally in memory without making network requests
        blobUrl = URL.createObjectURL(blob)
        
        const tempVideo = document.createElement('video')
        tempVideo.src = blobUrl
        tempVideo.muted = true
        tempVideo.playsInline = true
        tempVideo.preload = 'auto'

        tempVideo.addEventListener('loadedmetadata', async () => {
          const duration = tempVideo.duration
          if (!duration || isNaN(duration)) return

          // Extract frames at ~24fps for optimization and file duration
          const fps = 24
          const totalFrames = Math.max(30, Math.floor(duration * fps))
          const extracted = []

          // Create internal canvas for extraction cropping
          const canvas = document.createElement('canvas')
          canvas.width = 800 // Crisp resolution
          canvas.height = 800
          const ctx = canvas.getContext('2d')

          for (let i = 0; i < totalFrames; i++) {
            if (!active) return
            const time = (i / (totalFrames - 1)) * duration
            tempVideo.currentTime = time

            await new Promise((resolve) => {
              const onSeeked = () => {
                tempVideo.removeEventListener('seeked', onSeeked)
                resolve()
              }
              tempVideo.addEventListener('seeked', onSeeked)
            })

            // Crop out top and bottom letterbox black bars, and right watermark
            const vWidth = tempVideo.videoWidth
            const vHeight = tempVideo.videoHeight
            
            const cropTopPercent = 0.10    // Exclude top 10% (top black bar)
            const cropBottomPercent = 0.10 // Exclude bottom 10% (bottom black bar)
            const cropRightPercent = 0.05  // Exclude right 5% (watermarks)
            
            const usableWidth = vWidth * (1 - cropRightPercent)
            const usableHeight = vHeight * (1 - cropTopPercent - cropBottomPercent)
            
            const size = Math.min(usableWidth, usableHeight)
            const xOffset = (usableWidth - size) / 2
            const yOffset = vHeight * cropTopPercent // Start below the top black bar

            ctx.clearRect(0, 0, canvas.width, canvas.height)
            ctx.drawImage(tempVideo, xOffset, yOffset, size, size, 0, 0, canvas.width, canvas.height)

            const img = new Image()
            img.src = canvas.toDataURL('image/jpeg', 0.85)

            await new Promise((resolve) => {
              img.onload = resolve
            })

            extracted.push(img)
            setLoadingProgress(Math.round(((i + 1) / totalFrames) * 100))
          }

          if (active) {
            setFrames(extracted)
            setIsLoaded(true)
          }
        })
      } catch (err) {
        console.error('Failed to extract video frames locally:', err)
      }
    }

    fetchAndExtract()

    return () => {
      active = false
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl)
      }
    }
  }, [])

  // 2. Render active frame on the visible canvas
  useEffect(() => {
    if (!isLoaded || frames.length === 0) return

    let frameId

    const renderCanvas = () => {
      const canvas = canvasRef.current
      if (canvas) {
        const ctx = canvas.getContext('2d')
        const progress = smoothProgress.get()
        const frameIndex = Math.min(
          frames.length - 1,
          Math.max(0, Math.floor(progress * frames.length))
        )
        
        const activeImg = frames[frameIndex]
        if (activeImg) {
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          ctx.drawImage(activeImg, 0, 0, canvas.width, canvas.height)
        }
      }
      frameId = requestAnimationFrame(renderCanvas)
    }

    frameId = requestAnimationFrame(renderCanvas)
    return () => cancelAnimationFrame(frameId)
  }, [isLoaded, frames, smoothProgress])

  // Map scroll progress to subtle scaling to give depth
  const videoScale = useTransform(scrollYProgress, [0, 0.5, 1], [0.95, 1.08, 0.95])

  // Fade out/in content sections dynamically based on scroll progress (Desktop only)
  const opacitySec1 = useTransform(scrollYProgress, [0, 0.25], [1, 0])
  const opacitySec2 = useTransform(scrollYProgress, [0.25, 0.5, 0.75], [0, 1, 0])
  const opacitySec3 = useTransform(scrollYProgress, [0.75, 1], [0, 1])

  const ySec1 = useTransform(scrollYProgress, [0, 0.25], [0, -50])
  const ySec2 = useTransform(scrollYProgress, [0.25, 0.5, 0.75], [50, 0, -50])
  const ySec3 = useTransform(scrollYProgress, [0.75, 1], [50, 0])

  return (
    <div className="app-container" id="app-landing-page">
      {/* Navigation Header */}
      <header className="navbar">
        <div className="logo-container">
          <Coffee className="logo-icon" size={24} />
          <span>L'Art du Café</span>
        </div>
        <nav className="nav-links">
          <a href="#origin" className="nav-link">Origin</a>
          <a href="#process" className="nav-link">The Process</a>
          <a href="#experience" className="nav-link">Experience</a>
        </nav>
        <button className="btn-cta" type="button">
          Book Table
        </button>
      </header>

      {/* Content Layers Overlay */}
      <main className="content-wrapper">
        {/* Section 1: Intro */}
        <section className="content-section" id="origin">
          <motion.div 
            className="section-content"
            style={isMobile ? {} : { opacity: opacitySec1, y: ySec1 }}
          >
            <span className="section-tag">Pure Essence</span>
            <h1 className="section-title">The Art of the Slow Drip</h1>
            <p className="section-desc">
              Every drop is a symphony of flavor, extracted with meticulous precision to deliver an unparalleled sensory journey.
            </p>
            <div className="scroll-indicator">
              <span>Scroll to Brew</span>
              <div className="scroll-line" />
            </div>
          </motion.div>
        </section>

        {/* Video Container (Placed inline for mobile flow, fixed for desktop) */}
        <div className="sticky-wrapper">
          <div className="video-bounding-box" id="video-container">
            {!isLoaded ? (
              <div className="loading-container">
                <Loader2 className="animate-spin text-gold" size={32} />
                <span className="loading-text">Brewing experience... {loadingProgress}%</span>
                <div className="progress-bar-bg">
                  <div className="progress-bar-fill" style={{ width: `${loadingProgress}%` }} />
                </div>
              </div>
            ) : (
              <motion.canvas
                ref={canvasRef}
                width={800}
                height={800}
                className="video-element"
                style={{
                  scale: videoScale,
                }}
              />
            )}
          </div>
        </div>

        {/* Section 2: The Process */}
        <section className="content-section" id="process">
          <motion.div 
            className="section-content"
            style={isMobile ? {} : { opacity: opacitySec2, y: ySec2 }}
          >
            <span className="section-tag">Hypnotic Rhythm</span>
            <h2 className="section-title">The Perfect Ripple</h2>
            <p className="section-desc">
              Watch the rich oils bloom and swell, creating concentric waves of aroma that define the soul of premium roasting.
            </p>
            <div className="scroll-indicator">
              <span>Explore Further</span>
              <div className="scroll-line" />
            </div>
          </motion.div>
        </section>

        {/* Section 3: Call to Action */}
        <section className="content-section" id="experience">
          <motion.div 
            className="section-content"
            style={isMobile ? {} : { opacity: opacitySec3, y: ySec3 }}
          >
            <span className="section-tag">Indulge Yourselves</span>
            <h2 className="section-title">Savour Every Drop</h2>
            <p className="section-desc">
              Visit our boutique laboratories or order our seasonally sourced, micro-batch single origins directly to your door.
            </p>
            <button className="btn-cta" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', pointerEvents: 'auto', marginTop: '1rem' }} type="button">
              <span>Order Micro-Batch</span>
              <ChevronRight size={16} />
            </button>
          </motion.div>
        </section>
      </main>

      {/* Floating WhatsApp Action Button */}
      <div className="whatsapp-fab-container">
        <span className="whatsapp-tooltip">Chat with us</span>
        <motion.button 
          className="whatsapp-fab"
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          aria-label="Contact on WhatsApp"
          type="button"
        >
          <svg viewBox="0 0 448 512" className="whatsapp-icon" xmlns="http://www.w3.org/2000/svg">
            <path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L3 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/>
          </svg>
        </motion.button>
      </div>
    </div>
  )
}

export default App
