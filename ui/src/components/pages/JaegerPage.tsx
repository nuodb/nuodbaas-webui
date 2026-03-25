/* (C) Copyright 2026 Dassault Systemes SE.  All Rights Reserved. */

import axios from "axios";
import { useEffect, useState } from "react";
import { ObjectTree } from "../../utils/ObjectTree";

// Material‑UI imports (already a dependency of the project)
import {
    Box,
    Button,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    Stack,
    TextField,
    Typography,
} from "@mui/material";

export default function JaegerPage() {
    // ----- state --------------------------------------------------------------
    const now = new Date().getTime();
    const [services, setServices] = useState<string[]>([]);
    const [serviceName, setServiceName] = useState<string>("");
    const [operationName, setOperationName] = useState<string>("");
    const [startTimeMin, setStartTimeMin] = useState<string>(new Date(now - 3600 * 1000).toISOString());
    const [startTimeMax, setStartTimeMax] = useState<string>(new Date(now).toISOString());
    const [durationMin, setDurationMin] = useState<string>("0ms");
    const [durationMax, setDurationMax] = useState<string>("1000s");
    const [searchDepth, setSearchDepth] = useState<string>("50");
    const [rawTraces, setRawTraces] = useState<"true" | "false">("false");
    const [result, setResult] = useState<any>(undefined);

    // ----- load services -------------------------------------------------------
    useEffect(() => {
        axios.get("/jaeger/api/v3/services").then((response) => {
            if (response.data?.services) {
                setServices(response.data.services);
                if (response.data.services.length > 0) {
                    setServiceName(response.data.services[0]);
                }
            }
        });
    }, []);

    // ----- helper -------------------------------------------------------------
    const isSearchDisabled = serviceName.trim() === "";

    // ----- render --------------------------------------------------------------
    return (
        <Box sx={{ p: 2 }}>
            <Typography variant="h5" gutterBottom>
                Jaeger
            </Typography>

            <Stack spacing={2} maxWidth={700}>
                {/* Service selector */}
                <FormControl fullWidth>
                    <InputLabel id="service-select-label">Service Name</InputLabel>
                    <Select
                        labelId="service-select-label"
                        value={serviceName}
                        label="Service Name"
                        onChange={(e) => setServiceName(e.target.value as string)}
                    >
                        <MenuItem value="">
                            <em>--- Select ---</em>
                        </MenuItem>
                        {services.map((svc) => (
                            <MenuItem key={svc} value={svc}>
                                {svc}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                {/* Operation name */}
                <TextField
                    label="Operation Name"
                    value={operationName}
                    onChange={(e) => setOperationName(e.target.value)}
                    fullWidth
                />

                {/* Start time range */}
                <TextField
                    label="Start Time Min"
                    value={startTimeMin}
                    onChange={(e) => setStartTimeMin(e.target.value)}
                    placeholder="e.g. 2024-03-25T12:00:00Z"
                    fullWidth
                />
                <TextField
                    label="Start Time Max"
                    value={startTimeMax}
                    onChange={(e) => setStartTimeMax(e.target.value)}
                    placeholder="e.g. 2024-03-26T12:00:00Z"
                    fullWidth
                />

                {/* Duration range */}
                <TextField
                    label="Duration Min"
                    value={durationMin}
                    onChange={(e) => setDurationMin(e.target.value)}
                    placeholder="e.g. 0ms"
                    fullWidth
                />
                <TextField
                    label="Duration Max"
                    value={durationMax}
                    onChange={(e) => setDurationMax(e.target.value)}
                    placeholder="e.g. 1000s"
                    fullWidth
                />

                {/* Search depth */}
                <TextField
                    label="Search Depth"
                    value={searchDepth}
                    onChange={(e) => setSearchDepth(e.target.value.replace(/\D/g, ""))}
                    placeholder="numeric value"
                    fullWidth
                />

                {/* Raw traces toggle */}
                <FormControl fullWidth>
                    <InputLabel id="raw-traces-label">Raw Traces</InputLabel>
                    <Select
                        labelId="raw-traces-label"
                        value={rawTraces}
                        label="Raw Traces"
                        onChange={(e) => setRawTraces(e.target.value)}
                    >
                        <MenuItem value="false">false</MenuItem>
                        <MenuItem value="true">true</MenuItem>
                    </Select>
                </FormControl>

                {/* Search button */}
                <Button
                    variant="contained"
                    color="primary"
                    disabled={isSearchDisabled}
                    onClick={async () => {
                        const response = await axios.get(
                            "/jaeger/api/v3/traces" +
                            "?query.service_name=" + encodeURIComponent(serviceName) +
                            "&query.operation_name=" + encodeURIComponent(operationName) +
                            "&query.start_time_min=" + encodeURIComponent(startTimeMin) +
                            "&query.start_time_max=" + encodeURIComponent(startTimeMax) +
                            "&query.duration_min=" + encodeURIComponent(durationMin) +
                            "&query.duration_max=" + encodeURIComponent(durationMax) +
                            "&query.search_depth=" + encodeURIComponent(searchDepth) +
                            "&query.raw_traces=" + encodeURIComponent(rawTraces)
                        );
                        console.log("response", response);
                        setResult(response.data);
                    }}
                >
                    Search Traces
                </Button>
            </Stack>

            {/* Render the raw JSON result as a collapsible tree */}
            <ObjectTree obj={result} />
        </Box>
    );
}