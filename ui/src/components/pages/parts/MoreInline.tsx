// (C) Copyright 2026 Dassault Systemes SE.  All Rights Reserved.

import React, { useState, useRef, useLayoutEffect, ReactNode } from "react";

type MoreInlineProps = {
  value: string;
  t: any;
};

export default function MoreInline({ value, t }: MoreInlineProps) {
  const [expanded, setExpanded] = useState<boolean>(false);

  let shortValue = String(value);
  if (shortValue.indexOf("\n") !== -1) {
    shortValue = shortValue.substring(0, shortValue.indexOf("\n"));
  }
  if (shortValue.length > 80) {
    shortValue = shortValue.substring(0, 80);
  }
  if (shortValue === value || expanded) {
    return value;
  }

  return (
    <>
      {shortValue}
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
