class NotFoundError(Exception):
    def __init__(self, message: str = "Resource not found"):
        self.message = message
        super().__init__(self.message)

class ConflictError(Exception):
    def __init__(self, message: str = "Resource already exisits"):
        self.message = message
        super().__init__(self.message)

class DatabaseCrashError(Exception):
    def __init__(self, original_error: Exception):
        self.message = "Database op failed internally"
        self.original_error = original_error
        super().__init__(self.message)