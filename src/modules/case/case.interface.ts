import { Types } from 'mongoose';

export type TAssetList = {
  client_user_id: Types.ObjectId;
  caseOverview_id: Types.ObjectId;
  assets: [
    {
      assetUrl: string;
      assetName: string;
      uploadDate: string;
    },
  ];
};

export type TEachTimelineList = {
  caseOverview_id: Types.ObjectId;
  client_user_id: Types.ObjectId;
  caseTitle: string;
  timeLine: [
    {
      assetUrl?: string[];
      title: string;
      description: string;
      date: string;
      isDeleted?: boolean;
    }
  ];
};

export type TCaseOverview = {
  user_id: Types.ObjectId; // Admin who created the case
  client_user_id: Types.ObjectId; // Client associated with the case
  clientName: string;
  caseTitle: string;
  caseType: string;
    // | 'Traffic_Violation'
    // | 'License_Suspension'
    // | 'Reckless_Driving'
    // | 'Hit_and_Run'
    // | 'Driving_without_license'
    // | 'Parking_Violation';
  case_status:
    | 'In Bearbeitung'
    | 'Fall bei der Versicherung eingereicht'
    | 'Fall abgeschlossen'
    | 'Entscheidung der Versicherung noch ausstehend'
    | 'Vorschadenproblematik'
    | 'Ermittlungsakte wurde angefordert'
    | 'Versicherungsnehmer hat Schaden noch nicht gemeldet';
  coatDate?: string;
  note?: string;
  assetList_id?: Types.ObjectId;
  timeLine_id?: Types.ObjectId;
  vehicleNumber: string;
  isMailSent?:boolean;
  isDeleted?: boolean;
};

export interface UpdateCasePayload {
  caseOverviewId: string;
  userId: string;
  client_user_id?: string;
  clientName?: string;
  caseTitle?: string;
  caseType?: string;
  caseStatus?: string;
  coatDate?: string;
  note?: string;
}

export interface DeleteCasePayload {
  caseOverviewId: string;
  userId: string;
}

export interface CaseOverviewQuery {
  userId: string;
  page?: number;
  limit?: number;
  caseStatus?: 'Letter_sent_to_insurance' | 'In_Progress' | 'Closed' | 'Pending';
  vehicleNumber?: string;
}

export interface CaseByIdQuery {
  caseOverviewId: string;
  userId: string;
}