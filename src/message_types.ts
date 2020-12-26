interface AddStreamMessage {
    stream_url: string,
    user_id: string,
    check_frequency: "EVERY_HOUR" | "EVERY_MINUTE"
}

interface CheckStreamMessage {
    stream_id: string
}