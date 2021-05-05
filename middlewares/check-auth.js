const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {

    try {
        const token = req.headers.authorization.split('Bearer ')[1];
        const decoded = jwt.verify(token, process.env.JWT_KEY);
        req.userData = decoded;
        next();
    } catch (error) {
        res.status(401).json({ // 401 Auth Failed
            status: 401,
            message: "Auth Failed!"
        });
    }
};