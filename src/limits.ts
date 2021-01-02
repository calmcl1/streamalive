export interface Plan {
    max_streams: number,
    frequency: CHECK_FREQUENCY[],
    notify_types: NOTIFY_TYPES[]
}

export enum PLAN_NAMES { "FREE" = "FREE", "BASIC" = "BASIC", "PRO" = "PRO", "SUPER" = "SUPER" }
export enum NOTIFY_TYPES { EMAIL = "EMAIL", SMS = "SMS" }
export enum CHECK_FREQUENCY { EVERY_HOUR = "EVERY_HOUR", EVERY_MINUTE = "EVERY_MINUTE", CONTINUOUS = "CONTINUOUS" }

export const plans: { [key in PLAN_NAMES]: Plan } = {
    FREE: {
        max_streams: 1,
        frequency: [CHECK_FREQUENCY.EVERY_HOUR],
        notify_types: [NOTIFY_TYPES.EMAIL]
        // max_frequency: CHECK_FREQUENCY.EVERY_HOUR
    },
    BASIC: {
        max_streams: 3,
        frequency: [CHECK_FREQUENCY.EVERY_HOUR, CHECK_FREQUENCY.EVERY_MINUTE],
        notify_types: [NOTIFY_TYPES.EMAIL, NOTIFY_TYPES.SMS]
    },
    PRO: {
        max_streams: 5,
        frequency: [CHECK_FREQUENCY.EVERY_HOUR, CHECK_FREQUENCY.EVERY_MINUTE],
        notify_types: [NOTIFY_TYPES.EMAIL, NOTIFY_TYPES.SMS]
    },
    SUPER: {
        max_streams: Infinity,
        frequency: [CHECK_FREQUENCY.EVERY_HOUR, CHECK_FREQUENCY.EVERY_MINUTE, CHECK_FREQUENCY.CONTINUOUS],
        notify_types: [NOTIFY_TYPES.EMAIL, NOTIFY_TYPES.SMS]
    },
}

