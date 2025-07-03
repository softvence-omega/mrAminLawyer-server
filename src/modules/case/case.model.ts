import { Schema, model } from "mongoose";
import { TAssetList } from "./case.interface";

// Asset Schema
const assetSchema = new Schema({
  assetUrl: { type: String, required: true },
  assetName: { type: String, required: true },
  uploadDate: { type: String, required: true }
});

// Asset List Schema
const assetListSchema = new Schema<TAssetList>({
  client_user_id: { type: Schema.Types.ObjectId, required: true },
  caseOverview_id: { type: Schema.Types.ObjectId, required: true },
  assets: [assetSchema]
});

// Timeline Entry Schema
const timelineSchema = new Schema({
  assetUrl: { type: [String] },
  title: { type: String, required: true },
  description: { type: String, required: true },
  date: { type: String, required: true },
  isDeleted: { type: Boolean, default: false }
});

// Timeline List Schema
const timelineListSchema = new Schema({
  caseOverview_id: { type: Schema.Types.ObjectId, required: true },
  client_user_id: { type: Schema.Types.ObjectId, required: true },
  caseTitle: { type: String, required: true },
  timeLine: [timelineSchema]
});

// Case Overview Schema
const caseOverviewSchema = new Schema({
  user_id: { type: Schema.Types.ObjectId, required: true }, // Admin who created the case
  client_user_id: { type: Schema.Types.ObjectId, required: true }, // Client associated with the case
  clientName: { type: String, required: true },
  caseTitle: { type: String, required: true },
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
  assetList_id: { type: Schema.Types.ObjectId, ref: "AssetList", required: false },
  timeLine_id: { type: Schema.Types.ObjectId, ref: "TimelineList", required: false },
  isMailSent:{ type: Boolean, default: false },
  isDeleted: { type: Boolean, default: false }
});

// Models
const AssetListModel = model("AssetList", assetListSchema);
const TimelineListModel = model("TimelineList", timelineListSchema);
const CaseOverviewModel = model("CaseOverview", caseOverviewSchema);

export { AssetListModel, TimelineListModel, CaseOverviewModel };