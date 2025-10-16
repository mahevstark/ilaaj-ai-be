const  errorHandler = (err, req, res, next) => {
    console.log(err);

    const statusCode = err.statusCode || 500;

    res.status(statusCode).json({
        success : false,
        message  : err.message  || 'Internal Server Error',
        error : process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
};

module.exports = errorHandler;