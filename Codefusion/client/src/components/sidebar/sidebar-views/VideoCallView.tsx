import { useEffect } from "react"
import useResponsive from "@/hooks/useResponsive"
import { useVideoCall } from "@/context/VideoCallContext"

function VideoCallView() {
  const { viewHeight } = useResponsive()
  const { setVideoCallVisible, isVideoCallActive, startVideoCall } = useVideoCall()

  // When this view is active, make the video call visible
  useEffect(() => {
    // If video call isn't active, start it
    if (!isVideoCallActive) {
      startVideoCall()
    }
    
    // Make the video call visible when this view is active
    setVideoCallVisible(true)
    
    // When navigating away from this view, hide but don't stop the video call
    return () => {
      // We don't hide the video call anymore since it's now a floating window
      // setVideoCallVisible(false)
    }
  }, [setVideoCallVisible, isVideoCallActive, startVideoCall])

  return (
    <div
      className="flex flex-col w-full h-full relative"
      style={{ height: viewHeight }}
    >
      {/* The video call iframe container */}
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center text-gray-400">
          <p>Video call is now displayed as a floating window.</p>
          <p>You can drag, resize, and position it anywhere on your screen.</p>
          {!isVideoCallActive && (
            <p>Starting video call...</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default VideoCallView
