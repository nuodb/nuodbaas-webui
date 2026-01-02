// (C) Copyright 2024-2026 Dassault Systemes SE.  All Rights Reserved.

import { MetricType } from "web-vitals";

const reportWebVitals = (onPerfEntry?: (metric: MetricType) => void) => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    import("web-vitals").then(({ onCLS, onINP, onFCP, onLCP, onTTFB }) =>
{
       onCLS(onPerfEntry);
       onINP(onPerfEntry);
       onFCP(onPerfEntry);
       onLCP(onPerfEntry);
       onTTFB(onPerfEntry);
     });
   }
 };

 export default reportWebVitals;