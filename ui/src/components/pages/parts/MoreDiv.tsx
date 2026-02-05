// (C) Copyright 2026 Dassault Systemes SE.  All Rights Reserved.

import React, { useState, useRef, useLayoutEffect, ReactNode } from 'react';

type MoreDivProps = {
    children: ReactNode;
    maxHeight: number;
    t: any;
}

export default function MoreDiv({ children, maxHeight, t} : MoreDivProps) {
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const element = contentRef.current;
    if (element) {
        const overflowing = element.scrollHeight > element.clientHeight
      setIsOverflowing(overflowing);
      if(!overflowing) {
        element.style.maxHeight = 'none';
      }
    }
  }, [children, maxHeight]);

  return (
    <div>
      <div
        ref={contentRef}
        style={{
          maxHeight: isExpanded ? 'none' : (String(maxHeight) + "px"),
          overflow: 'hidden',
        }}
      >
        {children}
      </div>
      {isOverflowing && !isExpanded && (
        <button onClick={()=>setIsExpanded(true)} style={{ background: 'none', border: 'none', color: 'blue', cursor: 'pointer', padding: 0 }}>
          {t("text.more")}
        </button>
      )}
    </div>
  );
};