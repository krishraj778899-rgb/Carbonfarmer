require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");
const path = require("path");

const app = express();

const PORT = process.env.PORT || 10000;

const JWT_SECRET =
    process.env.JWT_SECRET || "carbonready_demo_secret";

/* ==============================
   DATABASE
============================== */

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,

    ssl: process.env.DATABASE_URL
        ? {
              rejectUnauthorized: false
          }
        : false
});


/* ==============================
   MIDDLEWARE
============================== */

app.use(cors());

app.use(express.json());

app.use(express.urlencoded({
    extended: true
}));

app.use(express.static(
    path.join(__dirname, "public")
));


/* ==============================
   HOME
============================== */

app.get("/", (req, res) => {

    res.sendFile(
        path.join(
            __dirname,
            "public",
            "index.html"
        )
    );

});


/* ==============================
   HEALTH CHECK
============================== */

app.get("/api/health", async (req, res) => {

    try {

        const result =
            await pool.query("SELECT NOW()");

        res.json({
            success: true,
            message: "CarbonReady backend is running",
            database: "Connected",
            time: result.rows[0].now
        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            success: false,
            message: "Database connection failed"
        });

    }

});


/* ==============================
   REGISTER
============================== */

app.post("/api/register", async (req, res) => {

    try {

        const {
            name,
            email,
            password
        } = req.body;


        if (!name || !email || !password) {

            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });

        }


        if (password.length < 6) {

            return res.status(400).json({
                success: false,
                message:
                    "Password must be at least 6 characters"
            });

        }


        const existingUser =
            await pool.query(
                "SELECT id FROM users WHERE email = $1",
                [email.toLowerCase()]
            );


        if (existingUser.rows.length > 0) {

            return res.status(409).json({
                success: false,
                message: "Email already registered"
            });

        }


        const hashedPassword =
            await bcrypt.hash(password, 10);


        const result =
            await pool.query(
                `
                INSERT INTO users
                (name, email, password)
                VALUES ($1, $2, $3)
                RETURNING id, name, email
                `,
                [
                    name,
                    email.toLowerCase(),
                    hashedPassword
                ]
            );


        const user =
            result.rows[0];


        const token =
            jwt.sign(
                {
                    id: user.id,
                    email: user.email
                },
                JWT_SECRET,
                {
                    expiresIn: "7d"
                }
            );


        res.status(201).json({

            success: true,

            message:
                "Account created successfully",

            token,

            user

        });


    } catch (error) {

        console.error(
            "Register Error:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Registration failed"

        });

    }

});


/* ==============================
   LOGIN
============================== */

app.post("/api/login", async (req, res) => {

    try {

        const {
            email,
            password
        } = req.body;


        if (!email || !password) {

            return res.status(400).json({

                success: false,

                message:
                    "Email and password are required"

            });

        }


        const result =
            await pool.query(
                `
                SELECT *
                FROM users
                WHERE email = $1
                `,
                [email.toLowerCase()]
            );


        if (result.rows.length === 0) {

            return res.status(401).json({

                success: false,

                message:
                    "Invalid email or password"

            });

        }


        const user =
            result.rows[0];


        const passwordMatch =
            await bcrypt.compare(
                password,
                user.password
            );


        if (!passwordMatch) {

            return res.status(401).json({

                success: false,

                message:
                    "Invalid email or password"

            });

        }


        const token =
            jwt.sign(
                {
                    id: user.id,
                    email: user.email
                },
                JWT_SECRET,
                {
                    expiresIn: "7d"
                }
            );


        res.json({

            success: true,

            message:
                "Login successful",

            token,

            user: {

                id: user.id,

                name: user.name,

                email: user.email

            }

        });


    } catch (error) {

        console.error(
            "Login Error:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Login failed"

        });

    }

});


/* ==============================
   AUTH MIDDLEWARE
============================== */

function authenticateToken(req, res, next) {

    const authHeader =
        req.headers.authorization;


    const token =
        authHeader &&
        authHeader.split(" ")[1];


    if (!token) {

        return res.status(401).json({

            success: false,

            message:
                "Authentication token required"

        });

    }


    try {

        const decoded =
            jwt.verify(
                token,
                JWT_SECRET
            );


        req.user =
            decoded;


        next();


    } catch (error) {

        return res.status(403).json({

            success: false,

            message:
                "Invalid or expired token"

        });

    }

}


/* ==============================
   PROFILE
============================== */

app.get(
    "/api/profile",
    authenticateToken,
    async (req, res) => {

        try {

            const result =
                await pool.query(
                    `
                    SELECT
                        id,
                        name,
                        email,
                        created_at
                    FROM users
                    WHERE id = $1
                    `,
                    [req.user.id]
                );


            if (result.rows.length === 0) {

                return res.status(404).json({

                    success: false,

                    message:
                        "User not found"

                });

            }


            res.json({

                success: true,

                user:
                    result.rows[0]

            });


        } catch (error) {

            console.error(error);

            res.status(500).json({

                success: false,

                message:
                    "Could not load profile"

            });

        }

    }
);


/* ==============================
   FARM DATA
============================== */

app.post(
    "/api/farm",
    authenticateToken,
    async (req, res) => {

        try {

            const farm =
                req.body;


            const result =
                await pool.query(
                    `
                    INSERT INTO farms
                    (
                        user_id,
                        farm_data
                    )
                    VALUES ($1, $2)
                    RETURNING *
                    `,
                    [
                        req.user.id,
                        farm
                    ]
                );


            res.status(201).json({

                success: true,

                message:
                    "Farm information saved",

                farm:
                    result.rows[0]

            });


        } catch (error) {

            console.error(
                "Farm Error:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Could not save farm information"

            });

        }

    }
);


/* ==============================
   ASSESSMENT
============================== */

app.post(
    "/api/assessment",
    authenticateToken,
    async (req, res) => {

        try {

            const assessment =
                req.body;


            const result =
                await pool.query(
                    `
                    INSERT INTO assessments
                    (
                        user_id,
                        assessment_data
                    )
                    VALUES ($1, $2)
                    RETURNING *
                    `,
                    [
                        req.user.id,
                        assessment
                    ]
                );


            res.status(201).json({

                success: true,

                message:
                    "Assessment saved",

                assessment:
                    result.rows[0]

            });


        } catch (error) {

            console.error(
                "Assessment Error:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Could not save assessment"

            });

        }

    }
);


/* ==============================
   ASSESSMENT RESULT
============================== */

app.get(
    "/api/assessment/result",
    authenticateToken,
    async (req, res) => {

        try {

            const result =
                await pool.query(
                    `
                    SELECT *
                    FROM assessments
                    WHERE user_id = $1
                    ORDER BY created_at DESC
                    LIMIT 1
                    `,
                    [req.user.id]
                );


            if (result.rows.length === 0) {

                return res.status(404).json({

                    success: false,

                    message:
                        "No assessment found"

                });

            }


            res.json({

                success: true,

                assessment:
                    result.rows[0]

            });


        } catch (error) {

            console.error(error);

            res.status(500).json({

                success: false,

                message:
                    "Could not load assessment"

            });

        }

    }
);


/* ==============================
   SERVER
============================== */

app.listen(PORT, () => {

    console.log(
        `CarbonReady server running on port ${PORT}`
    );

});