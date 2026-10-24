import { upload } from "../middlewares/multer.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/User.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";


const registerUser=asyncHandler(async (req,res)=>{
     // get user detail from frontend
     //validation --not empty
     // check if user alredy exists: username , email
     //check for images,check for avatar
    //  upload to cloudinary,avtar
    // create user object - create entry in db
    // remove passwor and refresh token field form response
    // check for user creation
    //return response
    // return res


    const {fullName,email,username,password}=req.body;
    console.log(email);

    if([fullName,email,username,password].some((field)=> field?.trim()==="")){
        throw new ApiError(400," all fields are required")
    }
    // if(fullName===""){
    //     throw new ApiError(400,"full name required")
    // }

    const existedUser=User.findOne({
        $or:[{username},{email}]
    })
    if(existedUser){
        throw new ApiError(409, "user with email or username already exists")
    }
    const avatarLocalPath=req.files?.avatar[0]?.path;
    const coverImageLocalPath=req.files?.coverImage[0]?.path;
    // console.log("avatarLocalPath",avatarLocalPath);
    

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is required")
    }
    const avatar=await uploadOnCloudinary(avatarLocalPath);
    const coverImage=await uploadOnCloudinary(coverImageLocalPath);

    if(!avatar){
        throw new ApiError(400,"Avatar file is required");
    }
  const user= await User.create({
        fullName,
        avatar:avatar.url,
        coverImage:coverImage.url || "",
        email,
        password,
        username:username.toLowerCase()
    })
    const createdUser=await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new ApiError(500 , "somthing went wrong in user creation")
    }
    return registerUser.status(201).json(
        new ApiResponse(200 , createdUser,"user registered successfully")
    )
})

export { registerUser }