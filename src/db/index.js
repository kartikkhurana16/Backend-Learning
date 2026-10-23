import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";



const connectDB=async()=>{
    try{
        const connectInstance = await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`);
        console.log(`\n MongoDB connected !! DB HOST : ${connectInstance.connection.host}`);
        
    }
    catch(error){
        console.log(`mongoDB connection ERROR: ${error}`);
        process.exit(1);
    }
}
export default connectDB;

/*
import express from "express";
const app=express();


(async()=> {
    try{    
       await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`)
       app.on("error",(error)=>{
        console.log("ERROR: ", error);
        throw error
       })

       app.listen(process.env.PORT,()=>{
        console.log(`app is listening on port ${process.env.PORT}`);
        
       })
    }catch(error){
        console.log("ERROR:", error);
        throw error;
        
    }
})()

*/