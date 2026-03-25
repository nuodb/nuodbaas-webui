/* (C) Copyright 2024-2026 Dassault Systemes SE.  All Rights Reserved. */

/**
 * Utility component that renders any JavaScript value as an expandable tree.
 * It is used throughout the UI to visualize configuration objects, API responses,
 * and other nested structures.
 */

import RemoveIcon from '@mui/icons-material/Remove'; // Collapse icon
import AddIcon from '@mui/icons-material/Add';       // Expand icon
import { ReactNode, useState } from 'react';

/**
 * Simple wrapper that adds an indentation level.
 *
 * @param children - The content to render inside the indented block.
 */
function Indent({ children }: { children: ReactNode }) {
    return (
        <div className="NuoRow">
            {/* Placeholder icon – the actual expand/collapse icon is rendered by the parent component */}
            <div><AddIcon style={{ color: "white" }} /></div>
            <div>{children}</div>
        </div>
    );
}

/**
 * Collapsible section for a nested object.
 *
 * @param summary - Text shown on the header line (usually the object's key).
 * @param obj     - The nested object to display when expanded.
 */
function ObjectSection({ summary, obj }: { summary: string; obj: any }) {
    const [expanded, setExpanded] = useState<boolean>(false);

    return (
        <Indent>
            {/* Clicking the header toggles the expanded state */}
            <div
                onClick={() => {
                    setExpanded(!expanded);
                }}
            >
                {expanded ? <RemoveIcon /> : <AddIcon />} {summary}
            </div>

            {/* Render the nested tree only when expanded */}
            {expanded && <ObjectTree obj={obj} />}
        </Indent>
    );
}

/**
 * Recursively renders any JavaScript value as a tree object.
 *
 * - Primitive values are displayed as plain text.
 * - Objects are traversed; each key becomes either a leaf node or a collapsible section.
 *
 * @param obj - The value to visualize. `null`/`undefined` results in no output.
 */
export function ObjectTree({ obj }: { obj: any }) {
    // Guard against null/undefined – nothing to render.
    if (!obj) {
        return null;
    }

    // If the value is an object (including arrays), iterate over its keys.
    if (typeof obj === "object") {
        return Object.keys(obj).map((key) => {
            // Nested objects become expandable sections.
            if (typeof obj[key] === "object") {
                return (
                    <ObjectSection key={key} summary={key} obj={obj[key]} />
                );
            } else {
                // Primitive leaf nodes are rendered as “key: value”.
                return (
                    <Indent key={key}>
                        <div className="NuoRow">
                            {key}: {String(obj[key])}
                        </div>
                </Indent>
            );
            }
        });
    }

    // For non‑object primitives (string, number, boolean, etc.) just output the value.
    return String(obj);
}
