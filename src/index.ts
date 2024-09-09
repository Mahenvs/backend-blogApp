import express, { NextFunction, Request, response, Response } from "express";
import { client } from "./db";
import 'dotenv/config' // populate process.env for imported files
import bcrypt from "bcrypt";
import cors from "cors";
import bodyParser from "body-parser";
import jwt, { JwtPayload } from "jsonwebtoken";
// import { secret } from "./constants";
import cookieParser from "cookie-parser";
import { errorHandler } from "./errorHandler";

const app = express()

app.use(express.json())
app.use(bodyParser.json());
app.use(cookieParser());
app.use(cors({
    origin: 'http://localhost:5173', // Adjust this to your frontend URL
    credentials: true
}));

const port = process.env.port || 3000;
const secret = process.env.JWT_SECRET

app.get('/', (req, res) => {
    res.send('Hello, TypeScript with Express!');
});

const isUserExists = async (req: Request, res: Response, next: NextFunction) => {
    const { email } = req.body.email;
    console.log(email);

    const query = `SELECT * from users where email=$1`;
    const result = await client.query(query, [email])
    try {
        if (result.rows.length > 0) {
            req.body = result.rows[0];
            next(); // User exists, proceed to next middleware or route handler
        } else {
            res.status(404).json({ message: 'User not found' }); // User not found
        }
    } catch (error) {
        next("user does not exist"); // Pass any errors to error-handling middleware
    }
}
app.get('/posts', async (req, res) => {

    const query = `SELECT 
        posts.*, 
        users.username, 
        CASE 
            WHEN bookmarks.user_id IS NOT NULL THEN TRUE
            ELSE FALSE
        END AS isBookmarked,
        CASE 
            WHEN likes.user_id IS NOT NULL THEN TRUE
            ELSE FALSE
        END AS isLiked
    FROM posts
    LEFT JOIN users ON posts.user_id = users.id
    LEFT JOIN bookmarks ON posts.id = bookmarks.post_id AND bookmarks.user_id = $1 and bookmarks.flag=true
    LEFT JOIN likes ON posts.id = likes.post_id AND likes.user_id = $1 and likes.flag=true
    ;`;

    const response = await client.query(query, [2])
    const rows = response.rows;

    res.json({
        msg: "posts fetched",
        data: rows
    })
})

app.post('/sign-up', async (req, res) => {
    try {
        const { username, email, password,fullname } = req.body;
        const saltRounds = 10
        const checkUserExists = `Select *from users where email = $1 and username = $2`
        
        const resultCheck = await client.query(checkUserExists, [email,username]);
        console.log(resultCheck.rows);
        
        if (resultCheck.rows?.length != 0) {
            return res.status(409).json({ msg: "Username or email already exists" });
        }
        
        const insertToUsers = `INSERT INTO users (username,email,password,fullname) values
            ($1,$2,$3,$4) RETURNING id`
         
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const values = [username, email, hashedPassword,fullname]
        const result = await client.query(insertToUsers, values)
        res.status(201).send(result.rows)
    }
    catch (err: any) {
        errorHandler(res, err, 400)
    }
})

app.post('/sign-in', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ msg: "Email and password are required" });
        }

        const fetchUser = "SELECT * FROM users WHERE email = $1";
        const result = await client.query(fetchUser, [email]);
        const userId = result.rows[0].id

        if (result.rows.length === 0) {
            return res.status(401).json({ msg: "Authentication failed" });
        }
        const user = result.rows[0];
        const hashedPassword = user.password;
        const isMatch = await bcrypt.compare(password, hashedPassword);

        if (isMatch) {
            if (!secret) {
                throw new Error("JWT secret must be defined");
            }

            const token = jwt.sign(
                { email: email },
                secret,
                { expiresIn: '1h' } // Set an expiration time for the token
            );
            res.cookie("token", token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production', // Use only in production
                sameSite: 'lax',
                path: '/', // Ensure path matches when removing the cookie
            });
            console.log(res.cookie);
            res.status(200).json({
                token: token,
                userId: userId,
                username:email,
                fullname:user.fullname,
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
        // res.status(500).json({ msg: "Internal Server Error" });
        errorHandler(res, error, 500)
    }
});
const authenticate = (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies.token;
    if (!token) {
        return res.status(401).json({ authenticated: false });
    }
    try {
        if (secret) {
            const decoded = jwt.verify(token, secret) as JwtPayload;
            req.body.user = decoded; // Add user to request object
            next();
        }else{
            next();
        }

    } catch (error) {
        res.status(401).json({ authenticated: false });
    }
};
app.get("/check-auth", authenticate, (req: Request, res: Response) => {
    console.log("I am in check atu");
    res.set('Cache-Control', 'no-store'); // Prevent caching

    res.status(200).json({ msg: "Access granted to protected resource", user: req.body.user });

});


app.post("/sign-out", (req: Request, res: Response) => {
    console.log("Inside logout ");
    
    res.cookie('token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // Ensure it's not used in development
        sameSite: 'lax',
        expires: new Date(0),
        path: '/',
      });
      console.log(res.cookie);
      
    res.json({ message: "Logged out!" });
});

app.post("/new-post", async (req, res) => {
    try {
        // console.log("iam in post", req.body.title,req.body.);

        const { title, description, userId } = req.body
        console.log(title, description, userId);
        // const user_id = 18
        if (userId == "NULL") {
            console.log("userId not exists ", userId);

        }
        else {
            console.log("Not extsts ", userId);

        }
        const query = `INSERT INTO posts(title,description,user_id) 
                                    values ($1,$2,$3)`

        const values = [title, description, userId]
        const response = await client.query(query, values)
        console.log(response.rows);
        if (!response) {
            console.error(response);
        }
        res.json({
            msg: "Data saved successfully"
        })

    } catch (error) {
        errorHandler(res, error, 400)
    }
})

// app.get('/check-auth', async (req, res) => {
//     try {
//         const token = req.cookies.token;

//         if (!token) return res.status(401).json({ msg: "No token provided, authorization denied" });
//         if (!secret) {
//             throw new Error("JWT secret must be defined");
//         }
//         jwt.verify(token, secret, (err: any, user: any) => {
//             if (err) return res.status(403).json({ msg: "Token is not valid" });
//             console.log(user);
//         });

//     } catch (error) {
//         console.error(error);
//         errorHandler(res, error, 400)
//     }
// })

// Create Users Table
app.post('/create', async (req, res) => {
    try {
        const createQuery = `CREATE TABLE users( 
        id SERIAL PRIMARY KEY  unique,
            username varchar(255) unique,
            email  varchar(255) unique,
            password varchar(255),
            createdat Date            
            )`;
        const resp = await client.query(createQuery)

        res.send({
            msg: "table created successfully"
        })
    }
    catch (error) {
        errorHandler(res, error, 500)

    }

})

// Create Posts table
app.post("/table-create-posts", async (req, res) => {
    try {
        const query = `CREATE TABLE posts(
            id SERIAL PRIMARY KEY ,
            title VARCHAR(255) NOT NULL,
            description VARCHAR(255) NOT NULL,
            user_id INT NOT NULL,
            CONSTRAINT fk_user FOREIGN KEY(user_id) references users(id),
            createdAt TIMESTAMP DEFAULT NOW()
        )`
        const rows = await client.query(query);

        res.send({
            msg: "posts table created successfully"
        })
    } catch (error) {
        console.error(error);
        errorHandler(res, error, 500)
    }
})

// Create Bookmarks table
app.post("/create-bookmarks", async (req, res) => {
    const query = `CREATE TABLE BOOKMARKS (
    id SERIAL PRIMARY KEY UNIQUE,
    user_id INT not null,
    post_id INT not null,
    CONSTRAINT  fk_user FOREIGN KEY(user_id) references users(id),
    CONSTRAINT fk_post FOREIGN KEY(post_id) references posts(id),
    createdAt  TIMESTAMP DEFAULT NOW())`

    const response = await client.query(query);
    if (!response) {
        res.json({
            msg: "Failure in creation of bookmarks table"
        })
    }
    else {
        res.send({
            msg: "bookmarks table created successfully"
        })
    }
})

// Create Likes table
app.post("/table-create-likes", async (req, res) => {
    const query = `CREATE TABLE LIKES (
    id SERIAL PRIMARY KEY UNIQUE,
    user_id INT not null,
    post_id INT not null,
    CONSTRAINT  fk_user FOREIGN KEY(user_id) references users(id),
    CONSTRAINT fk_post FOREIGN KEY(post_id) references posts(id),
    CONSTRAINT unique_user_post UNIQUE (user_id, post_id),
    createdAt  TIMESTAMP DEFAULT NOW())`

    const response = await client.query(query);
    if (!response) {
        res.json({
            msg: "Failure in creation of bookmarks table"
        })
    }
    else {
        res.send({
            msg: "bookmarks table created successfully"
        })
    }
})
app.post("/add-col-bookmarks", async (req, res) => {
    // const query = `ALTER TABLE BOOKMARKS 
    // ADD COLUMN FLAG BOOLEAN DEFAULT TRUE`

    // CHANGE FIRST HERE 
    const query = `ALTER TABLE bookmarks
ADD CONSTRAINT unique_user_post UNIQUE (user_id, post_id);
 `
    const response = await client.query(query);
    if (!response) {
        res.json({
            msg: "Failure in creation of bookmarks table"
        })
    }
    else {
        res.send({
            msg: "bookmarks table created successfully"
        })
    }
})

app.post("/add-bookmark", async (req, res) => {
    try {
        const { userId, postId } = req.body;

        const query = `INSERT INTO bookmarks (user_id, post_id, flag)
VALUES ($1, $2, TRUE)
ON CONFLICT (user_id, post_id)
DO UPDATE SET flag = TRUE
RETURNING *;`
        const values = [userId, postId]
        const response = await client.query(query, values);
        console.log(response.rows);

        if (response) {
            res.json({
                msg: "Inserted success",
                data: response.rows
            })
        }
    } catch (error) {
        errorHandler(res, error, 500)
    }
})

app.post("/remove-bookmark", async (req, res) => {
    try {
        const { userId, postId } = req.body;

        const query = `UPDATE BOOKMARKS 
         set flag=FALSE where user_id=$1 and post_id =$2;
                            `
        const values = [userId, postId]
        const response = await client.query(query, values);
        console.log(response.rows);

        if (response) {
            res.json({
                msg: "Inserted success",
                data: response.rows
            })
        }
    } catch (error) {
        errorHandler(res, error, 500)
    }
})

app.post("/add-likes", async (req, res) => {
    try {
        const { userId, postId } = req.body;

        const query = `INSERT INTO likes (user_id, post_id, flag)
                        VALUES ($1, $2, TRUE)
                        ON CONFLICT (user_id, post_id)
                        DO UPDATE SET flag = TRUE
                        RETURNING *;`
        const values = [userId, postId]
        const response = await client.query(query, values);
        console.log(response.rows);

        if (response) {
            res.json({
                msg: "Inserted success",
                data: response.rows
            })
        }
    } catch (error) {
        errorHandler(res, error, 500)
    }
})

app.post("/remove-likes", async (req, res) => {
    try {
        const { userId, postId } = req.body;

        const query = `UPDATE LIKES 
         set flag=FALSE where user_id=$1 and post_id =$2;
                            `
        const values = [userId, postId]
        const response = await client.query(query, values);
        console.log(response.rows);

        if (response) {
            res.json({
                msg: "Inserted success",
                data: response.rows
            })
        }
    } catch (error) {
        errorHandler(res, error, 500)
    }
})
app.post("/drop", async (req, res) => {
    const tableName = req.body.table
    const query = `DROP TABLE IF EXISTS ${tableName};`

    const response = await client.query(query)
    console.log(response);
    if (!response) {
        console.error(response);
    }
    res.json({
        msg: "Deleted successfully"
    })

})


// Updated Users table with the createdAt timestamp
app.post('/users/edit', async (req, res) => {
    try {
        console.log("inside");

        const edit = `ALTER TABLE users
ALTER COLUMN "createdat" TYPE TIMESTAMP,
ALTER COLUMN "createdat" SET DEFAULT NOW();`;
        const resp = await client.query(edit)
        console.log(resp);

        res.send({
            msg: "table updated successfully"
        })
    }
    catch (error) {
        console.log(error);

        errorHandler(res, error, 500)
    }

})


// Edit posts column 
app.post('/edit-column-datatype', async (req, res) => {
    try {
        //     const query = `ALTER table posts
        // ALTER COLUMN title TYPE VARCHAR(250);`
        // const query = `ALTER TABLE posts
        // ADD COLUMN isBookmarked boolean,
        // ADD COLUMN isLiked boolean;`

        const query = `ALTER TABLE posts
        ALTER COLUMN isBookmarked set default FALSE,
        ALTER COLUMN isLiked  set default FALSE;`

        //     const query = `ALTER TABLE posts
        // ALTER COLUMN user_id SET NOT NULL;`

        const result = await client.query(query);
        console.log(result);

        res.json({
            msg: "Table modified "
        })
        // if (result.rows.length != 0){
        //     res.json({
        //         msg: "Table modified "
        //     })
        // }
    } catch (error) {
        console.log(error);
        errorHandler(res, error, 500)
    }
})
app.listen(port, () => {
    console.log("Server is running at " + port);

})

