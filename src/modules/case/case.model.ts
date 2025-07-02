import { Schema, model, Types } from "mongoose";

// Asset List Schema
const assetSchema = new Schema({
  assetUrl: { type: String, required: true },
  assetName: { type: String, required: true },
  uploadDate: { type: String, required: true }
});

const assetListSchema = new Schema({
  user_id: { type: Types.ObjectId, required: true },
  caseOverview_id: { type: Types.ObjectId, required: true },
  assets: [assetSchema]
});

// Timeline Entry Schema
const timelineEntrySchema = new Schema({
  caseOverview_id: { type: Types.ObjectId, required: true },
  user_id: { type: Types.ObjectId, required: true },
  caseTitle: { type: String, required: true },
  assetUrl: { type: String },
  title: { type: String, required: true },
  description: { type: String, required: true },
  isDeleted: { type: Boolean, default: false },
  date: { type: Date, required: true }
});

// Case Overview Schema
const caseOverviewSchema = new Schema({
  user_id: { type: Types.ObjectId, required: true },
  clientName: { type: String, required: true },
  caseType: { 
    type: String, 
    enum: ["Traffic_Violation", "License_Suspension", "Reckless_Driving", "Hit_and_Run", "Driving_without_license", "Parking_Violation"],
    required: true 
  },
  case_status: { 
    type: String, 
    enum: ["Letter_sent_to_insurance", "In_Progress", "Closed", "Pending"],
    required: true 
  },
  coatDate: { type: String },
  note: { type: String },
  timeLine: [timelineEntrySchema],
  isDeleted: { type: Boolean, default: false }
});

// Models
const AssetList = model("AssetList", assetListSchema);
const TimelineEntry = model("TimelineEntry", timelineEntrySchema);
const CaseOverview = model("CaseOverview", caseOverviewSchema);

export { AssetList, TimelineEntry, CaseOverview };