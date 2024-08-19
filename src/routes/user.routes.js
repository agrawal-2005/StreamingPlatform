import { Router } from "express";
import {
  loginUser,
  logoutUser,
  refreshAccessToken,
  registerUser,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// Register route with file uploads
router.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  registerUser
);

// Login route
router.route("/login").post(loginUser);

// Secured route
router.route("/logout").post((req, res, next) => {
  // console.log("Logout route hit");
  next();
}, verifyJWT, logoutUser);
router.route("/refresh-token").post(refreshAccessToken);


export default router;
