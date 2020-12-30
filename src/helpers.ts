import fs from 'fs'
import { join } from 'path'
export function shouldForceDBSync(): boolean {
    let force_sync = false
    if (process.env.IS_HEROKU && process.env.NODE_ENV != "production") {
        force_sync = true
    } else {
        force_sync = process.env.NODE_ENV == "test"
    }
    return force_sync
}

export function shouldUseDotEnv(): boolean {
    return fs.existsSync(join(__dirname, "..", ".env"))
}

export const shouldUseSendgridSandbox = () => process.env.IS_HEROKU && process.env.NODE_ENV == "production" ? false : true
