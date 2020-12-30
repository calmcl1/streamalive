import { shouldUseDotEnv } from '../helpers'
if (shouldUseDotEnv()) {
    console.log("Using dotenv file...")
    const dotenv = require('dotenv')
    dotenv.config({ path: "'../../.env" })
} else {
    console.log("Not using dotenv file...")
}

import AMQP from 'amqplib'
import schedule from 'node-schedule'
import { initDB, models } from '../db'
import { StreamAttributes } from '../db/stream_entry'

const AMQP_SERVER = process.env.CLOUDAMQP_URL || process.env.RABBITMQ_URL || "amqp://localhost/streamalive"
/**
 * The key of this field is the ID of the stream to check.
 */
const jobs: { [key: string]: schedule.Job } = {}

let chan: AMQP.Channel

const scheduleRules: { [key in StreamAttributes['check_frequency']]: (from_date: Date) => schedule.RecurrenceRule } = {
    EVERY_HOUR: (from_date: Date) => { const s = new schedule.RecurrenceRule(); s.minute = from_date.getMinutes(); s.second = from_date.getSeconds(); return s },
    EVERY_MINUTE: (from_date: Date) => { const s = new schedule.RecurrenceRule(); s.second = from_date.getSeconds(); return s }
}

async function initQueues() {
    chan = await AMQP.connect(AMQP_SERVER)
        .then(conn => conn.createChannel())
    chan.prefetch(2)

    await Promise.all([process.env.MQ_ADD_STREAM_QUEUE_NAME!, process.env.MQ_REMOVE_STREAM_QUEUE_NAME!, process.env.MQ_CHECK_STREAM_QUEUE_NAME!].map(q => chan.assertQueue(q, { durable: true, exclusive: false })))
}

async function onAddStreamMessage(message: AMQP.ConsumeMessage | null) {
    if (message == null) { return }

    try {
        const parsed_message: AddStreamMessage = JSON.parse(message.content.toString("utf-8"))
        console.info(`Adding new stream: ${parsed_message.stream_url}`)
        const new_stream = await models.Stream.create({ user_id: parsed_message.user_id, url: parsed_message.stream_url, check_frequency: parsed_message.check_frequency })
        addJobToList(new_stream.id, scheduleRules[parsed_message.check_frequency](new_stream.createdAt))
        sendStreamCheckMessage(new_stream.id)
    } catch (e) {
        console.error(e)
    } finally {
        chan.ack(message)
    }
}

async function onRemoveStreamMessage(message: AMQP.ConsumeMessage | null) {
    if (message == null) { return }

    try {
        const parsed_message: RemoveStreamMessage = JSON.parse(message.content.toString("utf-8"))
        console.info(`Removing stream ${parsed_message.stream_id}; reason: ${parsed_message.reason}`)

        const stream = await models.Stream.findByPk(parsed_message.stream_id)
        if (stream) { stream.destroy() }
        if (jobs[parsed_message.stream_id]) {
            jobs[parsed_message.stream_id].cancel(false)
            delete jobs[parsed_message.stream_id]
        }
    } catch (e) {
        console.error(e)
    } finally {
        chan.ack(message)
    }
}

function addJobToList(stream_id: string, schedule_rule: schedule.RecurrenceRule) {
    const new_job = schedule.scheduleJob(schedule_rule, fireDate => {
        sendStreamCheckMessage(stream_id)
    })

    jobs[stream_id] = new_job
    // console.info(`Added streamcheck job to list: ${stream_id}, ${schedule_rule}`)
}

function sendStreamCheckMessage(stream_id: string) {
    const msg: CheckStreamMessage = { stream_id: stream_id }
    console.info(`Checking stream ${stream_id}`)
    chan.sendToQueue(process.env.MQ_CHECK_STREAM_QUEUE_NAME!, Buffer.from(JSON.stringify(msg)))
}

async function initJobs() {
    console.info("Loading jobs from DB");
    const loadedStreams = (await models.Stream.findAll())
        .reduce((acc, stream) => { addJobToList(stream.id, scheduleRules[stream.check_frequency](stream.createdAt)); return acc + 1 }, 0)
    console.info(`Loaded ${loadedStreams} jobs`)
}

initDB()
    .then(initQueues)
    .then(initJobs)
    .then(() => {
        chan.consume(process.env.MQ_ADD_STREAM_QUEUE_NAME!, onAddStreamMessage, { noAck: false })
        chan.consume(process.env.MQ_REMOVE_STREAM_QUEUE_NAME!, onRemoveStreamMessage, { noAck: false })
    })