import { CHECK_FREQUENCY } from "./limits";

export interface AddStreamMessage {
    stream_id?: string
    stream_url?: string,
    user_id?: string,
    check_frequency?: CHECK_FREQUENCY
}

export interface CheckStreamMessage {
    stream_id: string
}

export interface RemoveStreamMessage {
    stream_id: string
    reason: "ID_NOT_FOUND" | "USER_REQUEST"
}

export interface NotifyStreamStateMessage {
    stream_id: string
    stream_up: boolean
}

export interface PollAudioStreamReturn {
    status_code: number
    body: string
    stream_url: string
}