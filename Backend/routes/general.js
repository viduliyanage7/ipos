const express = require('express')
const router = express.Router();
const db = require('../db')

router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username | !password) {
            return res.status(400).json({
                success: false,
                message: 'Username and password are required'
            })
        }

        const [rows] = await db.execute(
            'SELECT id from users where username = ? AND password = ?',
            [username, password]
        )

        if (rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Username and password are required'
            })
        }

        res.json({
            success: true,
            user: rows[0]
        })
    } catch (error) {
        res.status(500).json({
            success:false,
            message: 'Server error'
        })
    }

})

module.exports = router
