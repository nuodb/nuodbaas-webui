/* (C) Copyright 2026 Dassault Systemes SE.  All Rights Reserved. */

/**
 * Utility component that renders any JavaScript value as an expandable tree.
 * When an object contains more than 100 keys, the keys are split into
 * groups of 100. Each group is rendered as an expandable section whose
 * label shows the first and last key of the group, e.g.:
 *   [userId … userId99]
 * This prevents the UI from becoming overwhelmed when very large objects
 * are inspected.
 */

import RemoveIcon from '@mui/icons-material/Remove'; // Collapse icon
import AddIcon from '@mui/icons-material/Add';       // Expand icon
import { ReactNode, useState } from 'react';

/** Helper: split an array into chunks of a given size. */
function chunkArray<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
    }
    return chunks;
}

/**
 * Simple wrapper that adds an indentation level.
 *
 * @param children - The content to render inside the indented block.
 */
function Indent({ children }: { children: ReactNode }) {
    return (
        <div className="NuoRow">
            {/* Placeholder icon – the actual expand/collapse icon is rendered by the parent component */}
            <div><AddIcon style={{ color: "white" }} />{" "}</div>
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
 * Recursively renders any JavaScript value as a tree.
 * - Primitive values are displayed as plain text.
 * - Objects with ≤ 100 keys are rendered key‑by‑key.
 * - Objects with > 100 keys are split into groups of 100 keys.
 *   Each group is shown as an expandable section whose label is
 *   `[firstKey … lastKey]`.
 *
 * @param obj - The value to visualize. `null`/`undefined` results in no output.
 */
export function ObjectTree({ obj }: { obj: any }) {
    // Guard against null/undefined – nothing to render.
    if (!obj) {
        return null;
    }

    // Primitive values – just stringify.
    if (typeof obj !== "object") {
        return String(obj);
    }

    const keys = Object.keys(obj);

    // ---------- CASE 1: ≤ 100 keys – render directly ----------
    if (keys.length <= 100) {
        return keys.map((key) => {
            const value = obj[key];
            if (typeof value === "object" && value !== null) {
                return <ObjectSection key={key} summary={key} obj={value} />;
            }
            // Leaf node
            return (
                <Indent key={key}>
                    <div className="NuoRow">
                        {key}: {String(value)}
                    </div>
                </Indent>
            );
        });
    }

    // ---------- CASE 2: > 100 keys – chunk & group ----------
    const chunks = chunkArray(keys, 100);

    return chunks.map((chunk, idx) => {
        const firstKey = chunk[0];
        const lastKey = chunk[chunk.length - 1];
        const label = `[${firstKey} … ${lastKey}]`;

        // Build a temporary object that only contains the keys of this chunk.
        const chunkObj: Record<string, any> = {};
        chunk.forEach((k) => {
            chunkObj[k] = obj[k];
        });

        return <ObjectSection key={idx} summary={label} obj={chunkObj} />;
    });
}
