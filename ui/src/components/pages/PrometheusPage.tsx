/* (C) Copyright 2024-2026 Dassault Systemes SE.  All Rights Reserved. */

import axios from "axios";
import { useEffect, useState } from "react";
import { ObjectTree } from "../../utils/ObjectTree";

// Material‑UI imports (already a dependency of the project)
import { TextField, Button, Stack, Box, Typography } from "@mui/material";

export default function PrometheusPage() {
    // ---- state --------------------------------------------------------------
    const [query, setQuery] = useState<string>("");
    const [time, setTime] = useState<string>("");
    const [timeout, setTimeout] = useState<string>("");
    const [limit, setLimit] = useState<string>("");
    const [lookbackDelta, setLookbackDelta] = useState<string>("");
    const [stats, setStats] = useState<string>("");
    const [result, setResult] = useState<any>(undefined);

    // ---- side‑effects --------------------------------------------------------
    useEffect(() => {
      // (no side‑effects needed at mount for now)
  }, []);

    // ---- helper -------------------------------------------------------------
    const isSearchDisabled = query.trim() === ""; // simple validation

    // ---- render --------------------------------------------------------------
    return (
        <Box sx={{ p: 2 }}>
            <Typography variant="h5" gutterBottom>
                Prometheus
            </Typography>

            {/* Form fields – vertical stack with consistent spacing */}
            <Stack spacing={2} maxWidth={600} sx={{ mb: 3 }}>
                <TextField
                    label="Query"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    required
                    fullWidth
                />
                <TextField
                    label="Time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    placeholder="e.g. 2024-03-25T12:00:00Z"
                    fullWidth
                />
                <TextField
                    label="Timeout"
                    value={timeout}
                    onChange={(e) => setTimeout(e.target.value)}
                    placeholder="e.g. 30s"
                    fullWidth
                />
                <TextField
                    label="Limit"
                    value={limit}
                    onChange={(e) => setLimit(e.target.value)}
                    placeholder="e.g. 100"
                    fullWidth
                />
                <TextField
                    label="Lookback Delta"
                    value={lookbackDelta}
                    onChange={(e) => setLookbackDelta(e.target.value)}
                    placeholder="e.g. 5m"
                    fullWidth
                />
                <TextField
                    label="Stats"
                    value={stats}
                    onChange={(e) => setStats(e.target.value)}
                    placeholder="e.g. sum"
                    fullWidth
                />

                {/* Search button – disabled when query is empty */}
                <Button
                    variant="contained"
                    color="primary"
                    disabled={isSearchDisabled}
                    onClick={async () => {
                        const response = await axios.get(
                            "/prometheus/api/v1/query" +
                            "?query=" + encodeURIComponent(query) +
                            "&time=" + encodeURIComponent(time) +
                            "&timeout=" + encodeURIComponent(timeout) +
                            "&limit=" + encodeURIComponent(limit) +
                            "&lookback_delta=" + encodeURIComponent(lookbackDelta) +
                            "&stats=" + encodeURIComponent(stats)
                        );
                        setResult(response.data);
                  }}
              >
                  Search
              </Button>
          </Stack>

          {/* Render the raw result as a collapsible tree */}
          <ObjectTree obj={result} />
      </Box>
  );
}
