// Error handling middleware
const errorHandler = (error, req, res, next) => {
  console.error("Error:", error);

  // Default error response
  let statusCode = 500;
  let message = "Internal Server Error";
  let errors = [];

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
  }

  // Handle JWT errors
  if (error.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Invalid token";
  }

  if (error.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token expired";
  }

  // Handle validation errors from express-validator
  if (error.array) {
    statusCode = 400;
    message = "Validation Error";
    errors = error.array().map((err) => ({
      field: err.path,
      message: err.msg,
    }));
  }

  // Handle custom errors with status code
  if (error.statusCode) {
    statusCode = error.statusCode;
    message = error.message;
    if (error.errors) {
      errors = error.errors;
    }
  }

  // Send response
  res.status(statusCode).json({
    success: false,
    message,
    errors: errors.length > 0 ? errors : undefined,
    stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
  });
};

module.exports = errorHandler;
