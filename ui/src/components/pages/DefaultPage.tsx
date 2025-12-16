// (C) Copyright 2025 Dassault Systemes SE.  All Rights Reserved.

import { useEffect } from "react";
import { getSchema } from "../../utils/schema";
import { useNavigate } from "react-router-dom";
import Auth from "../../utils/auth";

/**
 * Redirects to the best initial page based on accessible resources
 */
export default function DefaultPage() {
    const navigate = useNavigate();
    useEffect(()=>{
        getSchema().then(schema => {
            const homePage = getHomeUrl(schema);
            console.log("HOMEPAGE", homePage);
            navigate(homePage);
        });
    })

  function getHomeUrl(schema:any) {
    const credentials = Auth.getCredentials();
    const resources = ["/databases", "/projects", "/users", "/backups", "/backuppolicies"];
    for (let i = 0; i < resources.length; i++) {
      const resource = resources[i];
      if (schema[resource] && schema[resource]["get"]) {
        if (credentials) {
          return "/ui/resource/list/" + resource + "/" + encodeURIComponent(credentials.username.split("/")[0]);
        }
        else {
          return "/ui/resource/list/" + resource;
        }
      }
    }
    const firstSchemaResource = Object.keys(schema).find(resource => schema[resource] && schema[resource]["get"]);
    if(firstSchemaResource) {
      return "/ui/resource/list" + firstSchemaResource;
    }
    else {
      return "/ui/notfound";
    }
  }
  return "Loading...";
}
