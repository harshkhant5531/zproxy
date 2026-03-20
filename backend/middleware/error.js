// Error handling middleware
const errorHandler = (error, req, res, next) => {
  console.error("Error:", error);

  // Default error response
  let statusCode = 500;
  let message = "Internal Server Error";
  let errors = [];
  let reason;

  // Handle validation errors
  if (error.name === "ValidationError") {
    statusCode = 400;
    message = "Validation Error";
    errors = Object.values(error.errors).map((err) => ({
      field: err.path,
      message: err.message,
    }));
  }

  // Handle Prisma errors
  if (error.code === "P2002") {
    statusCode = 409;
    message = "Duplicate entry. This record already exists.";
    reason = "duplicate_entry";
    errors = [
      {
        field: error.meta.target[0],
        message: "This value is already in use",
      },
    ];
  }

  if (error.code === "P2025") {
    statusCode = 404;
    message = "Record not found";
    reason = "record_not_found";
  }

  // Handle JWT errors
  if (error.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token";
    reason = "invalid_token";
  }

  if (error.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token expired";
    reason = "token_expired";
  }

  // Handle validation errors from express-validator
  if (error.array) {
    statusCode = 400;
    message = "Validation Error";
    reason = "validation_error";
    errors = error.array().map((err) => ({
      field: err.path,
      message: err.msg,
    }));
  }

  // Handle custom errors with status code
  if (error.statusCode) {
    statusCode = error.statusCode;
    message = error.message;
    reason = error.reasonCode || reason;
    if (error.errors) {
      errors = error.errors;
    }
  }

  // Send response
  const debug = {};

  res.status(statusCode).json({
    success: false,
    message,
    reason: reason || undefined,
    errors: errors.length > 0 ? errors : undefined,
    debug: Object.keys(debug).length > 0 ? debug : undefined,
    stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
  });
};

module.exports = errorHandler;
