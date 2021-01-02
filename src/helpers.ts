import fs from 'fs'
import { join } from 'path'
export function shouldForceDBSync(): boolean {
    if (process.env.IS_HEROKU && process.env.NODE_ENV != "production") {
        return true
    } else {
        return process.env.NODE_ENV == "test"
    }
}

export function shouldUseDotEnv(): boolean {
    return fs.existsSync(join(__dirname, "..", ".env"))
}

export const shouldUseSendgridSandbox = () => process.env.IS_HEROKU && process.env.NODE_ENV == "production" ? false : true
