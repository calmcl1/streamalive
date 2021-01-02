import { Router } from 'express'
import { models } from '../../db'
import { InvalidParameterValueError, PlanLimitError, ResourceDoesNotExist, UnauthorizedError } from '../errors'
import { UUID } from '../helpers/formats'
import { serializer } from '../helpers/serialize'

const r = Router()
import auth0 from 'auth0'
import { plans, Plan, PLAN_NAMES, CHECK_FREQUENCY, NOTIFY_TYPES } from '../../limits'
import { AddStreamMessage } from '../../message_types'
let auth0Mgmt: auth0.ManagementClient = new auth0.ManagementClient({
    domain: process.env.AUTH0_DOMAIN!,
    clientId: process.env.AUTH0_CLIENT_ID!,
    clientSecret: process.env.AUTH0_CLIENT_SECRET!,
    scope: "read:users"
})

r.get('/streams',
    async (req, res, next) => {
        const streams = await models.Stream.findAll({
            where: {
                'user_id': req.body._user.sub
            }
        })

        const serialized_streams = serializer.serialize('stream', streams)
        res.status(200).json(serialized_streams)
    })

r.post('/streams',
    async (req, res, next) => {
        try {
            const user = await new Promise<auth0.User>((resolve, reject) => {
                auth0Mgmt.getUser({ id: req.body._user.sub }, (err, user) => { if (err) { reject(err) } else { resolve(user) } })
            })

            const user_plan = plans[(user.app_metadata!.plan as PLAN_NAMES)]

            // Check that the user isn't trying to add more streams than they're allowed
            if (user.app_metadata?.plan != PLAN_NAMES.SUPER) {
                if (await models.Stream.count({ where: { user_id: req.body._user.sub } }) >= user_plan.max_streams) {
                    throw new PlanLimitError(`A user on the ${user.app_metadata!.plan} plan may only monitor ${user_plan.max_streams} streams`)
                }
            }

            if (!req.body.url) { throw new InvalidParameterValueError(`A value must be supplied for the parameter 'url'.`) }
            if (!req.body.check_frequency) { throw new InvalidParameterValueError(`A value must be supplied for the parameter 'check_frequency'.`) }
            if (!user_plan.frequency.includes(req.body.check_frequency)) { throw new InvalidParameterValueError(`The value for the parameter 'check_frequency' must be one of: ${user_plan.frequency}`) }
            if (!req.body.notify_type) { throw new InvalidParameterValueError(`A value must be supplied for the parameter 'notify_type'.`) }
            if (!user_plan.notify_types.includes(req.body.notify_type)) { throw new InvalidParameterValueError(`The value for the parameter 'notify_type' must be one of: ${user_plan.notify_types}`) }

            const stream = await models.Stream.create({
                user_id: req.body._user.sub,
                url: req.body.url,
                check_frequency: req.body.check_frequency,
                notify_type: req.body.notify_type // TODO: Change this when SMS is implemented
            })

            const serialized_stream = serializer.serialize('stream', stream)
            res.status(201).json(serialized_stream)

            const msg: AddStreamMessage = { stream_id: stream.id }
            req.app.locals.mq_channel.sendToQueue(process.env.MQ_CHECK_STREAM_QUEUE_NAME!, Buffer.from(JSON.stringify(msg)))

        } catch (e) {
            const serialized_err = serializer.serializeError(e)
            if (e instanceof PlanLimitError) { res.status(402).json(serialized_err) }
            else if (e instanceof InvalidParameterValueError) { res.status(400).json(serialized_err) }
            else { res.status(500).json(serialized_err) }
        }
    })

r.get(`/streams/:stream_id(${UUID.source})/`,
    async (req, res, next) => {
        try {
            const stream = await models.Stream.findByPk(req.params.stream_id)
            if (!stream) { throw new ResourceDoesNotExist(`Stream with ID ${req.params.stream_id} does not exist.`) }
            if (stream.user_id != req.body._user.sub) { throw new UnauthorizedError(`The user is not authorized to view this stream.`) }

            const serialized_streams = serializer.serialize('stream', stream)
            res.status(200).json(serialized_streams)
        } catch (e) {
            const serialized_err = serializer.serializeError(e)
            if (e instanceof ResourceDoesNotExist) { res.status(404).json(serialized_err) }
            else if (e instanceof UnauthorizedError) { res.status(403).json(serialized_err) }
            else (res.status(500).json(serializer.serializeError(e)))
        }
    })


r.delete(`/streams/:stream_id(${UUID.source})/`,
    async (req, res, next) => {
        try {
            const stream = await models.Stream.findByPk(req.params.stream_id)
            if (!stream) { throw new ResourceDoesNotExist(`Stream with ID ${req.params.stream_id} does not exist.`) }
            if (stream.user_id != req.body._user.sub) { throw new UnauthorizedError(`The user is not authorized to view this stream.`) }

            await stream.destroy()
            res.status(204).json({})
        } catch (e) {
            const serialized_err = serializer.serializeError(e)
            if (e instanceof ResourceDoesNotExist) { res.status(404).json(serialized_err) }
            else if (e instanceof UnauthorizedError) { res.status(403).json(serialized_err) }
            else (res.status(500).json(serializer.serializeError(e)))
        }
    })

export default r