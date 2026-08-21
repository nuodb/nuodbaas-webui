// (C) Copyright 2026 Dassault Systemes SE.  All Rights Reserved.

// Concatenates strings during runtime - preventing Webpack from optimizing the code during compile time.
// This is typically used when passing in constant strings which are being replaced during runtime.
export function runtimeConcat(...values: string[]) {
  if (Date.now() > 0) {
    return values.join("");
  }
  return "never occurs";
}
