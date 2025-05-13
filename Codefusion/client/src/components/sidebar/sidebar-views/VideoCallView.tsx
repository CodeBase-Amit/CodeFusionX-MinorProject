import useResponsive from "@/hooks/useResponsive"
import { useAppContext } from "@/context/AppContext"
import { useParams } from "react-router-dom"

function VideoCallView() {
  const { viewHeight } = useResponsive()
  const { currentUser } = useAppContext()
  const { roomId } = useParams()

  const videoCallUrl = `http://localhost:3030?roomId=${roomId}&username=${encodeURIComponent(currentUser.username)}`

  return (
    <div
      className="flex flex-col w-full"
      style={{ height: viewHeight }}
    >
      <iframe
        src={videoCallUrl}
        title="Video Call"
        className="w-full h-full border-0"
        allow="camera; microphone; fullscreen; display-capture"
      />
    </div>
  )
}

export default VideoCallView
