import { Types } from "mongoose";

export type TAssetList ={
    user_id:Types.ObjectId;
    caseOverview_id:Types.ObjectId;
    assets:[
        {
            assetUrl:string;
            assetName:string;
            uploadDate:string
        }
    ]
}


export type TEachTimelineEntry={
    caseOverview_id:Types.ObjectId;
    user_id:Types.ObjectId;
   caseTitle:string;
   assetUrl?:string;
    title:string;
    description:string;
    isDeleted?:boolean;
    date:Date;
}

export type TCaseOverview ={
    user_id:Types.ObjectId;
    clientName:string;
    caseType:"Traffic_Violation" |"License_Suspension" | "Reckless_Driving"|"Hit_and_Run"|"Driving_without_license"|"Parking_Violation",
    case_status:"Letter_sent_to_insurance" | "In_Progress" | "Closed" | "Pending",
    coatDate?:string;
    note?:string;
    timeLine?:[TEachTimelineEntry];
    isDeleted?:boolean;

} 