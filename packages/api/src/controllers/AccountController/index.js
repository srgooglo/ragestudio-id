import { Controller } from "linebridge/dist/server"
import passport from "passport"
import _ from "lodash"

import { User } from "../../models"
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

    get = {
        "/selfUserData": {
            middlewares: ["withAuthentication"],
            fn: async (req, res) => {
                return res.json(req.user)
            },
        },
        "/userData": {
            middlewares: ["withAuthentication"],
            fn: Schematized({
                select: ["_id", "username"],
            }, async (req, res) => {
                let user = await User.findOne(req.selection)

                if (!user) {
                    return res.status(404).json({ error: "User not exists" })
                }

                return res.json(user)
            }),
        },
        "/users": {
            middlewares: ["withAuthentication"],
            fn: Schematized({
                select: ["_id", "username"],
            }, async (req, res) => {
                let result = []
                let selectQueryKeys = []

                if (Array.isArray(req.selection._id)) {
                    for await (let _id of req.selection._id) {
                        const user = await User.findById(_id).catch(err => {
                            return false
                        })
                        if (user) {
                            result.push(user)
                        }
                    }
                } else {
                    result = await User.find(req.selection, { username: 1, fullName: 1, _id: 1, roles: 1, avatar: 1 })
                }

                if (req.query?.select) {
                    try {
                        req.query.select = JSON.parse(req.query.select)
                    } catch (error) {
                        req.query.select = {}
                    }

                    selectQueryKeys = Object.keys(req.query.select)
                }

                if (selectQueryKeys.length > 0) {
                    result = result.filter(user => {
                        let pass = false
                        const selectFilter = req.query.select

                        selectQueryKeys.forEach(key => {
                            if (Array.isArray(selectFilter[key]) && Array.isArray(user[key])) {
                                // check if arrays includes any of the values
                                pass = selectFilter[key].some(val => user[key].includes(val))
                            } else if (typeof selectFilter[key] === "object" && typeof user[key] === "object") {
                                // check if objects includes any of the values
                                Object.keys(selectFilter[key]).forEach(objKey => {
                                    pass = user[key][objKey] === selectFilter[key][objKey]
                                })
                            }

                            // check if strings includes any of the values
                            if (typeof selectFilter[key] === "string" && typeof user[key] === "string") {
                                pass = selectFilter[key].split(",").some(val => user[key].includes(val))
                            }
                        })

                        return pass
                    })
                }

                if (!result) {
                    return res.status(404).json({ error: "Users not found" })
                }

                return res.json(result)
            })
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