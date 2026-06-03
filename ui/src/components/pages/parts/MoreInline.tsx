// (C) Copyright 2026 Dassault Systemes SE.  All Rights Reserved.

import React, { useState, useRef, useLayoutEffect, ReactNode } from "react";
import { TFunction } from "i18next";

type MoreInlineProps = {
  value: string;
  t: TFunction;
};

export default function MoreInline({ value, t }: MoreInlineProps) {
  const [expanded, setExpanded] = useState<boolean>(false);

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
  return (
    <>
      {strValue}
      <div
        className="NuoMoreValue"
        onClick={(element: React.MouseEvent<HTMLDivElement>) => {
          setExpanded(true);
        }}
      >
        {expanded ? value : <> {t("text.more")}</>}
      </div>
    </>
  );
}
