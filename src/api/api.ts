import body_parser from 'body-parser';
import cors from 'cors';
import express from "express";
import { checkJwt } from './helpers/jwt';
// import { Server } from 'http';
import indexRouter from './routes/index';
import streamsRouter from './routes/streams';
import usersRouter from './routes/users';
import { initQueues } from './queues'
const app = express();

console.debug("Using cors")
app.use(cors())
app.use(body_parser.json())
app.use(body_parser.urlencoded({ extended: true }))
// app.use(express.static(path.join(__dirname, '..', 'public')))

// app.set('views', './public/html')
// app.set('view engine', 'pug')

app.use('/api/v1', checkJwt)
app.use('/api/v1', indexRouter)
app.use('/api/v1', usersRouter)
app.use('/api/v1', streamsRouter)


const port = process.env.PORT || 3000

initQueues()
    .then((chan) => {
        const svr = app.listen(port)
        svr.on('listening', () => {
            console.log(`Listening on ${port}`)
        })
        app.locals.mq_channel = chan
    })