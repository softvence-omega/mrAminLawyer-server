import catchAsync from "../../util/catchAsync";;
import caseService from "./case.service";


const createCase = catchAsync(async (req , res) => {
    const payLoad = req.body.data;
    const files = req.files as any[]; // Assuming files are provided as an array
  
    // Validate payload existence
    if (!payLoad) {
      throw new Error("No payload data provided");
    }
  
    const result = await caseService.createCase(payLoad, files);
  
    res.status(200).json({
      status: "success",
      message: "Case created successfully",
      data: result,
    });
  });


const caseController ={
    createCase
}

export default caseController;