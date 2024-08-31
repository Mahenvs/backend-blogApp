import express from "express";
import { client } from "./utils";
import 'dotenv/config' // populate process.env for imported files
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
// import { secret } from "./constants";

const app = express()

app.use(express.json())

const port = process.env.port || 3000;
const secret = process.env.JWT_SECRET

app.get('/', (req, res) => {
    res.send('Hello, TypeScript with Express!');
});

app.get('/posts', (req, res) => {
    res.send("Hey")
})
app.post('/create', async (req, res) => {
    try {
        const createQuery = `CREATE TABLE users( 
        id SERIAL PRIMARY KEY  unique,
            username varchar(255) unique,
            email  varchar(255) unique,
            password varchar(255),
            createdAt Date
            
            )`;
        const resp = await client.query(createQuery)

        res.send({
            msg: "table created successfully"
        })
    }
    catch (error) {
        res.status(500).json({
            msg: error
        })
    }

})

app.post('/sign-up', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const saltRounds = 10
        const insertToUsers = `INSERT INTO users (username,email,password) values
            ($1,$2,$3) RETURNING id`
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const values = [username, email, hashedPassword]
        const result = await client.query(insertToUsers, values)
        res.status(201).send(result.rows)
    }
    catch (err: any) {
        const errorMessage = err.message || 'Internal Server Error';
        const errorCode = err.code || 'UNKNOWN_ERROR';
        const errorDetail = err.detail || 'No additional error details available';

        res.status(400).send({
            error: errorMessage,
            detail: errorDetail,
            code: errorCode
        });
    }
})

app.post('/sign-in', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({ msg: "Email and password are required" });
        }

        // Fetch the user from the database
        const fetchUser = "SELECT * FROM users WHERE email = $1";
        const result = await client.query(fetchUser, [email]);

        if (result.rows.length === 0) {
            return res.status(401).json({ msg: "Authentication failed" });
        }

        const user = result.rows[0];
        const hashedPassword = user.password;

        // Compare provided password with the hashed password
        const isMatch = await bcrypt.compare(password, hashedPassword);

        if (isMatch) {
            if (!secret) {
                throw new Error("JWT secret must be defined");
            }

            // Create JWT token
            const token = jwt.sign(
                { email: email }, // Avoid including the hashed password in the token
                secret,
                { expiresIn: '1h' } // Set an expiration time for the token
            );

            // Set token as HTTP-only cookie
            res.cookie("token", token, {
                httpOnly: true, // Helps prevent XSS attacks
                secure: process.env.NODE_ENV === 'production', // Ensures cookies are only sent over HTTPS in production
                // sameSite: 'Strict' // Prevents the cookie from being sent with cross-site requests
            });

            res.status(200).json({
                token: token,
                msg: "Authentication Successful"
            });
        } else {
            // Expire the cookie in case of failed authentication
            res.cookie("token", "", { expires: new Date(0) });
            res.status(401).json({ msg: "Authentication failed" });
        }

    } catch (error) {
        console.error('Error during sign-in:', error);
        // Expire the cookie in case of server error
        res.cookie("token", "", { expires: new Date(0) });
        res.status(500).json({ msg: "Internal Server Error" });
    }
});

app.listen(port, () => {
    console.log("Server is running at " + port);

})