import Sequelize from "sequelize"
import { Stream } from "./stream_entry"

export const models = { Stream }
export const db_url = process.env.JAWSDB_URL || process.env.DATABASE_URL || "mysql://root@localhost/streamalive_dev"
export const seq = new Sequelize.Sequelize(db_url, {
    dialect: 'mysql',
    logging: false,
    logQueryParameters: false
})

export async function initDB() {
    const force_sync = process.env.NODE_ENV == "test"
    console.info(`Forcing DB sync? ${force_sync}`)
    Stream.initModel(seq)
    await seq.sync({ force: force_sync, alter: force_sync })
}