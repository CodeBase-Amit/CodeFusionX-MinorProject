import { useEffect, useRef } from "react"
import useResponsive from "@/hooks/useResponsive"
import { useVideoCall } from "@/context/VideoCallContext"

function VideoCallView() {
  const { viewHeight } = useResponsive()
  const { isVideoCallActive, videoCallUrl } = useVideoCall()
  const viewIframeRef = useRef<HTMLIFrameElement>(null)
  const iframeLoaded = useRef(false)

  // Initialize the view iframe when component mounts or becomes visible
  useEffect(() => {
    if (isVideoCallActive && viewIframeRef.current && !iframeLoaded.current) {
      // Load the UI version of the video call only if not already loaded
      viewIframeRef.current.src = videoCallUrl
      iframeLoaded.current = true
    }

    return () => {
      // Don't actually unload the iframe when unmounting
      // Just mark it as not loaded for next time
      if (viewIframeRef.current) {
        iframeLoaded.current = false
      }
    }
  }, [isVideoCallActive, videoCallUrl])

  return (
    <div
      className="flex flex-col w-full h-full relative"
      style={{ height: viewHeight }}
    >
      <div className="w-full h-full flex-1 overflow-hidden">
        {isVideoCallActive ? (
          <iframe
            ref={viewIframeRef}
            title="Video Call View"
            className="w-full h-full border-none"
            allow="camera; microphone; fullscreen; display-capture"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-lg text-gray-400">Initializing video call...</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default VideoCallView
