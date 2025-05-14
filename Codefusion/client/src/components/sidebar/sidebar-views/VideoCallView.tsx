import { useEffect, useRef } from "react"
import useResponsive from "@/hooks/useResponsive"
import { useVideoCall } from "@/context/VideoCallContext"

function VideoCallView() {
  const { viewHeight } = useResponsive()
  const { isVideoCallActive, videoCallUrl } = useVideoCall()
  const viewIframeRef = useRef<HTMLIFrameElement>(null)

  // Initialize the view iframe when component mounts
  useEffect(() => {
    if (isVideoCallActive && viewIframeRef.current) {
      // For the view iframe, we want to reload it each time it's shown
      // This ensures it displays the current state of the video call
      viewIframeRef.current.src = videoCallUrl
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
