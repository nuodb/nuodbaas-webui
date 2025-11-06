// (C) Copyright 2025 Dassault Systemes SE.  All Rights Reserved.

import { Navigate, useParams } from "react-router-dom";

type RedirectProps = {
    baseUrl: string;
}

export default function Redirect({baseUrl} : RedirectProps) {
    const path = baseUrl + (baseUrl.endsWith("/") ? "" : "/") + useParams()["*"];
    return <Navigate to={path} />;
}
