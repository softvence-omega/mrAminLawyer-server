import { Response } from 'express';

type Data<T> = {
  statusCode: number;
  success: true;
  message: string;
  data: T;
};

const globalResponseHandler = <T>(res: Response, data: Data<T>) => {
  res.status(data.statusCode).json({
    success: data.success,
    message: data.message,
    data: data.data,
  });
};
export default globalResponseHandler;
