import { Schema, model } from 'mongoose';
import { TAssetList } from './case.interface';

// Asset Schema
const assetSchema = new Schema(
  {
    assetUrl: { type: String, required: true },
    assetName: { type: String, required: true },
    fileSize: { type: Number, required: true },
    uploadDate: { type: String, required: false, default: new Date().toISOString() },
  },
  { timestamps: true },
);

// Asset List Schema
const assetListSchema = new Schema<TAssetList>(
  {
    client_user_id: { type: Schema.Types.ObjectId, required: true },
    caseOverview_id: { type: Schema.Types.ObjectId, required: true },
    assets: [assetSchema],
  },
  { timestamps: true },
);

// Timeline Entry Schema
const timelineSchema = new Schema(
  {
    assetUrl: { type: [String] },
    assetName: { type: String, required: false },
    fileSize: { type: Number, required: false },
    title: { type: String, required: true },
    description: { type: String, required: true },
    date: { type: String, required: true },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// Timeline List Schema
const timelineListSchema = new Schema(
  {
    caseOverview_id: { type: Schema.Types.ObjectId, required: true },
    client_user_id: { type: Schema.Types.ObjectId, required: true },
    caseTitle: { type: String, required: true },
    timeLine: [timelineSchema],
  },
  { timestamps: true },
);

// Case Overview Schema
const caseOverviewSchema = new Schema(
  {
    caseNumber: { type: String, unique: true },
    user_id: { type: Schema.Types.ObjectId, required: true }, // Admin who created the case
    client_user_id: { type: Schema.Types.ObjectId, required: true }, // Client associated with the case
    clientName: { type: String, required: true },
    caseTitle: { type: String, required: true },
    caseType: {
      type: String,
      // enum: [
      //   'Traffic_Violation',
      //   'License_Suspension',
      //   'Reckless_Driving',
      //   'Hit_and_Run',
      //   'Driving_without_license',
      //   'Parking_Violation',
      // ],
      required: false,
      default: 'Traffic Accident',
    },
    case_status: {
      type: String,
      enum: ['Letter_sent_to_insurance', 'In_Progress', 'Closed', 'Pending'],
      required: true,
    },
    coatDate: { type: String },
    note: { type: String },
    assetList_id: {
      type: Schema.Types.ObjectId,
      ref: 'AssetList',
      required: false,
    },
    timeLine_id: {
      type: Schema.Types.ObjectId,
      ref: 'TimelineList',
      required: false,
    },
    vehicleNumber: { type: String, required: true },
    isMailSent: { type: Boolean, default: false },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true },
);

caseOverviewSchema.pre('save', async function (next) {
  if (this.isNew) {
    const year = new Date().getFullYear();

    // Count how many cases exist for this year
    const count = await CaseOverviewModel.countDocuments({
      createdAt: {
        $gte: new Date(`${year}-01-01`),
        $lt: new Date(`${year + 1}-01-01`),
      },
    });

    const serial = String(count + 1).padStart(3, '0');
    this.caseNumber = `CASE-${year}-${serial}`;
  }
  next();
});

// Models
const AssetListModel = model('AssetList', assetListSchema);
const TimelineListModel = model('TimelineList', timelineListSchema);
const CaseOverviewModel = model('CaseOverview', caseOverviewSchema);

export { AssetListModel, TimelineListModel, CaseOverviewModel };
