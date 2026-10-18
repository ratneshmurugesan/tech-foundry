export class NotFoundError extends Error {
    constructor(message = 'Resource not found') {
        super(message);
        this.name = 'NotFoundError'
    }
}

export class ConflictError extends Error {
    constructor(message = 'Resource already exists') {
        super(message);
        this.name = 'ConflictError';
    }
}

export class DatabaseCrashError extends Error {
    constructor(public originalError: unknown) {
        super('Database op failed internally')
        this.name = 'DatabaseCrashError'
    }
}

export class UnauthorizedError extends Error {
    constructor(message = 'Unauthorized'){
        super(message);
        this.name = 'UnauthorizedError'
    }
}

export class ForbiddenError extends Error {
    constructor(message = 'Forbidden') {
        super(message)
        this.name = 'Forbidden'
    }
}

export class VerificationError extends Error {
    constructor(message = 'payment signature did not verify') {
        super(message)
        this.name = 'Verification'
    }
}

export class ServiceUnavailableError extends Error {
    constructor(message = 'Razorpay is not configured') {
        super(message)
        this.name = 'Service Unavailable'
    }
}