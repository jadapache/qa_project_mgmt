"""Canonical schemas and models for DocumentAgent operations and state."""

from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional, Union
from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    model_config = ConfigDict(
        populate_by_name=True,
        alias_generator=to_camel,
    )


DocumentKind = Literal["document", "spreadsheet"]


class DocumentSection(CamelModel):
    id: str
    title: str
    level: int = 1
    paragraph_count: int = 1
    preview_text: str = ""
    tables: List[str] = Field(default_factory=list)
    images: List[str] = Field(default_factory=list)


class TableSummary(CamelModel):
    id: str
    name: Optional[str] = None
    rows: int = 0
    cols: int = 0
    header_sample: List[str] = Field(default_factory=list)


class SheetSummary(CamelModel):
    name: str
    max_row: int = 0
    max_col: int = 0
    active_range: str = "A1"


class CanonicalDocumentState(CamelModel):
    document_id: str
    kind: DocumentKind = "document"
    title: str = "Document"
    sections: List[DocumentSection] = Field(default_factory=list)
    tables_summary: List[TableSummary] = Field(default_factory=list)
    sheets_summary: Optional[List[SheetSummary]] = Field(default_factory=list)
    tags_present: List[str] = Field(default_factory=list)
    total_paragraphs: int = 0
    total_images: int = 0
    version: int = 1


class TargetLocator(CamelModel):
    section_title: Optional[str] = Field(None, description="Title of the section, e.g., 'Observaciones'")
    tag: Optional[str] = Field(None, description="Placeholder tag, e.g., '{{OBSERVACIONES}}'")
    anchor_text: Optional[str] = Field(None, description="Reference text snippet to locate position")
    cell_range: Optional[str] = Field(None, description="Cell or range coordinate for sheets, e.g., 'B5' or 'Sheet1!A1:D10'")
    paragraph_index: Optional[int] = Field(None, description="0-based or 1-based paragraph index relative to section")
    position: Literal["before", "after", "inside_end", "inside_start", "replace_target"] = "after"


class AssetLocator(CamelModel):
    asset_id: str
    url: Optional[str] = None
    caption: Optional[str] = None
    width: Optional[Union[int, str]] = "auto"
    height: Optional[Union[int, str]] = "auto"


# Operations
class InspectDocumentOperation(CamelModel):
    operation: Literal["inspect_document"] = "inspect_document"
    document_id: Optional[str] = None


class FindSectionOperation(CamelModel):
    operation: Literal["find_section"] = "find_section"
    section_title: str


class FindTextOperation(CamelModel):
    operation: Literal["find_text"] = "find_text"
    query: str


class InsertImageOperation(CamelModel):
    operation: Literal["insert_image"] = "insert_image"
    target: TargetLocator
    asset: AssetLocator


class InsertTextOperation(CamelModel):
    operation: Literal["insert_text"] = "insert_text"
    target: TargetLocator
    content: str


class ReplaceContentOperation(CamelModel):
    operation: Literal["replace_content"] = "replace_content"
    target: TargetLocator
    new_content: str


class DeleteContentOperation(CamelModel):
    operation: Literal["delete_content"] = "delete_content"
    target: TargetLocator


class MoveContentOperation(CamelModel):
    operation: Literal["move_content"] = "move_content"
    source_target: TargetLocator
    destination_target: TargetLocator


class CreateTableOperation(CamelModel):
    operation: Literal["create_table"] = "create_table"
    target: TargetLocator
    headers: List[str]
    rows: List[List[Any]] = Field(default_factory=list)


class UpdateTableOperation(CamelModel):
    operation: Literal["update_table"] = "update_table"
    target: TargetLocator
    action: Literal["append_row", "replace_data", "update_cell"] = "append_row"
    data: List[List[Any]] = Field(default_factory=list)


DocumentOperation = Union[
    InspectDocumentOperation,
    FindSectionOperation,
    FindTextOperation,
    InsertImageOperation,
    InsertTextOperation,
    ReplaceContentOperation,
    DeleteContentOperation,
    MoveContentOperation,
    CreateTableOperation,
    UpdateTableOperation,
]


class OperationExecutionResult(CamelModel):
    success: bool
    operation: str
    element_id: Optional[str] = None
    message: str = ""
    error: Optional[str] = None
    diff_summary: Optional[Dict[str, Any]] = None


class VerificationReport(CamelModel):
    verified: bool
    operation: str
    target_found: bool
    state_after: Optional[CanonicalDocumentState] = None
    diff_detected: Dict[str, Any] = Field(default_factory=dict)
    feedback: str = ""

