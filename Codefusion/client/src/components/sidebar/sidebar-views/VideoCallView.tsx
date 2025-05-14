import { useEffect } from "react"
import useResponsive from "@/hooks/useResponsive"
import { useVideoCall } from "@/context/VideoCallContext"

function VideoCallView() {
  const { viewHeight } = useResponsive()
  const { isVideoCallActive, isVideoCallVisible } = useVideoCall()
  
  return (
    <div
      className="flex flex-col w-full h-full relative"
      style={{ height: viewHeight }}
    >
      {/* The video call iframe container */}
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center text-gray-400">
          <p className="text-lg mb-2">Video Call</p>
          
          {isVideoCallVisible ? (
            <p>Video call is currently displayed as a floating window.</p>
          ) : (
            <p>Video call is currently hidden.</p>
          )}
          
          <p className="mt-4">
            Click the video call button in the sidebar to show/hide the video call.
          </p>
          
          <p className="mt-2">
            You can drag the video call window to reposition it, and resize it using the bottom-right corner.
          </p>
          
          {!isVideoCallActive && (
            <p className="mt-4 text-yellow-400">Starting video call...</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default VideoCallView
