import { shouldUseDotEnv } from '../helpers'
if (shouldUseDotEnv()) {
    console.log("Using dotenv file...")
    const dotenv = require('dotenv')
    dotenv.config({ path: "'../../.env" })
} else {
    console.log("Not using dotenv file...")
}

import { InvokeCommand, InvokeCommandOutput, LambdaClient } from '@aws-sdk/client-lambda'
import { defaultProvider } from '@aws-sdk/credential-provider-node'
import AMQP from 'amqplib'
import { initDB, models } from '../db'
import { createStreamCheckEventProducer, TOPIC_NAME_STREAM_CHECK_EVENT } from '../db/kafka'
import { REMOVE_STREAM_QUEUE, STREAM_CHECK_TASK_QUEUE } from '../queues'

interface PollAudioStreamReturn {
    status_code: number
    body: string
    stream_url: string
}

let messageQueueChan: AMQP.Channel
let kafkaProd: ReturnType<typeof createStreamCheckEventProducer>

const AMQP_SERVER = process.env.CLOUDAMQP_URL || process.env.RABBITMQ_URL || "amqp://localhost/streamalive"
const lambda = new LambdaClient({ region: "eu-west-1", credentials: defaultProvider({}) })

async function initQueues() {
    console.info("Initing message queues")
    messageQueueChan = await AMQP.connect(AMQP_SERVER)
        .then(conn => conn.createChannel())
    messageQueueChan.prefetch(2)

    await Promise.all([
        messageQueueChan.assertQueue(STREAM_CHECK_TASK_QUEUE, {
            durable: true,
            exclusive: false
        }),
    ])
}

async function initKafka() {
    console.info("Initing kafka")
    return new Promise((res, rej) => {
        console.info("Creating Kafka producer")
        kafkaProd = createStreamCheckEventProducer()
        console.info("Connecting Kafka producer to Confluent ")
        kafkaProd.connect({}, (err, data) => {
            if (err && err.errno != -195) { console.error(err); rej(err) }
            else { res(data) }
        })
    })
}

async function onCheckStreamMessage(message: AMQP.ConsumeMessage | null) {
    if (message == null) { return }

    try {
        const parsedMessage: CheckStreamMessage = JSON.parse(message.content.toString())
        const stream = await models.Stream.findByPk(parsedMessage.stream_id)
        if (!stream) {
            // The stream doesn't exist, we should mark it for deletion
            console.warn(`Stream ${parsedMessage.stream_id} doesn't exist, marking for deletion`)
            const msg: RemoveStreamMessage = { stream_id: parsedMessage.stream_id, reason: "ID_NOT_FOUND" }
            messageQueueChan.sendToQueue(REMOVE_STREAM_QUEUE, Buffer.from(JSON.stringify(msg)))
            return
        }

        console.log(`Got check event request: ${parsedMessage.stream_id}, invoking lambda fn`)

        await new Promise<InvokeCommandOutput>((res, rej) => {
            lambda.send(
                new InvokeCommand({
                    FunctionName: "pollAudioStream",
                    Payload: Buffer.from(JSON.stringify({
                        "stream_url": stream.url
                    }))
                }), (err, data) => {
                    if (err) { rej(err) }
                    else if (data) { res(data) }
                })
        })
            .then(data => {
                const parsed_resp_valid_json = JSON.parse(Buffer.from(data.Payload!).toString('utf-8')) // The JSON output from lambda is invalid, as the strings are double-escaped, so this is the actual JSON
                const resp: PollAudioStreamReturn = JSON.parse(parsed_resp_valid_json)
                kafkaProd.produce(TOPIC_NAME_STREAM_CHECK_EVENT, null, Buffer.from(parsed_resp_valid_json), parsedMessage.stream_id, Date.now());
            })
    } catch (e) {
        console.error(e)
    } finally {
        messageQueueChan.ack(message)
    }
}

initDB()
    .then(initQueues)
    .then(initKafka)
    .then(() => {
        console.info("DB and message queues set, beginning event consume")
        messageQueueChan.consume(STREAM_CHECK_TASK_QUEUE, onCheckStreamMessage, { noAck: false })
    })