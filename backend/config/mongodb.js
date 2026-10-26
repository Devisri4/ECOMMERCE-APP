import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();


const connectDB = async() => {

    mongoose.connection.on('connected',()=>{
        console.log("DB Connected");
    })

    try {
        const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017";
        const connUri = uri.includes('/e-commerce') ? uri : `${uri}/e-commerce`;
        await mongoose.connect(connUri);
    } catch (error) {
        console.error("Primary MongoDB connection failed, attempting local fallback:", error.message);
        try {
            await mongoose.connect("mongodb://127.0.0.1:27017/e-commerce");
        } catch (localErr) {
            console.error("Local MongoDB connection failed:", localErr.message);
        }
    }



}

export default connectDB