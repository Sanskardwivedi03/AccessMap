const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const AccessibilityProfile = require("../models/AccessibilityProfile");


/* =====================================================
   CREATE JWT TOKEN
   ===================================================== */

function createToken(userId) {

    return jwt.sign(

        {
            userId
        },

        process.env.JWT_SECRET,

        {
            expiresIn: "7d"
        }

    );

}


/* =====================================================
   REGISTER
   ===================================================== */

async function register(req, res) {

    try {

        const {
            name,
            email,
            password
        } = req.body;


        /* -----------------------------------------
           VALIDATION
           ----------------------------------------- */

        if (
            !name ||
            !email ||
            !password
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Name, email and password are required"

            });

        }


        if (
            password.length < 6
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Password must contain at least 6 characters"

            });

        }


        const cleanEmail =
            email
                .trim()
                .toLowerCase();


        /* -----------------------------------------
           CHECK EXISTING USER
           ----------------------------------------- */

        const existing =
            await User.findOne({

                email: cleanEmail

            });


        if (existing) {

            return res.status(409).json({

                success: false,

                message:
                    "An account with this email already exists"

            });

        }


        /* -----------------------------------------
           CREATE PASSWORD SALT + HASH
           ----------------------------------------- */

        const passwordSalt =
            await bcrypt.genSalt(12);


        const passwordHash =
            await bcrypt.hash(
                password,
                passwordSalt
            );


        /* -----------------------------------------
           CREATE USER
           ----------------------------------------- */

        const user =
            await User.create({

                name:
                    name.trim(),

                email:
                    cleanEmail,

                passwordHash,

                passwordSalt,

                authToken:
                    null,

                /*
                 * Empty when account is first created.
                 * These will be updated from the
                 * Accessibility Profile page.
                 */

                disability: [],

                priority: []

            });


        /* -----------------------------------------
           CREATE ACCESSIBILITY PROFILE
           ----------------------------------------- */

        try {

            await AccessibilityProfile.create({

                userId:
                    user._id,

                sensory_needs: {

                    visual:
                        false,

                    hearing:
                        false

                },

                mobility_needs: {

                    mobility_support:
                        false,

                    wheelchair:
                        false

                },

                preferences: {

                    ramps:
                        false,

                    tactile_paths:
                        false,

                    route_barriers:
                        false,

                    voice_information:
                        false,

                    speech_communication:
                        false

                }

            });

        } catch (profileError) {

            /*
             * If your AccessibilityProfile schema
             * uses a different field name, the user
             * account should still remain created.
             */

            console.warn(
                "Accessibility profile creation warning:",
                profileError.message
            );

        }


        /* -----------------------------------------
           CREATE LOGIN TOKEN
           ----------------------------------------- */

        const token =
            createToken(
                user._id.toString()
            );


        /* -----------------------------------------
           SAVE TOKEN
           ----------------------------------------- */

        user.authToken =
            token;

        await user.save();


        /* -----------------------------------------
           RESPONSE
           ----------------------------------------- */

        return res.status(201).json({

            success: true,

            message:
                "Account created successfully",

            token,

            user: {

                id:
                    user._id,

                user_id:
                    user._id,

                name:
                    user.name,

                email:
                    user.email,

                disability:
                    user.disability,

                priority:
                    user.priority

            }

        });

    }

    catch (error) {

        console.error(
            "Registration error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Registration failed",

            error:
                error.message

        });

    }

}


/* =====================================================
   LOGIN
   ===================================================== */

async function login(req, res) {

    try {

        const {
            email,
            password
        } = req.body;


        if (
            !email ||
            !password
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Email and password are required"

            });

        }


        const cleanEmail =
            email
                .trim()
                .toLowerCase();


        /* -----------------------------------------
           FIND USER
           ----------------------------------------- */

        const user =
            await User.findOne({

                email:
                    cleanEmail

            });


        if (!user) {

            return res.status(401).json({

                success: false,

                message:
                    "Invalid email or password"

            });

        }


        /* -----------------------------------------
           CHECK PASSWORD
           ----------------------------------------- */

        const valid =
            await bcrypt.compare(

                password,

                user.passwordHash

            );


        if (!valid) {

            return res.status(401).json({

                success: false,

                message:
                    "Invalid email or password"

            });

        }


        /* -----------------------------------------
           CREATE NEW TOKEN
           ----------------------------------------- */

        const token =
            createToken(
                user._id.toString()
            );


        user.authToken =
            token;

        await user.save();


        /* -----------------------------------------
           RESPONSE
           ----------------------------------------- */

        return res.json({

            success: true,

            message:
                "Login successful",

            token,

            user: {

                id:
                    user._id,

                user_id:
                    user._id,

                name:
                    user.name,

                email:
                    user.email,

                disability:
                    user.disability || [],

                priority:
                    user.priority || []

            }

        });

    }

    catch (error) {

        console.error(
            "Login error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Login failed",

            error:
                error.message

        });

    }

}


/* =====================================================
   CURRENT USER
   ===================================================== */

async function me(req, res) {

    return res.json({

        success: true,

        user: req.user

    });

}


/* =====================================================
   EXPORT
   ===================================================== */

module.exports = {

    register,

    login,

    me

};