import express from "express";
import { client } from "./utils";

const app = express()

app.use(express.json())

const port = process.env.port || 3000;

app.get('/', (req, res) => {
    res.send('Hello, TypeScript with Express!');
});

app.get('/posts', (req, res) => {
    res.send("Hey")
})

app.post('/create', (req, res) => {
    try {
        console.log(req.body.username, req.body.email, req.body.password);
        // await client.c
        // const insertQuery = "INSERT INTO users (username,email,password) values ($1,$2,$3)";
        // const values = [req.username, req.email, req.password]
        // await client.query(insertQuery,)
        res.send({
            msg: "success"
        })
    }
    catch(e){
        console.log(e);
        
    }

})

app.listen(port, () => {
    console.log("Server is running at " + port);

})