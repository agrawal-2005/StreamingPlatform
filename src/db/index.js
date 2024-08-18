import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async () => {
    try {
        const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`);
        console.log(`\n MongoDB connected !! DB HOST: ${connectionInstance.connection.host}`);
    } catch (error) {
        console.log("MongoDB connection FAILED", error);
        process.exit(1);
    }
}

export default connectDB;


// "scripts": {
  //   "dev": "nodemon --env-file=.env src/index.js",
  //   "start": "node --env-file=.env src/index.js"
  // },