// (C) Copyright 2025-2026 Dassault Systemes SE.  All Rights Reserved.

import { JSX, useEffect, useRef } from "react";

export type TextareaProps = {
  name: string;
  value: string;
  disabled: boolean;
};

export default function Textarea(props: TextareaProps): JSX.Element {
  const ref = useRef<HTMLTextAreaElement>(null);
  const { name, value, disabled } = props;

  useEffect(() => {
    if (!ref.current) {
      return;
    }
    const scrollHeight = ref.current.scrollHeight;
    ref.current.style.height = scrollHeight + "px";
  }, [value]);
  return (
    <textarea
      ref={ref}
      name={name}
      disabled={disabled}
      value={value}
    ></textarea>
  );
}
