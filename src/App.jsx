import React, { useState, useEffect, useRef } from 'react'
import { motion, useScroll, useTransform, useSpring } from 'framer-motion'
import { Coffee, ChevronRight, Loader2 } from 'lucide-react'
import './App.css'

function App() {
  const [frames, setFrames] = useState([])
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [isLoaded, setIsLoaded] = useState(false)
  const canvasRef = useRef(null)
  
  // Bind scroll progress of the viewport
  const { scrollYProgress } = useScroll()

  // Apply spring physics to smooth the scroll progress changes
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 70,
    damping: 22,
    restDelta: 0.0005
  })

  // 1. Extract and pre-render frames from the video on mount
  useEffect(() => {
    let active = true
    const videoUrl = '/Liquid_ripple_inside_coffee_cup_202606292353-ezgif.com-gif-maker.webm'
    const tempVideo = document.createElement('video')
    tempVideo.src = videoUrl
    tempVideo.muted = true
    tempVideo.playsInline = true
    tempVideo.preload = 'auto'

    const handleLoadedMetadata = async () => {
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
    }

    tempVideo.addEventListener('loadedmetadata', handleLoadedMetadata)

    return () => {
      active = false
      tempVideo.removeEventListener('loadedmetadata', handleLoadedMetadata)
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

  // Fade out/in content sections dynamically based on scroll progress
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

      {/* Sticky Background Video Container */}
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

      {/* Content Layers Overlay */}
      <main className="content-wrapper">
        {/* Section 1: Intro */}
        <section className="content-section" id="origin">
          <motion.div 
            className="section-content"
            style={{ opacity: opacitySec1, y: ySec1 }}
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

        {/* Section 2: The Process */}
        <section className="content-section" id="process">
          <motion.div 
            className="section-content"
            style={{ opacity: opacitySec2, y: ySec2 }}
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
            style={{ opacity: opacitySec3, y: ySec3 }}
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
    </div>
  )
}

export default App
