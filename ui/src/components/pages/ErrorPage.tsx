// (C) Copyright 2024 Dassault Systemes SE.  All Rights Reserved.

import React from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import Button from '@mui/material/Button'

export default function ErrorPage() {
    const navigate = useNavigate();
    let [searchParams] = useSearchParams();
    return (
        <React.Fragment>
            <h1>Error occurred</h1>
            <div>{searchParams.get("msg") || "Unknown Error occurred"}</div>
            <Button variant="contained" onClick={()=>{
                navigate("/ui");
            }}>Dismiss</Button>
        </React.Fragment>
    );
}
