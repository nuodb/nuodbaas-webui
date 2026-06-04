// (C) Copyright 2026 Dassault Systemes SE.  All Rights Reserved.

import React, { useState, useRef, useLayoutEffect, ReactNode } from "react";

type MoreInlineProps = {
  value: string;
  t: any;
};

export default function MoreInline({ value, t }: MoreInlineProps) {
  const [expanded, setExpanded] = useState<boolean>(false);

  if (!value) {
    return value;
  }

  let strValue = String(value);
  let moreValue = "";
  if (strValue.indexOf("\n") !== -1) {
    moreValue = strValue.substring(strValue.indexOf("\n"));
    strValue = strValue.substring(0, strValue.indexOf("\n"));
  }
  if (strValue.length > 80) {
    moreValue = strValue.substring(80) + moreValue;
    strValue = strValue.substring(0, 80);
  }
  if (expanded) {
    return (
      <span style={{ whiteSpace: "pre-wrap" }}>
        {value.replace(/\n/g, "\r\n")}
      </span>
    );
  }
  return (
    <>
      {!expanded && strValue}
      <div
        className="NuoMoreValue"
        onClick={(element: React.MouseEvent<HTMLDivElement>) => {
          setExpanded(true);
        }}
      >
        {t("text.more")}
      </div>
    </>
  );
}
