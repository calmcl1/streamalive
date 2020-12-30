import { Console } from "console"
import Sequelize from "sequelize"
import { shouldForceDBSync } from "../helpers"
import { Stream } from "./stream_entry"
import { StreamState } from "./stream_state"
import { User } from "./user"

export const models = { Stream, StreamState, User }

export const db_url = process.env.JAWSDB_URL || process.env.DATABASE_URL || "mysql://root@localhost/streamalive_dev"
export const seq = new Sequelize.Sequelize(db_url, {
    dialect: 'mysql',
    logging: false,
    logQueryParameters: false
})

export const SequelizeStatic = Sequelize;

export async function initDB() {
    let force_sync = shouldForceDBSync() && __filename == "scheduler.js" // Only the main scheduler can force the db sync
    console.info(`Forcing DB sync? ${force_sync}`)
    Stream.initModel(seq)
    StreamState.initModel(seq)

    Stream.hasMany(StreamState, { foreignKey: "stream_id" })
    StreamState.belongsTo(Stream, {
        foreignKey: "stream_id"
    })
    // console.log(new StreamState())
    // User.initModel(seq)

    // User.hasMany(Stream, { foreignKey: 'user_id' })
    // Stream.belongsTo(User, { foreignKey: 'user_id' })

    await seq.sync({ force: force_sync, alter: force_sync })
}