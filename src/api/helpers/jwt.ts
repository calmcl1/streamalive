import { NextFunction, Request, Response } from "express";
import createRemoteJWKSet from 'jose/jwks/remote';
import jwtVerify from 'jose/jwt/verify';
import { JWTExpired, JWTInvalid } from 'jose/util/errors';
import { AuthorizationFailedError } from "../errors";
import { serializer } from "./serialize";

export async function checkJwt(req: Request, res: Response, next: NextFunction): Promise<void> {
    let auth_header_token: string
    try {
        if (!req.headers['authorization']) { throw new AuthorizationFailedError('Authorization token not provided') }
        auth_header_token = req.headers['authorization'].split(" ")[1].trim()


        const jwks = createRemoteJWKSet(new URL(`https://${process.env.AUTH0_VOLUBLE_TENANT}/.well-known/jwks.json`))
        const verify_result = await jwtVerify(auth_header_token, jwks, {
            audience: process.env.AUTH0_API_ID,
            issuer: `https://${process.env.AUTH0_VOLUBLE_TENANT}/`,
            algorithms: ['RS256']
        })

        if (!req.body) {
            req.body = { _user: verify_result.payload }
        } else {
            Object.defineProperty(req.body, "_user", { configurable: true, enumerable: true, writable: true, value: verify_result.payload })
        }
        return next()
    } catch (e) {
        if (e instanceof AuthorizationFailedError) {
            const serialized_err = serializer.serializeError(e)
            res.status(401).json(serialized_err)
        }
        if (e instanceof JWTExpired) {
            const serialized_err = serializer.serializeError(new AuthorizationFailedError("Authorization token expired"))
            res.status(401).json(serialized_err)
        } else if (e instanceof JWTInvalid) {
            const serialized_err = serializer.serializeError(new AuthorizationFailedError("Authorization token invalid"))
            res.status(401).json(serialized_err)
        } else {
            const serialized_err = serializer.serializeError(e)
            res.status(401).json(serialized_err)
        }
    }
}