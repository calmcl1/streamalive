import AMQP from 'amqplib'
import dotenv from 'dotenv'
import schedule from 'node-schedule'
import { initDB, models } from '../db'
import { shouldUseDotEnv } from '../helpers'
import { ADD_STREAM_QUEUE, STREAM_CHECK_TASK_QUEUE, REMOVE_STREAM_QUEUE } from '../queues'

if (shouldUseDotEnv()) {
    console.log("Using dotenv file...")
    dotenv.config({ path: "'../../.env" })
} else {
    console.log("Not using dotenv file...")
}

const AMQP_SERVER = process.env.CLOUDAMQP_URL || process.env.RABBITMQ_URL || "amqp://localhost/streamalive"
/**
 * The key of this field is the ID of the stream to check.
 */
const jobs: { [key: string]: schedule.Job } = {}

let chan: AMQP.Channel

const scheduleRules = {
    EVERY_HOUR: (() => { const s = new schedule.RecurrenceRule(); s.minute = 0; return s })(),
    EVERY_MINUTE: (() => { const s = new schedule.RecurrenceRule(); s.second = 0; return s })()
}

async function initQueues() {
    chan = await AMQP.connect(AMQP_SERVER)
        .then(conn => conn.createChannel())

    await Promise.all([STREAM_CHECK_TASK_QUEUE, ADD_STREAM_QUEUE, REMOVE_STREAM_QUEUE].map(q => chan.assertQueue(q, { durable: true, exclusive: false })))
}

async function onAddStreamMessage(message: AMQP.ConsumeMessage | null) {
    if (message == null) { return }

    const parsed_message: AddStreamMessage = JSON.parse(message.content.toString("utf-8"))
    const new_stream = await models.Stream.create({ user_id: parsed_message.user_id, url: parsed_message.stream_url, check_frequency: parsed_message.check_frequency })
    addJobToList(new_stream.id, scheduleRules.EVERY_MINUTE)
    chan.ack(message)
}

async function onRemoveStreamMessage(message: AMQP.ConsumeMessage | null) {
    if (message == null) { return }

    const parsed_message: RemoveStreamMessage = JSON.parse(message.content.toString("utf-8"))
    const stream = await models.Stream.findByPk(parsed_message.stream_id)
    if (stream) { stream.destroy() }
    if (jobs[parsed_message.stream_id]) {
        jobs[parsed_message.stream_id]?.cancel(false)
        delete jobs[parsed_message.stream_id]
    }
    chan.ack(message)
}

function addJobToList(stream_id: string, schedule_rule: schedule.RecurrenceRule) {
    const new_job = schedule.scheduleJob(schedule_rule, fireDate => {
        const msg: CheckStreamMessage = { stream_id: stream_id }
        chan.sendToQueue(STREAM_CHECK_TASK_QUEUE, Buffer.from(JSON.stringify(msg)))
    })

    jobs[stream_id] = new_job
    // console.info(`Added streamcheck job to list: ${stream_id}, ${schedule_rule}`)
}

async function initJobs() {
    console.info("Loading jobs from DB");
    const loadedStreams = (await models.Stream.findAll())
        .reduce((acc, stream) => { addJobToList(stream.id, scheduleRules[stream.check_frequency]); return acc + 1 }, 0)
    // for (const stream of await models.Stream.findAll()) {
    //     addJobToList(stream.id, scheduleRules[stream.check_frequency])
    // }
    console.info(`Loaded ${loadedStreams} jobs`)
}

initDB()
    .then(initJobs)
    .then(initQueues)
    .then(() => {
        chan.consume(ADD_STREAM_QUEUE, onAddStreamMessage, { noAck: false })
        chan.consume(REMOVE_STREAM_QUEUE, onRemoveStreamMessage, { noAck: false })
    })