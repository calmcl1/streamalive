import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda'
import { defaultProvider } from '@aws-sdk/credential-provider-node'
import AMQP from 'amqplib'
import dotenv from 'dotenv'
import { initDB, models } from '../db'
import { shouldUseDotEnv } from '../helpers'
import { REMOVE_STREAM_QUEUE, STREAM_CHECK_TASK_QUEUE } from '../queues'

if (shouldUseDotEnv()) {
    console.log("Using dotenv file...")
    dotenv.config({ path: "'../../.env" })
} else {
    console.log("Not using dotenv file...")
}

interface PollAudioStreamReturn {
    status_code: number
    body: string
    stream_url: string
}

let chan: AMQP.Channel
const AMQP_SERVER = process.env.CLOUDAMQP_URL || process.env.RABBITMQ_URL || "amqp://localhost/streamalive"
const lambda = new LambdaClient({ region: "eu-west-1", credentials: defaultProvider({}) })

async function initQueues() {
    chan = await AMQP.connect(AMQP_SERVER)
        .then(conn => conn.createChannel())
    chan.prefetch(2)

    await Promise.all([
        chan.assertQueue(STREAM_CHECK_TASK_QUEUE, {
            durable: true,
            exclusive: false
        }),
    ])
}

async function onCheckStreamMessage(message: AMQP.ConsumeMessage | null) {
    if (message == null) { return }

    try {
        const parsedMessage: CheckStreamMessage = JSON.parse(message.content.toString())
        const stream = await models.Stream.findByPk(parsedMessage.stream_id)
        if (!stream) {
            // The stream doesn't exist, we should mark it for deletion
            console.warn(`Stream ${parsedMessage.stream_id} doesn't exist, marking for deletion`)
            const msg: RemoveStreamMessage = { stream_id: parsedMessage.stream_id }
            chan.sendToQueue(REMOVE_STREAM_QUEUE, Buffer.from(JSON.stringify(msg)))
            return
        }

        lambda.send(
            new InvokeCommand({
                FunctionName: "pollAudioStream",
                Payload: Buffer.from(JSON.stringify({
                    "stream_url": stream.url
                }))
            }), (err, data) => {
                if (err) { console.error(err) }
                else if (data) {
                    const resp: PollAudioStreamReturn = JSON.parse(JSON.parse(Buffer.from(data.Payload!).toString('utf-8')))
                    console.log(`${stream.id}: ${resp.status_code}`)
                }
            })
    } catch (e) {
        console.error(e)
    } finally {
        chan.ack(message)
    }
}

initDB()
    .then(initQueues)
    .then(() => {
        chan.consume(STREAM_CHECK_TASK_QUEUE, onCheckStreamMessage, { noAck: false })
    })