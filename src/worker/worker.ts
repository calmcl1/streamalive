import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda'
import { defaultProvider } from '@aws-sdk/credential-provider-node'
import AMQP from 'amqplib'
import dotenv from 'dotenv'
import { initDB, models } from '../db'
import { STREAM_CHECK_TASK_QUEUE } from '../queues'

if (process.env.NODE_ENV == "production") {
    console.log("Not using dotenv file...")
} else {
    console.log("Using dotenv file...")
    dotenv.config({ path: "'../../.env" })
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

    await Promise.all([
        chan.assertQueue(STREAM_CHECK_TASK_QUEUE, {
            durable: true,
            exclusive: false
        }),
    ])
}

async function onCheckStreamMessage(message: AMQP.ConsumeMessage | null) {
    if (message == null) { return }

    const parsedMessage: CheckStreamMessage = JSON.parse(message.content.toString())
    const stream = await models.Stream.findByPk(parsedMessage.stream_id)
    if (!stream) { throw new Error("the stream doesn't exist") }
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
    chan.ack(message)
}

initDB()
    .then(initQueues)
    .then(() => {
        chan.consume(STREAM_CHECK_TASK_QUEUE, onCheckStreamMessage, { noAck: false })
    })