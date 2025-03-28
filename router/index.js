const express = require('express')

let authRouter = require('./auth')

const router = express.Router()

router.use('/auth', authRouter)

module.exports = router