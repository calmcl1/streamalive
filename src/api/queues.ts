import AMQP from 'amqplib'

let chan: AMQP.Channel

const AMQP_SERVER = process.env.CLOUDAMQP_URL || process.env.RABBITMQ_URL || "amqp://localhost/streamalive"

export async function initQueues() {
    chan = await AMQP.connect(AMQP_SERVER)
        .then(conn => conn.createChannel())
    chan.prefetch(2)

    await Promise.all([process.env.MQ_ADD_STREAM_QUEUE_NAME!, process.env.MQ_REMOVE_STREAM_QUEUE_NAME!, process.env.MQ_CHECK_STREAM_QUEUE_NAME!].map(q => chan.assertQueue(q, { durable: true, exclusive: false })))
    return chan
}