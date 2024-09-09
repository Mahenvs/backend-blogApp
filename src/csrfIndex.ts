// const csrfProtection = csurf({ cookie: true });
// app.use(csrfProtection);

// Route to serve CSRF token
// app.get('/csrf-token', csrfProtection, (req, res) => {
//     console.log("Innsd");

//     res.cookie('csrfToken',
//         req.csrfToken(), { secure: process.env.NODE_ENV === 'production', httpOnly: false }); // Setting the token as a cookie
//     res.json({ csrfToken: req.csrfToken() });
// });
// app.post('/signInCsrf', csrfProtection, async (req, res) => {
//     try {
//         console.log(req.body);

//         const { email, password } = req.body;
//         if (!email || !password) {
//             return res.status(400).json({ msg: "Email and password are required" });
//         }

//         const fetchUser = "SELECT * FROM users WHERE email = $1";

//         const result = await client.query(fetchUser, [email]);

//         if (result.rows.length === 0) {
//             return res.status(401).json({ msg: "Authentication failed" });
//         }
//         const user = result.rows[0];
//         const hashedPassword = user.password;
//         const isMatch = await bcrypt.compare(password, hashedPassword);

//         if (isMatch) {
//             if (!secret) {
//                 throw new Error("JWT secret must be defined");
//             }

//             const token = jwt.sign(
//                 { email: email },
//                 secret,
//                 { expiresIn: '1h' } // Set an expiration time for the token
//             );

//             // Set token as HTTP-only cookie
//             // res.cookie("token", token, {
//             //     httpOnly: true, // Helps prevent XSS attacks
//             //     secure: process.env.NODE_ENV === 'production', // Ensures cookies are only sent over HTTPS in production
//             //     // sameSite: 'Strict' // Prevents the cookie from being sent with cross-site requests
//             // });
//             res.cookie("token", token, {
//                 httpOnly: true,
//                 secure: process.env.NODE_ENV === 'production',
//                 // sameSite: 'strict'
//             });

//             res.status(200).json({
//                 token: token,
//                 msg: "Authentication Successful"
//             });
//         } else {
//             // Expire the cookie in case of failed authentication
//             res.cookie("token", "", { expires: new Date(0) });
//             res.status(401).json({ msg: "Authentication failed" });
//         }

//     } catch (error) {
//         console.error('Error during sign-in:', error);
//         // Expire the cookie in case of server error
//         res.cookie("token", "", { expires: new Date(0) });
//         res.status(500).json({ msg: "Internal Server Error" });
//     }
// });
