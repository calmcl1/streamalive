import { StreamAttributes } from "../../db/stream_entry"
import { StreamStateAttributes } from "../../db/stream_state"

const JSONAPISerializer = require("json-api-serializer")

export const serializer = new JSONAPISerializer()

serializer.register('stream', {
    whutelist: ["id", "user_id", "check_frequency", "url", "notify_type"],
    links: {
        self: (data: StreamAttributes) => `https://streamalive.co.uk/api/v1/streams/${data.id}`
    }
})

serializer.register('stream_state', {
    whitelist: ["id", "stream_id", "status_code", "body", "createdAt"],
    links: {
        self: (data: StreamStateAttributes) => `https://streamalive.co.uk/api/v1/streams/${data.stream_id}/state/${data.id}`
    },
    relationships: {
        stream: {
            type: "stream",
            links: (data: StreamAttributes) => `https://streamalive.co.uk/api/v1/streams/${data.id}`
        }
    }
})