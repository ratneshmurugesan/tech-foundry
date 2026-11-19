import contextvars
DOORLESS = "__doorless__"
app_identity: contextvars.ContextVar[str] = contextvars.ContextVar("app_identity", default="")