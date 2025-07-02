// import multer from "multer";
// import path from "path";
// import { v2 as cloudinary } from "cloudinary";
// import fs from "fs/promises";
// import config from "../config";

// // Function to delete a file from the local filesystem
// export const deleteFile = async (filePath: string) => {
//   try {
//     await fs.access(filePath)
//     await fs.unlink(filePath);
//     console.log(`File deleted successfully: ${filePath}`);
//   } catch (err: any) {
//     console.error(`Error deleting file: ${err.message}`);
//   }
// };

// // Function to upload an image to Cloudinary
// export const uploadImgToCloudinary = async (name: string, filePath: string) => {
//   // Configuration for Cloudinary
//   cloudinary.config({
//     cloud_name: config.cloudinary_name,
//     api_key: config.cloudinary_api_key,
//     api_secret: config.cloudinary_api_secret,
//   });

//   try {
//     // Upload an image to Cloudinary
//     const uploadResult = await cloudinary.uploader.upload(filePath, {
//       public_id: name,
//     });

//     // Log the upload result
//     console.log("Upload result:", uploadResult);

//     // Delete the file from the local filesystem after uploading it to Cloudinary
//     await deleteFile(filePath);

//     // Return the upload result
//     return uploadResult;
//   } catch (error) {
//     console.error("Error uploading image to Cloudinary:", error);
//     throw new Error("Image upload failed");
//   }
// };

// // Function to handle multiple image uploads
// export const uploadMultipleImages = async (filePaths: string[]) => {
//   try {
//     // Initialize an array to store the image URLs
//     const imageUrls: string[] = [];

//     // Loop through the file paths and upload each one
//     for (const filePath of filePaths) {
//       const imageName = `${Math.floor(
//         100 + Math.random() * 900
//       )}-${Date.now()}`; // Unique image name
//       const uploadResult = await uploadImgToCloudinary(imageName, filePath);
//       imageUrls.push(uploadResult.secure_url); // Store the secure URL of the uploaded image
//     }

//     // Return the array of image URLs
//     return imageUrls;
//   } catch (error) {
//     console.error("Error uploading multiple images:", error);
//     throw new Error("Multiple image upload failed");
//   }
// };


// // Function to upload a PDF to Cloudinary
// export const uploadPdfToCloudinary = async (name: string, filePath: string) => {
//   cloudinary.config({
//     cloud_name: config.cloudinary_name,
//     api_key: config.cloudinary_api_key,
//     api_secret: config.cloudinary_api_secret,
//   });

//   try {
//     const uploadResult = await cloudinary.uploader.upload(filePath, {
//       public_id: `resumes/${name}-${Date.now()}`,
//       resource_type: "auto",
//     });

//     await deleteFile(filePath);
//     return uploadResult;
//   } catch (error) {
//     console.error("Error uploading PDF to Cloudinary:", error);
//     // Attempt to clean up file in case of upload failure
//     await deleteFile(filePath);
//     throw new Error("PDF upload failed");
//   }
// };

// // Multer storage configuration for local file saving
// // const storage = multer.diskStorage({
// //   destination: function (req, file, cb) {
// //     cb(null, path.join(process.cwd(), "uploads")); // Define folder for temporary file storage
// //   },
// //   filename: function (req, file, cb) {
// //     const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
// //     cb(null, file.fieldname + "-" + uniqueSuffix); // Generate unique file name
// //   },
// // });

// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, path.join(process.cwd(), "uploads"));
//   },
//   filename: (req, file, cb) => {
//     const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
//     cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
//   },
// });

// // Multer upload setup for PDF files
// export const uploadPdf = multer({
//   storage,
//   fileFilter: (req, file, cb) => {
//     const allowedTypes = ["application/pdf"];
//     if (!allowedTypes.includes(file.mimetype)) {
//       cb(new Error("Only PDF files are allowed!") as any, false);
//       return;
//     }
//     cb(null, true);
//   },
//   limits: {
//     fileSize: 10 * 1024 * 1024, // 10 MB
//   },
// });

// // Multer upload setup
// export const upload = multer({ storage: storage });




import multer from "multer";
import path from "path";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs/promises";
import config from "../config";

// Configure Cloudinary once at module level
cloudinary.config({
  cloud_name: config.cloudinary_name,
  api_key: config.cloudinary_api_key,
  api_secret: config.cloudinary_api_secret,
});

// Function to delete a file from the local filesystem
export const deleteFile = async (filePath: string) => {
  try {
    await fs.access(filePath); // Check if file exists
    await fs.unlink(filePath); // Delete file
    console.log(`File deleted successfully: ${filePath}`);
  } catch (err: any) {
    console.error(`Error deleting file ${filePath}: ${err.message}`);
  }
};

// Function to upload an image to Cloudinary
export const uploadImgToCloudinary = async (name: string, filePath: string) => {
  try {
    // Verify file exists
    await fs.access(filePath);

    // Upload image to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(filePath, {
      public_id: name,
      resource_type: "image",
    });

    console.log(`Image uploaded successfully: ${uploadResult.secure_url}`);

    // Delete local file after successful upload
    await deleteFile(filePath);

    return uploadResult;
  } catch (error: any) {
    console.error(`Error uploading image to Cloudinary for ${filePath}:`, error);
    // Attempt to clean up file on failure
    await deleteFile(filePath);
    throw new Error(`Image upload failed: ${error.message}`);
  }
};

// Function to upload a PDF to Cloudinary
export const uploadPdfToCloudinary = async (name: string, filePath: string) => {
  try {
    // Verify file exists
    await fs.access(filePath);

    // Upload PDF to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(filePath, {
      public_id: `resumes/${name}-${Date.now()}`,
      resource_type: "raw", // Explicitly set to "raw" for PDFs
    });

    console.log(`PDF uploaded successfully: ${uploadResult.secure_url}`);

    // Delete local file after successful upload
    await deleteFile(filePath);

    return uploadResult;
  } catch (error: any) {
    console.error(`Error uploading PDF to Cloudinary for ${filePath}:`, error);
    // Attempt to clean up file on failure
    await deleteFile(filePath);
    throw new Error(`PDF upload failed: ${error.message}`);
  }
};

// Function to handle multiple image uploads
export const uploadMultipleImages = async (filePaths: string[]) => {
  try {
    const imageUrls: string[] = [];

    for (const filePath of filePaths) {
      const imageName = `${Math.floor(100 + Math.random() * 900)}-${Date.now()}`;
      const uploadResult = await uploadImgToCloudinary(imageName, filePath);
      imageUrls.push(uploadResult.secure_url);
    }

    return imageUrls;
  } catch (error: any) {
    console.error("Error uploading multiple images:", error);
    throw new Error(`Multiple image upload failed: ${error.message}`);
  }
};

// Multer storage configuration for local file saving
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(process.cwd(), "uploads"));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

// Multer upload setup for PDF files
export const uploadPdf = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["application/pdf"];
    if (!allowedTypes.includes(file.mimetype)) {
      cb(new Error("Only PDF files are allowed!") as any, false);
      return;
    }
    cb(null, true);
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
});

// Multer upload setup for general files
export const upload = multer({ storage });