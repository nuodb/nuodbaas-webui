// (C) Copyright 2024 Dassault Systemes SE.  All Rights Reserved.

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getSchema } from "../../../utils/schema";
import { TempAny } from "../../../utils/types";

export default function Schema({ setSchema }: TempAny) {
  const navigate = useNavigate();

  useEffect(() => {
    getSchema().then(schema => {
      if (!schema && window.location.pathname !== "/ui/error") {
        navigate("/ui/error?msg=" + encodeURIComponent("Unable to get Schema. Retry at a later time."));
      }
      setSchema(schema);
    });
  }, [setSchema, navigate])

  return null;
}