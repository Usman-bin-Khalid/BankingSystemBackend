const userModels = require('../models/user.model');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');


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
     })

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


module.exports = {
    userRegisterController, userLoginController
}