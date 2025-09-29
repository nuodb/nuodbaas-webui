// (C) Copyright 2024 Dassault Systemes SE.  All Rights Reserved.

import { JSX } from 'react';
import { isMaterial } from '../../utils/Customizations';
import { Pagination as MuiPagination, Stack as MuiStack } from '@mui/material';

export type PaginationProps = {
    "data-testid"?: string,
    count: number,
    page: number,
    setPage: (page: number) => void
}
export default function Pagination(props: PaginationProps): JSX.Element | null {
    const { count, page, setPage } = props;

    if (count === 0) {
        return null;
    }

    if (isMaterial()) {
        return <MuiStack spacing={2} style={{ alignItems: "center", marginTop: "15px", position: "sticky", left: "0" }}>
            <MuiPagination count={count} page={page} onChange={(event, page) => {
                props.setPage(page);
            }} />
        </MuiStack>
    }
    else {
        return <div className="NuoPagination">
            <div className="NuoPaginationItem NuoPaginationItemFirst" onClick={() => setPage(1)}>&lt;</div>
            {Array(count).fill(1).map((_, index) => {
                let className = "NuoPaginationItem";
                if (page === index + 1) {
                    className += " NuoPaginationItemSelected";
                }
                if (page === 1) {
                    className += " NuoPaginationItemFirst";
                }
                if (page === count) {
                    className += " NuoPaginationItemLast";
                }

                return <div key={index} className={className} onClick={() => {
                    setPage(index + 1)
                }}>{index + 1}</div>
            })}
            <div className="NuoPaginationItem NuoPaginationItemLast" onClick={() => setPage(count)}>&gt;</div>
        </div>;
    }
}