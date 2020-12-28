import { shouldUseDotEnv } from '../helpers'
if (shouldUseDotEnv()) {
    console.log("Using dotenv file...")
    const dotenv = require('dotenv')
    dotenv.config({ path: "'../../.env" })
} else {
    console.log("Not using dotenv file...")
}
import { createStreamCheckEventStream } from "../db/kafka";

interface KafkaStreamMessage {
    value: Buffer, // message contents as a Buffer
    size: number, // size of the message, in bytes
    topic: string, // topic the message comes from
    offset: number, // offset the message was read from
    partition: number, // partition the message was on
    key: string, // key of the message if present
    timestamp: number // timestamp of message creation
}

const stream = createStreamCheckEventStream()

stream.on('data', (message: KafkaStreamMessage) => {
    const resp: PollAudioStreamReturn = JSON.parse(message.value.toString('utf-8'))
    if (resp.status_code < 400) { console.info(`${message.key}: ${resp.status_code}`) }
    else { console.error(`${message.key}: ${resp.status_code} - ${resp.body}`) }
    stream.consumer.commitMessage({ offset: message.offset, topic: message.topic, partition: message.partition })
})