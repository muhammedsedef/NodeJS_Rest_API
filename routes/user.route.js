const express = require('express');
const router = express.Router();
const UserCtrl = require('../controllers/user.controller');

const checkAuth = require('../middlewares/check-auth');

const { userValidationRules, validate, resetPasswordValidationRules } = require('../middlewares/validator');

//CREATE USER
router.post('/signup', userValidationRules(), validate, UserCtrl.signup);
//LOGIN
router.post('/login', UserCtrl.login);
//GET SPECIFIC USER 
router.get('/:userId', checkAuth, UserCtrl.getOneUser);
//GET ALL USERS
router.get('/', checkAuth, UserCtrl.getAllUsers);
//UPDATE USER 
router.patch('/updateUser/:userId', checkAuth, UserCtrl.updateUser);
//RESET PASSWORD
router.post('/:userId/resetPassword', checkAuth, resetPasswordValidationRules(), validate, UserCtrl.resetPassword);
//DELETE USER 
router.delete('/:userId', checkAuth, UserCtrl.deleteUser);

module.exports = router;