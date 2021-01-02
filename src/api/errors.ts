export class AuthorizationFailedError extends Error { constructor(m: string) { super(m); Object.setPrototypeOf(this, AuthorizationFailedError.prototype) } }
export class ResourceDoesNotExist extends Error { constructor(m: string) { super(m); Object.setPrototypeOf(this, ResourceDoesNotExist.prototype) } }
export class UnauthorizedError extends Error { constructor(m: string) { super(m); Object.setPrototypeOf(this, UnauthorizedError.prototype) } }
export class PlanLimitError extends Error { constructor(m: string) { super(m); Object.setPrototypeOf(this, PlanLimitError.prototype) } }
export class InvalidParameterValueError extends Error { constructor(m: string) { super(m); Object.setPrototypeOf(this, InvalidParameterValueError.prototype) } }