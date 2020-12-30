import { shouldUseDotEnv, shouldUseSendgridSandbox } from '../helpers'
if (shouldUseDotEnv()) {
    console.log("Using dotenv file...")
    const dotenv = require('dotenv')
    dotenv.config({ path: "'../../.env" })
} else {
    console.log("Not using dotenv file...")
}
import sendgrid from "@sendgrid/mail"
import { initDB, models } from '../db'
import auth0 from 'auth0'
import AMQP from 'amqplib'
import { StreamAttributes } from '../db/stream_entry'
// import { createStreamCheckEventStream } from '../db/kafka'

let messageQueueChan: AMQP.Channel
let auth0Mgmt: auth0.ManagementClient
const AMQP_SERVER = process.env.CLOUDAMQP_URL || process.env.RABBITMQ_URL || "amqp://localhost/streamalive"

// interface KafkaStreamMessage {
//     value: Buffer, // message contents as a Buffer
//     size: number, // size of the message, in bytes
//     topic: string, // topic the message comes from
//     offset: number, // offset the message was read from
//     partition: number, // partition the message was on
//     key: string, // key of the message if present
//     timestamp: number // timestamp of message creation
// }

const emailData = {
    from: "mail@callum-mclean.co.uk",
}

const streamDownEmailData = {
    ...emailData,
    templateId: "d-22db4f15b13a40958cb6203fd346a85a",
    dynamicTemplateData: {
        "stream_url": "",
        "stream_failure_reason": "",
        "stream_check_frequency": ""
    }
}

const streamUpEmailData = {
    ...emailData,
    templateId: "d-3b65d30fac48478aadf51f4b8f5b2f69",
    dynamicTemplateData: {
        "stream_url": "",
        "stream_check_frequency": ""
    }
}

const streamCheckFrequencyHumanReadable: { [key in StreamAttributes['check_frequency']]: string } = {
    EVERY_HOUR: "every hour",
    EVERY_MINUTE: "every minute"
}

async function onNotifyMessage(message: AMQP.ConsumeMessage | null) {
    if (message == null) { return }

    const parsed_message: NotifyStreamStateMessage = JSON.parse(message.content.toString('utf-8'))

    const stream = await models.Stream.findByPk(parsed_message.stream_id)
    if (!stream) {
        console.error(`Stream with ID ${parsed_message.stream_id} not found`)
        return
    }

    const user = await auth0Mgmt.getUser({
        id: stream.user_id
    })

    if (stream.notify_type == "EMAIL") {
        if (parsed_message.stream_up) {
            const email_data = {
                ...streamUpEmailData,
                mailSettings: {
                    sandboxMode: { enable: shouldUseSendgridSandbox() }
                },
                "to": user.email
            }

            email_data.dynamicTemplateData = {
                stream_check_frequency: streamCheckFrequencyHumanReadable[stream.check_frequency],
                stream_url: stream.url
            }

            const email_sent = await sendgrid.send(email_data)
            console.log(`Email sent: ${email_sent[0].statusCode} (Sandbox? ${email_data.mailSettings.sandboxMode.enable})`)
        } else {

            const email_data = {
                ...streamDownEmailData,
                mailSettings: {
                    sandboxMode: { enable: shouldUseSendgridSandbox() }
                },
                "to": user.email
            }

            email_data.dynamicTemplateData = {
                stream_check_frequency: streamCheckFrequencyHumanReadable[stream.check_frequency],
                stream_failure_reason: (await stream.getStreamStates({ order: [["createdAt", "DESC"]], limit: 1 }))[0].body,
                stream_url: stream.url
            }

            const email_sent = await sendgrid.send(email_data)
            console.log(`Email sent: ${email_sent[0].statusCode} (Sandbox? ${email_data.mailSettings.sandboxMode.enable})`)
        }
    }
    messageQueueChan.ack(message)
}

initDB()
    .then(async () => {
        messageQueueChan = await AMQP.connect(AMQP_SERVER)
            .then(conn => conn.createChannel())
        messageQueueChan.prefetch(2)

        await messageQueueChan.assertQueue(process.env.MQ_NOTIFY_QUEUE_NAME!, { durable: true, exclusive: false })
    })
    .then(() => {
        sendgrid.setApiKey(process.env.SENDGRID_KEY!)

        auth0Mgmt = new auth0.ManagementClient({
            domain: process.env.AUTH0_DOMAIN!,
            clientId: process.env.AUTH0_CLIENT_ID!,
            clientSecret: process.env.AUTH0_CLIENT_SECRET!,
            scope: "read:users"
        })
    })
    .then(() => {
        messageQueueChan.consume(process.env.MQ_NOTIFY_QUEUE_NAME!, onNotifyMessage, { noAck: false })
    })


        // kafkaStream.on('data', async (message: KafkaStreamMessage) => {
        //     const resp: PollAudioStreamReturn = JSON.parse(message.value.toString('utf-8'))
        //     if (resp.status_code < 400) { console.info(`${message.key}: ${resp.status_code}`) }
        //     else {
        //         console.error(`${message.key}: ${resp.status_code} - ${resp.body}`)

        //         const stream = await models.Stream.findByPk(message.key)
        //         if (!stream) {
        //             console.error(`Stream with ID ${message.key} not found`)
        //             return
        //         }

        //         const user = await auth0Mgmt.getUser({
        //             id: stream.user_id
        //         })

        //         if (stream.notify_type == "EMAIL") {
        //             const email_sent = await sendgrid.send({
        //                 ...streamDownEmailData, mailSettings: {
        //                     sandboxMode: { enable: true }
        //                 },
        //                 "to": user.email
        //             })

        //             console.log(`sent email? ${email_sent}`)
        //         }

        //         kafkaStream.consumer.commitMessage({
        //             offset: message.offset,
        //             partition: message.partition,
        //             topic: message.topic
        //         })
        //     }
        // })
