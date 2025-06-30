import { TErrorSource } from '../constants';

const dublicateErrorHandellerr = (err: any) => {
  const match = err.errorResponse.errmsg.match(/"([^"]*)"/);
  const errorMessage = match ? match[1] : 'No match found';

  const statuscode = 400;
  const message = 'dublicet entry error';
  const errorSource: TErrorSource = [
    {
      path: '',
      message: `${errorMessage} already exist`,
    },
  ];
  return {
    statuscode,
    message,
    errorSource,
  };
};

export default dublicateErrorHandellerr;
