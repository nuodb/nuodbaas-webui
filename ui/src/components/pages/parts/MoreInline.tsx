// (C) Copyright 2026 Dassault Systemes SE.  All Rights Reserved.

import React, { useState } from "react";
import { TFunction } from "i18next";

type MoreInlineProps = {
  value: string;
  t: TFunction;
};

export default function MoreInline({ value, t }: MoreInlineProps) {
  const [expanded, setExpanded] = useState<boolean>(false);

  if (!value) {
    return value;
  }

  let strValue = String(value);
  if (strValue.indexOf("\n") !== -1) {
    strValue = strValue.substring(0, strValue.indexOf("\n"));
  }
  if (strValue.length > 80) {
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
        onClick={() => {
          setExpanded(true);
        }}
      >
        {t("text.more")}
      </div>
    </>
  );
}
