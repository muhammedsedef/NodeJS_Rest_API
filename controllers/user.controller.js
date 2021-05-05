const User = require('../models/User.model');

const bcrypt = require('bcrypt');
const saltRounds = 12;

const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');

//CREATE NEW USER
exports.signup = (req, res) => {
    const validationErrors = validationResult(req);
    if (!validationErrors.isEmpty()) { //If we have some validation errors 
        res.status(422).json({ // Status : 422 Unprocessable Entity
            status: 422,
            message: validationErrors.array()
        });
    }
    else {
        bcrypt.hash(req.body.password, saltRounds, (err, hash) => { // hashing password
            if (err) {
                return res.status(500).json({ // Internal Server Error, status: 500
                    status: 500,
                    message: err.message
                });
            }
            const user = new User({ //Insert user information to database
                firstName: req.body.firstName,
                lastName: req.body.lastName,
                birthday: req.body.birthday,
                balance: req.body.balance,
                email: req.body.email,
                password: hash,
            });
            user.save()
                .then((createdUser) => {
                    res.status(201).json({
                        status: 201,
                        data: createdUser,
                        message: 'User created successfully'
                    });
                }).catch((err) => {
                    res.status(500).json({ // Internal Server Error, status: 500
                        status: 500,
                        message: err.message
                    });
                });

        });
    }
};

//LOGIN 
exports.login = (req, res) => {
    User.findOne({ email: req.body.email })
        .then((user) => {
            bcrypt.compare(req.body.password, user.password) // Comparing whether the user's password matches or not
                .then((result) => {
                    if (!result) { //If result is false
                        return res.status(403).json({ // 403 - Forbidden
                            status: 403,
                            message: "Wrong Password!"
                        });
                    }
                    // Result is true => passwords are matched!
                    const token = jwt.sign({ // Assing token to the user
                        userId: user._id,
                    },
                        process.env.JWT_KEY,
                        {
                            expiresIn: "3h" //Token valid for 3 hours
                        }
                    );
                    res.status(200).json({
                        status: 200,
                        data: user,
                        message: "Success",
                        token: token
                    });
                });
        }).catch(() => {
            res.status(404).json({ // Resource requested does not exist, Status : 404
                status: 404,
                message: "Email does not exist"
            });
        });

};

//GET SPECIFIC USER 
exports.getOneUser = (req, res) => {
    const userId = req.params.userId;

    User.findById(userId)
        .then((user) => {
            res.status(200).json({
                status: 200,
                message: 'Success',
                data: user
            })
        }).catch(() => {
            res.status(404).json({ // Resource requested does not exist, Status : 404
                status: 404,
                message: 'User not found'
            })
        });
};

//GET ALL USERS
exports.getAllUsers = (req, res) => {
    const pagination = req.query.pagination ? parseInt(req.query.pagination) : 10;
    const page = req.query.page ? parseInt(req.query.page) : 1;
    const sortFor = req.query.sort ? req.query.sort : "firstName:esc";

    const sort = {};
    const str = sortFor.split(':');
    sort[str[0]] = str[1] === 'desc' ? -1 : 1;

    var hasMore = true;

    var filter = {};
    req.query.key ? filter['fullName'] = { $regex: new RegExp('^' + req.query.key, 'i') } : filter;

    User.aggregate([
        { $addFields: { "fullName": { $concat: ["$firstName", " ", "$lastName"] } } },
        { $match: filter },
    ])
        .then((resultForCount) => {
            const dataCount = resultForCount.length; // The number of response returned from database to the request
            User.aggregate([
                {
                    $addFields: { "fullName": { $concat: ["$firstName", " ", "$lastName"] } }
                },
                {
                    $match: filter
                },
                {
                    $project:
                    {
                        birthday:
                        {
                            $dateToString:
                            {
                                format: "%Y-%m-%d", date: "$birthday"
                            }
                        },
                        firstName: 1, lastName: 1, balance: 1, email: 1
                    }
                },
                {
                    $skip: (page - 1) * pagination
                },
                {
                    $limit: pagination
                },
                {
                    $sort: sort
                }
            ])
                .then((result) => {
                    if (dataCount <= pagination * page) { hasMore = false }
                    res.status(200).json({ status: 200, data: result, dataCount: dataCount, hasMore: hasMore, message: 'Success' });
                }).catch((err) => {
                    res.status(400).json({ status: 400, message: err.message })
                });
        })
        .catch((err) => {
            res.status(500).json({
                status: 500,
                message: err.message
            });
        });
};

//UPDATE USER 
exports.updateUser = (req, res) => {
    const userId = req.params.userId;
    const email = req.body.email;

    User.findById(userId)
        .then((user) => {
            if (email) {
                User.find({ email: email }) // Determining whether the email address that the user wants to update is registered in the system.
                    .then((result) => {
                        if (result.length >= 1) {
                            return res.status(409).json({
                                status: 409,
                                message: 'A user registered with this email exists in the system.'
                            })
                        }
                    })
                    .catch((err) => {
                        res.status(500).json({ status: 500, message: err.message })
                    })
            }
            // After determining that the email address is not registered in the system, we update the user information.
            user.firstName = req.body.firstName || user.firstName,
                user.lastName = req.body.lastName || user.lastName,
                user.birthday = req.body.birthday || user.birthday,
                user.balance = req.body.balance || user.balance,
                user.email = email || user.email
            user.save()
                .then((updatedUser) => {
                    res.status(200).json({
                        status: 200,
                        message: 'User updated successfully',
                        data: updatedUser
                    })
                }).catch((err) => {
                    res.status(500).json({ status: 500, message: err.message })
                });

        }).catch(() => {
            res.status(404).json({
                status: 404,
                message: 'User not found'
            })
        });

};

//RESET PASSWORD
exports.resetPassword = (req, res) => {
    const userId = req.params.userId;
    const { oldPassword, newPassword } = req.body;

    if (userId == req.userData.userId) {
        User.findById(userId)
            .then((user) => {
                bcrypt.compare(oldPassword, user.password) // Comparing whether the user's password matches or not
                    .then((result) => {
                        if (!result) { //If result is false
                            return res.status(403).json({ // 403 - Forbidden
                                status: 403,
                                message: 'Old Password is incorrect!'
                            });
                        }

                        bcrypt.hash(newPassword, saltRounds, (err, hash) => {
                            if (err) {
                                return res.status(500).json({
                                    status: 500,
                                    message: err.message
                                });
                            }
                            user.password = hash;
                            user.save()
                                .then((updatedUser) => {
                                    res.status(200).json({
                                        status: 200,
                                        message: 'Password Successfully Updated',
                                        data: updatedUser
                                    });
                                }).catch((err) => {
                                    res.status(500).json({
                                        status: 500,
                                        message: err.message
                                    });
                                });
                        })

                    });
            }).catch((err) => {
                res.status(500).json({
                    status: 500,
                    message: err.message
                })
            });
    }
    else {
        res.status(403).json({ // Access denied 
            status: 403,
            message: "You cannot access here"
        });
    }

};

//DELETE USER
exports.deleteUser = (req, res) => {
    const userId = req.params.userId;

    User.findByIdAndDelete(userId)
        .then(() => {
            res.status(200).json({ status: 200, message: 'User deleted succesfully' });
        }).catch((err) => {
            res.status(500).json({ status: 500, message: err.message })
        });
};