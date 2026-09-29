"""Document Agent core abstraction and canonical schemas."""
from .schema import (
    CanonicalDocumentState,
    DocumentSection,
    TableSummary,
    SheetSummary,
    DocumentOperation,
    InsertImageOperation,
    InsertTextOperation,
    UpdateTableOperation,
    ReplaceContentOperation,
    OperationExecutionResult,
)
from .validator import DocumentOperationValidator

__all__ = [
    "CanonicalDocumentState",
    "DocumentSection",
    "TableSummary",
    "SheetSummary",
    "DocumentOperation",
    "InsertImageOperation",
    "InsertTextOperation",
    "UpdateTableOperation",
    "ReplaceContentOperation",
    "OperationExecutionResult",
    "DocumentOperationValidator",
]
