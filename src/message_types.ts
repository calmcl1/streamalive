interface AddStreamMessage {
    stream_url: string,
    user_id: string,
    check_frequency: "EVERY_HOUR" | "EVERY_MINUTE"
}

interface CheckStreamMessage {
    stream_id: string
}

interface RemoveStreamMessage {
    stream_id: string
    reason: "ID_NOT_FOUND" | "USER_REQUEST"
}

interface NotifyStreamStateMessage {
    stream_id: string
    stream_up: boolean
}

interface PollAudioStreamReturn {
    status_code: number
    body: string
    stream_url: string
}