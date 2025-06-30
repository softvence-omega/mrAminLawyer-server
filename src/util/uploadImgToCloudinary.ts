import multer from "multer";
import path from "path";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs/promises";
import config from "../config";

// Function to delete a file from the local filesystem
export const deleteFile = async (filePath: string) => {
  try {
    await fs.unlink(filePath);
    console.log(`File deleted successfully: ${filePath}`);
  } catch (err: any) {
    console.error(`Error deleting file: ${err.message}`);
  }
};

// Function to upload an image to Cloudinary
export const uploadImgToCloudinary = async (name: string, filePath: string) => {
  // Configuration for Cloudinary
  cloudinary.config({
    cloud_name: config.cloudinary_name,
    api_key: config.cloudinary_api_key,
    api_secret: config.cloudinary_api_secret,
  });

  try {
    // Upload an image to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(filePath, {
      public_id: name,
    });

    // Log the upload result
    console.log("Upload result:", uploadResult);

    // Delete the file from the local filesystem after uploading it to Cloudinary
    await deleteFile(filePath);

    // Return the upload result
    return uploadResult;
  } catch (error) {
    console.error("Error uploading image to Cloudinary:", error);
    throw new Error("Image upload failed");
  }
};

// Function to handle multiple image uploads
export const uploadMultipleImages = async (filePaths: string[]) => {
  try {
    // Initialize an array to store the image URLs
    const imageUrls: string[] = [];

    // Loop through the file paths and upload each one
    for (const filePath of filePaths) {
      const imageName = `${Math.floor(
        100 + Math.random() * 900
      )}-${Date.now()}`; // Unique image name
      const uploadResult = await uploadImgToCloudinary(imageName, filePath);
      imageUrls.push(uploadResult.secure_url); // Store the secure URL of the uploaded image
    }

    // Return the array of image URLs
    return imageUrls;
  } catch (error) {
    console.error("Error uploading multiple images:", error);
    throw new Error("Multiple image upload failed");
  }
};

// Multer storage configuration for local file saving
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(process.cwd(), "uploads")); // Define folder for temporary file storage
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix); // Generate unique file name
  },
});

// Multer upload setup
export const upload = multer({ storage: storage });