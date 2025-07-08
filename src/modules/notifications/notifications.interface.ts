import { Types } from "mongoose"

export type TEachNotification={
    user_id:Types.ObjectId,
    Profile_id:Types.ObjectId,
    notificationType:"chat_message",
    notificationDetail:string,
    isSeen:boolean

}

export type TNotificationList={
    user_id:Types.ObjectId,
    Profile_id:Types.ObjectId,
    oldNotificationCount:number,
    seenNotificationCount:number,
    newNotification:number,
    notificationList:Types.ObjectId[]
}