import Sequelize from "sequelize"
import { shouldForceDBSync } from "../helpers"
import { Stream } from "./stream_entry"

export const models = { Stream }
export const db_url = process.env.JAWSDB_URL || process.env.DATABASE_URL || "mysql://root@localhost/streamalive_dev"
export const seq = new Sequelize.Sequelize(db_url, {
    dialect: 'mysql',
    logging: false,
    logQueryParameters: false
})

export async function initDB() {
    let force_sync = shouldForceDBSync() && __filename == "scheduler.js" // Only the main scheduler can force the db sync
    console.info(`Forcing DB sync? ${force_sync}`)
    Stream.initModel(seq)
    await seq.sync({ force: force_sync, alter: force_sync })
}