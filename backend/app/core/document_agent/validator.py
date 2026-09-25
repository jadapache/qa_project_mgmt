"""DocumentAgent Operation Validator.

Validates proposed operations against current document canonical state,
ensuring targets, assets, and bounds are valid before execution.
"""

from __future__ import annotations

from typing import List, Optional, Tuple
from .schema import (
    CanonicalDocumentState,
    DocumentOperation,
    InsertImageOperation,
    InsertTextOperation,
    ReplaceContentOperation,
    UpdateTableOperation,
    CreateTableOperation,
    DeleteContentOperation,
    TargetLocator,
)


import unicodedata

def _normalize_text(text: str) -> str:
    n = unicodedata.normalize('NFKD', text).encode('ASCII', 'ignore').decode('utf-8')
    return n.strip().lower()


class ValidationError(Exception):
    def __init__(self, message: str, field: Optional[str] = None):
        super().__init__(message)
        self.field = field


class DocumentOperationValidator:
    """Pre-execution validation engine for canonical document operations."""

    @staticmethod
    def resolve_target(target: TargetLocator, state: CanonicalDocumentState) -> Tuple[bool, str]:
        """Verify if the target locator matches any section, tag, or anchor in the current document state."""
        # 1. Match by section title (accent and case-insensitive fuzzy or exact)
        if target.section_title:
            st_norm = _normalize_text(target.section_title)
            for sec in state.sections:
                sec_norm = _normalize_text(sec.title)
                if st_norm in sec_norm or sec_norm in st_norm:
                    return True, f"Matched section '{sec.title}' (ID: {sec.id})"

        # 2. Match by tag (accent and case-insensitive)
        if target.tag:
            clean_tag = _normalize_text(target.tag.replace("{", "").replace("}", ""))
            for t in state.tags_present:
                clean_t = _normalize_text(t.replace("{", "").replace("}", ""))
                if clean_tag == clean_t or clean_tag in clean_t or clean_t in clean_tag:
                    return True, f"Matched document placeholder tag '{{{{{t}}}}}'"

        # 3. Match by cell range (for spreadsheets)
        if target.cell_range and state.kind == "spreadsheet":
            return True, f"Targeted spreadsheet cell range '{target.cell_range}'"

        # 4. Fallback if document is empty / initial state
        if not state.sections and not state.tags_present and not state.tables_summary:
            return True, "Document is currently blank; appending to root."

        # Target specified but not found
        identifiers = [f"section: {target.section_title}"] if target.section_title else []
        if target.tag:
            identifiers.append(f"tag: {target.tag}")
        if target.anchor_text:
            identifiers.append(f"anchor: '{target.anchor_text}'")

        target_desc = ", ".join(identifiers) or "Unknown target locator"
        return False, f"Target not found in document: {target_desc}"

    @classmethod
    def validate(
        cls,
        op: DocumentOperation,
        current_state: CanonicalDocumentState,
        available_asset_ids: Optional[List[str]] = None,
    ) -> Tuple[bool, str]:
        """
        Validate operation against current document state.
        Returns (is_valid, validation_message).
        """
        if isinstance(op, InsertImageOperation):
            # Check target exists
            found, target_msg = cls.resolve_target(op.target, current_state)
            if not found:
                return False, f"Invalid target for image insertion: {target_msg}"

            # Check asset
            if not op.asset.asset_id and not op.asset.url:
                return False, "Image operation missing both asset_id and url."

            if available_asset_ids is not None and op.asset.asset_id:
                if op.asset.asset_id not in available_asset_ids:
                    # Permissive check if it is a local file or data uri
                    if not (op.asset.url and (op.asset.url.startswith("http") or op.asset.url.startswith("data:"))):
                        return False, f"Asset ID '{op.asset.asset_id}' is not in available assets list."

            return True, f"InsertImage validated successfully. {target_msg}"

        elif isinstance(op, InsertTextOperation):
            if not op.content or not op.content.strip():
                return False, "Cannot insert empty text content."
            found, target_msg = cls.resolve_target(op.target, current_state)
            if not found:
                return False, f"Invalid target for text insertion: {target_msg}"
            return True, f"InsertText validated successfully. {target_msg}"

        elif isinstance(op, ReplaceContentOperation):
            found, target_msg = cls.resolve_target(op.target, current_state)
            if not found:
                return False, f"Invalid target for content replacement: {target_msg}"
            return True, f"ReplaceContent validated successfully. {target_msg}"

        elif isinstance(op, UpdateTableOperation):
            if current_state.kind == "spreadsheet":
                return True, "Spreadsheet table update validated."
            if not current_state.tables_summary and not op.target.section_title:
                return False, "Document contains no tables to update and no section specified."
            return True, "UpdateTable validated successfully."

        elif isinstance(op, CreateTableOperation):
            if not op.headers:
                return False, "Cannot create table without headers."
            found, target_msg = cls.resolve_target(op.target, current_state)
            if not found:
                return False, f"Invalid target for table creation: {target_msg}"
            return True, f"CreateTable validated successfully. {target_msg}"

        elif isinstance(op, DeleteContentOperation):
            found, target_msg = cls.resolve_target(op.target, current_state)
            if not found:
                return False, f"Invalid target for deletion: {target_msg}"
            return True, f"DeleteContent validated successfully. {target_msg}"

        # Default for read operations (inspect_document, find_section, find_text)
        return True, f"Operation '{op.operation}' validated."
