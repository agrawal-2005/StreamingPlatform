import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import {uploadOncloudinary, uploadOnCloudinary} from '../utils/cloudinary.js'
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async (res, req) => {
  // res.status(200).json({
  //     message: "ok"
  // })

  //get user details from frontend
  //validation - not empty
  //check if user already exits : username, email
  //check images, avatar
  //upload them to cloudinary, avatar
  //create user object - create entry in db
  //remove password and refresh token field from response
  //check for user creation
  //return res

  const { fullName, email, username, password } = req.body;
  // console.log("email : ", email);

  //validation - not empty :-
  // if(fullName === "") {
  //     throw new ApiError (400, "fullname is required", )
  // }
  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "all fields are required");
  }

  //check if user already exits : username, email :-
  try {
    // Check if a user with the given email already exists
    const existedUserWithEmail = await User.findOne({ email });
    if (existedUserWithEmail) {
      throw new ApiError(409, "User with email already exists");
    }

    // Check if a user with the given username already exists
    const existedUserWithUsername = await User.findOne({ username });
    if (existedUserWithUsername) {
      throw new ApiError(409, "User with username already exists");
    }

    // If neither exists, proceed with creating the user or other logic
    // ...
  } catch (error) {
    // Handle the error, e.g., send a response with the error message
    console.error(error.message);
  }

  //check images, avatar :- 
  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverImageLocalPath = req.files?.coverImage[0]?.path;

  if(!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required")
  }

  //upload them to cloudinary, avatar :- 
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOncloudinary(coverImageLocalPath);

  if(!avatar){
    throw new ApiError(400, "Avatar file is required")
  }

  //create user object - create entry in db :- 
  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase()
  })

  //check for user creation :-
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  )

  //remove password and refresh token field from response :-
  if(!createdUser){
    throw new ApiError(500, "Something went wrong while registering the user")
  }

  //return res :-
  return res.status(201).json(
    new ApiResponse(200, createdUser, "User registered successfully")
  )
});

export { registerUser };
