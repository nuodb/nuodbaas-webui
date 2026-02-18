import { ReactNode } from "react";

export type SortIconProps = {
    sort: "none"|"asc"|"desc";
    setSort: (sort: "asc"|"desc") => void;
}

export default function SortIcon({sort, setSort}: SortIconProps) : ReactNode {
    return (
        <div className="NuoRow" style={{alignItems: "center"}} onClick={(event)=>{
            if(sort === "none") {
                const rect = event.currentTarget.getBoundingClientRect();
                const isBottomHalf = (event.clientY - rect.top) > rect.height / 2;
                setSort(isBottomHalf ? "desc" : "asc");
            }
            else {
                setSort(sort === "asc" ? "desc" : "asc");
            }
        }}>
            <svg focusable="true" viewBox="0 0 24 24" style={{width: "20px", height: "20px"}}>
                <path d="M7.41 10.41 12 5.83l4.59 4.58L18 9l-6-6l-6 6Z" opacity={sort === "asc" ? 1 : 0.3}></path>
                <path d="M7.41 13.59 12 18.17l4.59-4.58L18 15l-6 6l-6-6Z" opacity={sort === "desc" ? 1 : 0.3}></path>
            </svg>
        </div>
    )
}
