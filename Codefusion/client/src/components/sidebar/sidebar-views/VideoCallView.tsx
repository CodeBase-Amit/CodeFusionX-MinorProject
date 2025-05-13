import { useEffect, useRef } from "react"
import useResponsive from "@/hooks/useResponsive"
import { useAppContext } from "@/context/AppContext"
import { useParams } from "react-router-dom"

function VideoCallView() {
  const { viewHeight } = useResponsive()
  const { currentUser } = useAppContext()
  const { roomId } = useParams()
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const iframeLoaded = useRef(false)

  // URL for the video call
  const videoCallUrl = `http://localhost:3030?roomId=${roomId}&username=${encodeURIComponent(currentUser.username)}`

  // Keep iframe loaded and active even when not visible
  useEffect(() => {
    // Create or restore iframe
    if (!iframeLoaded.current && iframeRef.current) {
      // Set the source only once to prevent reloading
      if (!iframeRef.current.src) {
        iframeRef.current.src = videoCallUrl
      }
      iframeLoaded.current = true
    }

    // Ensure iframe remains active when tab switches
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && iframeRef.current) {
        // Just a small interaction to keep the iframe active
        const iframe = iframeRef.current
        if (iframe.contentWindow) {
          try {
            // Post a message to keep the iframe active
            iframe.contentWindow.postMessage({
              type: 'keep-alive',
              from: 'codefusion'
            }, '*')
          } catch (e) {
            console.warn('Could not post message to iframe:', e)
          }
        }
      }
    }

    // Listen for tab visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Clean up
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [videoCallUrl])

  return (
    <div
      className="flex flex-col w-full"
      style={{ height: viewHeight }}
    >
      <iframe
        ref={iframeRef}
        title="Video Call"
        className="w-full h-full border-0"
        allow="camera; microphone; fullscreen; display-capture"
      />
    </div>
  )
}

export default VideoCallView
