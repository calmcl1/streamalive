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
import { initDB, models, SequelizeStatic } from '../db'
// import { createStreamCheckEventProducer } from '../db/kafka'

let messageQueueChan: AMQP.Channel
// let kafkaProd: ReturnType<typeof createStreamCheckEventProducer>

const AMQP_SERVER = process.env.CLOUDAMQP_URL || process.env.RABBITMQ_URL || "amqp://localhost/streamalive"
const lambda = new LambdaClient({ region: "eu-west-1", credentials: defaultProvider({}) })

async function initQueues() {
    console.info("Initing message queues")
    messageQueueChan = await AMQP.connect(AMQP_SERVER)
        .then(conn => conn.createChannel())
    messageQueueChan.prefetch(2)

    await Promise.all([process.env.MQ_CHECK_STREAM_QUEUE_NAME!, process.env.MQ_REMOVE_STREAM_QUEUE_NAME!, process.env.MQ_NOTIFY_QUEUE_NAME!]
        .map(q => messageQueueChan.assertQueue(q, {
            durable: true,
            exclusive: false
        })
        ))
}

// async function initKafka() {
//     console.info("Initing kafka")
//     return new Promise((res, rej) => {
//         console.info("Creating Kafka producer")
//         kafkaProd = createStreamCheckEventProducer()
//         console.info("Connecting Kafka producer to Confluent ")
//         kafkaProd.connect({}, (err, data) => {
//             if (err && err.errno != -195) { console.error(err); rej(err) }
//             else { res(data) }
//         })
//     })
// }

async function onCheckStreamMessage(message: AMQP.ConsumeMessage | null) {
    if (message == null) { return }

    try {
        const parsedMessage: CheckStreamMessage = JSON.parse(message.content.toString())
        const stream = await models.Stream.findByPk(parsedMessage.stream_id)
        if (!stream) {
            // The stream doesn't exist, we should mark it for deletion
            console.warn(`Stream ${parsedMessage.stream_id} doesn't exist, marking for deletion`)
            const msg: RemoveStreamMessage = { stream_id: parsedMessage.stream_id, reason: "ID_NOT_FOUND" }
            messageQueueChan.sendToQueue(process.env.MQ_REMOVE_STREAM_QUEUE_NAME!, Buffer.from(JSON.stringify(msg)))
            return
        }

        console.log(`Got check event request: ${parsedMessage.stream_id}, invoking lambda fn`)

        const data = await new Promise<InvokeCommandOutput>((res, rej) => {
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

        const parsed_resp_valid_json = JSON.parse(Buffer.from(data.Payload!).toString('utf-8')) // The JSON output from lambda is invalid, as the strings are double-escaped, so this is the actual JSON
        const resp: PollAudioStreamReturn = JSON.parse(parsed_resp_valid_json)

        const currentStreamState = await stream.createStreamState({
            body: resp.body,
            status_code: resp.status_code
        })

        const prevStreamState = await stream.getStreamStates({
            where: { id: { [SequelizeStatic.Op.not]: currentStreamState.id } },
            order: [["createdAt", "DESC"]],
            limit: 1
        })

        if (!prevStreamState.length) {
            // This is the first stream entry
            if (currentStreamState.status_code != 200) {
                // And it's started off down!
                const message: NotifyStreamStateMessage = {
                    stream_id: stream.id,
                    stream_up: false
                }
                messageQueueChan.sendToQueue(process.env.MQ_NOTIFY_QUEUE_NAME!, Buffer.from(JSON.stringify(message)))
            }
        } else if (currentStreamState.status_code != prevStreamState[0].status_code) {
            // This isn't the first stream entry, so check for a change in state
            const message: NotifyStreamStateMessage = {
                stream_id: stream.id,
                stream_up: currentStreamState.status_code == 200
            }

            messageQueueChan.sendToQueue(process.env.MQ_NOTIFY_QUEUE_NAME!, Buffer.from(JSON.stringify(message)))
        }

        // if (currentStreamState.status_code != 200) {
        // Stream is down

        //// Find the most recent uptime
        // const prevStreamEntryOk = await models.StreamState.findOne({
        //     where: { stream_id: currentStreamState.stream_id, status_code: 200 }
        // })

        // Stream has previously been up, so has gone down lately
        // if (prevStreamEntryOk) {

        // Has it just gone down?
        // if (await stream.getStreamStates({})) {
        // // Find the point when the stream went down - the first downtime after the most recetn uptime
        // const firstPrevStreamEntryNotOk = await models.StreamState.findOne({
        //     where: {
        //         id: { [SequelizeStatic.Op.not]: currentStreamState.id },
        //         stream_id: currentStreamState.stream_id,
        //         status_code: { [SequelizeStatic.Op.not]: 200 },
        //         createdAt: { [SequelizeStatic.Op.gt]: prevStreamEntryOk.createdAt }
        //     },
        //     order: [["createdAt", "ASC"]]
        // })

        // console.log(`When stream went down: ${firstPrevStreamEntryNotOk?.createdAt}`)
        // messageQueueChan.sendToQueue(process.env.MQ_NOTIFY_QUEUE_NAME!,)
        // } else {
        // Stream has never been up

        // Find out if this is the first entry
        // if (await models.StreamState.count({ where: { stream_id: currentStreamState.stream_id } }) == 1) {
        //     console.log("Stream has only just been added, and it is down!")
        // }
        // }
        // } else {
        //     // Stream is up

        //     // Has it just come back up?
        //     const prevEntry = await stream.getStreamStates({
        //         where: { id: { [SequelizeStatic.Op.not]: currentStreamState.id } },
        //         order: [["createdAt", "DESC"]],
        //         limit: 1
        //     })

        //     if (prevEntry.length && (prevEntry[0]).status_code != 200) {
        //         console.log("Stream has just come back up!")
        //     }
        // }
        // kafkaProd.produce(TOPIC_NAME_STREAM_CHECK_EVENT, null, Buffer.from(parsed_resp_valid_json), parsedMessage.stream_id, Date.now());

    } catch (e) {
        console.error(e)
    } finally {
        messageQueueChan.ack(message)
    }
}

initDB()
    .then(initQueues)
    // .then(initKafka)
    .then(() => {
        console.info("DB and message queues set, beginning event consume")
        messageQueueChan.consume(process.env.MQ_CHECK_STREAM_QUEUE_NAME!, onCheckStreamMessage, { noAck: false })
    })