// (C) Copyright 2026 Dassault Systemes SE.  All Rights Reserved.

import React, { useState } from "react";

type MoreInlineProps = {
  value: string;
  t: any;
};

export default function MoreInline({ value, t }: MoreInlineProps) {
  const [expanded, setExpanded] = useState<boolean>(false);

  let strValue = String(value);
  if (strValue.indexOf("\n") !== -1) {
    strValue = strValue.substring(0, strValue.indexOf("\n"));
  }
  if (strValue.length > 80) {
    strValue = strValue.substring(0, 80);
  }
  return (
    <>
      {strValue}
      <div
        className="NuoMoreValue"
        onClick={() => {
          setExpanded(true);
        }}
      >
        {expanded ? value : <> {t("text.more")}</>}
      </div>
    </>
  );
}
