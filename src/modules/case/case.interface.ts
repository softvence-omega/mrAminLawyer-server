import { Types } from "mongoose";



export type TEachTimelineEntry={
   caseTitle:string;
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
    coatDate:Date;
    note?:string;
    timeLine?:[TEachTimelineEntry];
    isDeleted?:boolean;

} 