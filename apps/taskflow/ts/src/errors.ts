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
        super('Database op failed interally')
        this.name = 'DatabaseCrashError'
    }
}