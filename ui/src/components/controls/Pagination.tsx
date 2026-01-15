// (C) Copyright 2024-2025 Dassault Systemes SE.  All Rights Reserved.

import { JSX } from 'react';
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

    return <MuiStack spacing={2} style={{ alignItems: "center", marginTop: "15px", position: "sticky", left: "0" }}>
        <MuiPagination count={count} page={page} onChange={(event, page) => {
            props.setPage(page);
        }} />
    </MuiStack>
}

export function pageFilter<type>(data: type[], page: number, pageSize: number): type[] {
    return data?.filter((_, index) => index >= (page - 1) * pageSize && index < page * pageSize);
}