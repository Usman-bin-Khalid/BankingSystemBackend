const userModels = require('../models/user.model');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const emailService = require('../services/email.service');
const tokenBlackListModel = require('../models/blackList.model');


async  function userRegisterController(req, res) {
     const {email, password , name} = req.body;
     const isExists = await userModels.findOne({
        email : email,
     });
     if (isExists) {
        return res.status(422).json({
            message : 'User already exists with this email',
            status : 'fail'
        })
     }

     const user = await userModels.create({
        email, password , name
     });
     const token = jwt.sign({
        userId : user._id,
     }, process.env.JWT_SECRET, {
        expiresIn : "3d"
     });
     res.cookie("token" , token);
     res.status(201).json({
        user : {
            _id : user._id,
            email : user.email,
            name : user.name
        },
        token : token
     });
     await emailService.sendRegistrationEmail(user.email, user.name);

}

async function userLoginController(req, res) {
   const {email, password} = req.body;
   const user = await userModels.findOne({email}).select('+password');
   if (!user) {
      return res.status(401).json({
         message : 'Email or password is incorrect',
      })
   }
  const isValidPassword = await user.comparePassword(password);
  if (!isValidPassword) {
   return res.status(401).json({
      message : 'Email or password is invalid'
   })
  }
   const token = jwt.sign({
        userId : user._id,
     }, process.env.JWT_SECRET, {
        expiresIn : "3d"
     });
     res.cookie("token" , token);
     res.status(200).json({
        user : {
            _id : user._id,
            email : user.email,
            name : user.name
        },
        token : token
     })
   
}


async function userLogoutController (req, res) {
   const token = req.cookies.token || req.headers.authhorization?.split(" ")[1];
   if (!token ) {
      return res.status(200).json({
         message : 'User logged out successfully'
      })
   }

   res.cookie("token" , "");
   await tokenBlackListModel.create({token : token});
   res.status(200).json({message : 'User Logged Out Successfully'});
}

module.exports = {
    userRegisterController, userLoginController , userLogoutController
}