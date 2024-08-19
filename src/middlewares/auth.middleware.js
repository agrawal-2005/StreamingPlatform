import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from 'jsonwebtoken';

export const verifyJWT = asyncHandler(async (req, res, next) => {
    try {
        // Extract token from cookies or the Authorization header
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
        
        // Check if the token is missing
        if (!token) {
            throw new ApiError(401, "Unauthorized request");
        }

        // Verify the token using the secret key
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

        // Find the user associated with the token
        const user = await User.findById(decodedToken?._id).select("-password -refreshToken");

        // If the user is not found, throw an error
        if (!user) {
            throw new ApiError(401, "Invalid Access Token");
        }

        // Attach the user object to the request
        req.user = user;

        // Proceed to the next middleware or route handler
        next();
    } catch (error) {
        // Handle any errors that occur during token verification
        throw new ApiError(401, error?.message || "Invalid access token");
    }
});
