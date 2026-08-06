// (C) Copyright 2024-2026 Dassault Systemes SE.  All Rights Reserved.

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getSchema } from "../../../utils/schema";
import { TempAny } from "../../../utils/types";

export default function Schema({ setSchema }: TempAny) {
  const navigate = useNavigate();

  useEffect(() => {
    getSchema().then((schema) => {
      if (schema) {
        setSchema(schema);
      }
    });
  }, [setSchema, navigate]);

  return null;
}
