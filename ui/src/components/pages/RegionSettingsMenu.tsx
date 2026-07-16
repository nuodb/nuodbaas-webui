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
import { RegionSetting, RegionSettings } from "../../utils/types";

function RegionSettingsMenu({
  t,
  regions,
}: {
  t: TFunction;
  regions: RegionSettings;
}) {
  const navigate = useNavigate();
  const [config, setConfig] = useState<any>({});

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

  const currentRegion: RegionSetting | null =
    Auth.getCurrentRegion() || Auth.findRegionFromCurrentUrl(regions) || null;

  const items = [
    ...[...regions, ...Auth.getRegions()].map((region) => ({
      label: region.name,
      icon: Auth.regionEquals(currentRegion, region) ? (
        <CheckIcon />
      ) : undefined,
      id: region.name,
      "data-testid": region.name,
      onClick: () => {
        if (region.ui) {
          Auth.setCurrentRegion(null);
          window.location.href = region.ui;
        } else {
          Auth.setCurrentRegion(region);
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
      onClick: () => {
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
          {currentRegion?.name}
        </Button>
      </Tooltip>
    </Menu>
  );
}

export default withTranslation()(RegionSettingsMenu);
