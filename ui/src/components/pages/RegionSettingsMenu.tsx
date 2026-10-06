// (C) Copyright 2026 Dassault Systemes SE.  All Rights Reserved.

import { withTranslation } from "react-i18next";
import { TFunction } from "i18next";
import Auth from "../../utils/auth";
import { useNavigate } from "react-router-dom";
import { Tooltip } from "@mui/material";
import Menu from "../controls/Menu";
import PublicIcon from "@mui/icons-material/Public";
import CheckIcon from "@mui/icons-material/Check";
import EditIcon from "@mui/icons-material/Edit";
import Button from "../controls/Button";
import { useEffect, useState } from "react";
import axios from "axios";
import { RegionSetting } from "../../utils/types";

type ConfigType = {
  multiInstanceUrl?: string;
};

function RegionSettingsMenu({
  t,
}: {
    t: TFunction;
}) {
  const navigate = useNavigate();
  const [config, setConfig] = useState<ConfigType>({});

  useEffect(() => {
    axios.get("/ui/config.json").then((res) => {
      if (res) {
        setConfig(res.data);
      }
    });
  }, []);

  if (!config || !config.multiInstanceUrl) {
    return null;
  }

  const currentRegion: RegionSetting = Auth.getRegions()[0];

  const items = [
    ...[...Auth.getRegions()].map((region, index) => ({
      label: region.name,
      icon: index === 0 ? (
        <CheckIcon />
      ) : undefined,
      id: region.name,
      "data-testid": region.name,
      onClick: async () => {
        if (region.uiUrl) {
          window.location.href = region.uiUrl + "?region=" + region.id;
        } else {
          window.location.reload();
        }
        return true;
      },
    })),
    {
      label: t("form.editRegionSettings.label.editRegions"),
      icon: <EditIcon />,
      id: "edit.region.selector",
      "data-testid": "edit.region.selector",
      hasSeparator: true,
      onClick: async () => {
        navigate("/ui/region-selector-settings");
        return true;
      },
    },
  ];

  return (
    <Menu data-testid="region.menu" align="right" items={items}>
      <Tooltip title={t("hint.regionSelector")}>
        <Button variant="text" onClick={() => {}}>
          <PublicIcon fontSize="large" />
          {currentRegion.name || window.location.host}
        </Button>
      </Tooltip>
    </Menu>
  );
}

export default withTranslation()(RegionSettingsMenu);
