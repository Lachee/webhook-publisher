import { STATUS_CODES } from "http";

export function ErrorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  //    //Validation Errors result in a bad request
  //    if (error instanceof Joi.ValidationError)
  //    res.statusCode = 400;

  //Log the endpoint
  console.error(error);

  //SEt the status and return the JSON
  res.status(res.statusCode === 200 ? (error.statusCode || 500) : res.statusCode);
  res.json({
      message: error.message,
      _stacktrace: process.env.NODE_ENV === 'production' ? '🥞' : error.stack,
  });
}

/** List of common exceptions. */
// @ts-ignore
export const HttpError = (Object.fromEntries(
  Object.entries(STATUS_CODES)
      // @ts-ignore
      .filter(([k, v]) => k >= 400)
      .map(([k, v]) => {
          let name = STATUS_CODES[k] .replace(/\W/g, '');
          return [ name, function(message) {
              Error.captureStackTrace(this, this.constructor);
              this.name = name;
              this.message = message;
              this.statusCode = k;
          }];
    })
));
