/* (C) Copyright 2024-2026 Dassault Systemes SE.  All Rights Reserved. */

import {useNavigate} from "react-router-dom";

export default function MonitoringPage() {
    const navigate = useNavigate();

    return <div className="NuoColumn">
        <button className="NuoFieldContainer" onClick={()=>{
            navigate("/ui/monitoring/jaeger")
        }}>Perform Jaeger queries</button>
        <button className="NuoFieldContainer" onClick={()=>{
            navigate("/ui/monitoring/prometheus")
        }}>perform Prometheus queries</button>
        <button className="NuoFieldContainer" onClick={()=>{
            window.location.href = "/prometheus/query";
        }}>Prometheus Query</button>
    </div>
}