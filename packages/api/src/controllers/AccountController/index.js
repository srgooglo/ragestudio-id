import { Controller } from "linebridge/dist/server"
import passport from "passport"
import _ from "lodash"

import { Token, Schematized, createUser } from "../../lib"
import SessionController from "../SessionController"

export default class AccountController extends Controller {
    static refName = "AccountController"

    methods = {
        createNew: async (payload) => {
            const user = await createUser(payload)

            // maybe for the future can implement a event listener for this

            return user
        },
    }

    post = {
        "/auth": async (req, res) => {
            passport.authenticate("local", { session: false }, async (error, user, options) => {
                if (error) {
                    return res.status(500).json(`Error validating user > ${error.message}`)
                }

                if (!user) {
                    return res.status(401).json("Invalid credentials")
                }

                const token = await Token.createNewAuthToken(user, options)

                return res.json({ token: token })
            })(req, res)
        },
        "/logout": {
            middlewares: ["withAuthentication"],
            fn: async (req, res, next) => {
                req.body = {
                    user_id: req.decodedToken.user_id,
                    token: req.jwtToken
                }

                return SessionController.delete(req, res, next)
            },
        },
        "/register": Schematized({
            required: ["username", "email", "password"],
            select: ["username", "email", "password", "fullName"],
        }, async (req, res) => {
            const result = await this.methods.createNew(req.selection).catch((err) => {
                return res.status(500).json(err.message)
            })

            return res.json(result)
        }),
    }
}