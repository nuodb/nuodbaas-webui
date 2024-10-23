import React, { useState } from "react";
import {
    DndContext,
    DragOverlay,
    KeyboardSensor,
    MouseSensor,
    TouchSensor,
    useSensor,
    useSensors,
} from "@dnd-kit/core";

import { sortableKeyboardCoordinates, useSortable, rectSortingStrategy, SortableContext, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const SortableItem = ({ id }: any) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            style={style}
            ref={setNodeRef}
            {...attributes}
            {...listeners}
        >
            <div style={{ cursor: "grab" }} className="item">
                {id}
            </div>

        </div>
    );
};

function TmpResource() {
    const [items, setItems] = useState<any>([<div>"A"</div>, <div>"B"</div>, <div>"C"</div>]);
    const [activeItem, setActiveItem] = useState(null);

    const sensors = useSensors(
        useSensor(MouseSensor),
        useSensor(TouchSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = ({ active, over }: any) => {
        if (over && active.id !== over.id) {
            const activeIndex = active.data.current.sortable.index;
            const overIndex = over.data.current.sortable.index;

            setItems((items: any) => {
                return arrayMove(
                    items,
                    activeIndex,
                    overIndex
                );
            });
        }

        setActiveItem(null);
    };

    return (
        <DndContext
            sensors={sensors}
            onDragStart={({ active }: any) => setActiveItem(active.id)}
            onDragCancel={() => setActiveItem(null)}
            onDragEnd={handleDragEnd}
        >
            <div className="container">
                <SortableContext items={items} strategy={rectSortingStrategy}>
                    <div className="droppable">
                        {items.map((item: any, index: number) => (
                            <SortableItem key={index} id={item} />
                        ))}
                    </div>
                </SortableContext>
            </div>
            <DragOverlay>{activeItem && <div style={{ cursor: "grabbing" }} className="item">
                {activeItem}
            </div>}</DragOverlay>
        </DndContext>
    );
}

export default TmpResource;
