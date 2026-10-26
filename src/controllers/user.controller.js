import { upload } from "../middlewares/multer.middleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/User.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"


const generateAccessAndRefereshToken=async (userId)=>{
    try{
        const user=await User.findById(userId);
        const accessToken=user.generateAccessToken()
        const refreshToken=user.generateRefreshToken()

        user.refreshToken=refreshToken
        await user.save({validateBeforeSave: false});

        return{ accessToken , refreshToken};
    }catch(err){
        throw new ApiError(500, "something went wrong in generate acces and referesh token")
    }
}

const registerUser=asyncHandler(async (req,res)=>{
     // get user detail from frontend
     //validation --not empty
     // check if user alredy exists: username , email
     //check for images,check for avatar
    //  upload to cloudinary,avtar
    // create user object - create entry in db
    // remove password and refresh token field form response
    // check for user creation
    //return response
    // return res


    const {fullName,email,username,password}=req.body;
    // console.log(email);

    if([fullName,email,username,password].some((field)=>!field || field?.trim()==="")){
        throw new ApiError(400," all fields are required")
    }
    // if(fullName===""){
    //     throw new ApiError(400,"full name required")
    // }

    const existedUser=await User.findOne({
        $or:[{username},{email}]
    })
    if(existedUser){
        throw new ApiError(409, "user with email or username already exists")
    }
    // console.log(req.files);
    
    const avatarLocalPath=req.files?.avatar?.[0]?.path;
    // const coverImageLocalPath=req.files?.coverImage?.[0]?.path;
    // console.log("avatarLocalPath",avatarLocalPath);
    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage)&& req.files.coverImage.length>0){
        coverImageLocalPath=req.files.coverImage[0]?.path;
    }


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
        coverImage:coverImage?.url || "",
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
    return res.status(201).json(
        new ApiResponse(200 , createdUser,"user registered successfully")
    )
})

const loginUser=asyncHandler(async (req,res)=> {
        // req body ->  data
        // username or email
        // find the user
        // password check
        // access and refresh token
        // send cookies

        const {email,username,password} =req.body;
        if(!username || !email){
            throw new ApiError(400, " username or email is required")
        }
        const user=await User.findOne({
            $or: [ {username},{email}]
        })

        if(!user){
            throw new ApiError(404,"user not found");
        }
        
       const isPasswordValid= await user.isPasswordCorrect(password)
       if(!isPasswordValid){
            throw new ApiError(401,"invalid credential");
        }
        const {accessToken,refreshToken}= await generateAccessAndRefereshToken(user._id)

       const loggedInUser=await User.findById(user._id).select(
        "-password -refreshToken")


        const options={
            httpOnly:true,
            secure:true
        }


        return res
        .status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",refreshToken, options)
        .json(
            new ApiResponse(
                200,
                {
                    user:loggedInUser,accessToken,refreshToken
                },
                "User logged in successfully"
            )
        )
})

const logoutUser= asyncHandler(async (req,res)=>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken:undefined
            }
        },
        {
            new :true

        }
    )

    const options={
        httpOnly:true,
        secure:true
    }

    return res.status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200,{},"user logout successfully"))
})

const refreshAccessToken=asyncHandler(async (req,res)=>{
    const incomingRefreshToken= req.cookie.refreshToken || body.refreshToken
     if(!incomingRefreshToken){
        throw new ApiError(401,"unauthorized request")
     }

    try {
        const decodedToken= jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET )
    
        const user= await User.findById(decodedToken._id);
         
        if(!user){
            throw new ApiError(401,"invalid refresh token")
         }
         if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401,"Refresh token is expired or used")
         }
    
         const options ={
            httpOnly:true,
            secure:true
         }
    
       const {accessToken,newrefreshToken}= await generateAccessAndRefereshToken(user._id)
    
        return res
        .status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",newrefreshToken,options)
        .json(
            new ApiResponse(
                200,
                {accessToken,refreshToken : newrefreshToken},
                "access token refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401,err?.message || "invalid refresh token")
    }
})

const changeCurrentPassword= asyncHandler(async (req,res)=>{
    const {oldPassword, newPassword}=req.body

   const user= await User.findById(req.user?._id)

   const isPasswordCorrect=await user.isPasswordCorrect(oldPassword)

   if(!isPasswordCorrect){
    throw new ApiError(400,"invalid old password")
   }
   user.password=newPassword;
   await user.save({validateBeforeSave:false})

   return res.status(200)
            .json(new ApiResponse(200,{},"password changed succesfully"))
})

const getCurrentUser=asyncHandler(async(req,res)=>{
    return res
    .status(200)
    .json(200 ,req.user,"current user fetched succesfully")
})

const updateAccountDetails = asyncHandler(async(req,res)=>{
    const {fullName,email}=req.body

    if(!fullName || !email){
        throw new ApiError(400,"all field are required")
    }

    const user=await User.findByIdAndUpdate(req.user?._id,
                                {
                                    $set:{
                                        fullName,
                                        email:email,
                                    }
                                },
                                {new:true},
    ).select("-password")

    return res.status(200).json(new ApiResponse(200, user,"account details successfully"))
})

const updateUserAvatar= asyncHandler(async(req,res)=>{
    const avatarLocalPath=req.file?.path;

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is missing")
    }
    const avatar= await uploadOnCloudinary(avatarLocalPath);

    if(!avatar.url){
        throw new ApiError(400,"Error while uploading on avatar")
    }

    const user =await User.findByIdAndUpdate(req.user?._id,
        {
            $set:{
                avatar:avatar.url
            }
        },
        {new:true}
    ).select("-password")

    return res
                .status(200)
                .json(new ApiResponse(200 ,user,"avatar image uploaded successfully"))
})

const updateUserCoverImage = asyncHandler(async(req,res)=>{
    const coverlocalPath=req.file?.path

    if(!coverlocalPath){
        throw new ApiError(400,"coverImage path not found")
    }
    const coverImage= await uploadOnCloudinary(coverlocalPath)

    if(!coverImage.url){
        throw new ApiError(400,"Error coverImage url not uploaded")
    }
    const user = await User.findByIdAndUpdate(req.user?._id,
        {
            $set:{
                coverImage:coverImage.url
            }
        },{new:true}).select("-password")

        return res
                .status(200)
                .json(new ApiResponse(200 ,user,"coverImage uploaded successfully"))
})

export { 
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken ,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage
}