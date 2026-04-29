// (C) Copyright 2026 Dassault Systemes SE.  All Rights Reserved.

import { withTranslation } from "react-i18next";
import Auth from "../../utils/auth";
import { useNavigate } from "react-router-dom";
import { IconButton, Tooltip } from "@mui/material";
import Menu from "../controls/Menu";
import PublicIcon from "@mui/icons-material/Public";
import CheckIcon from "@mui/icons-material/Check";
import EditIcon from "@mui/icons-material/Edit";
import Button from "../controls/Button";

function RegionSettingsMenu({ t }: { t: any }) {
  const navigate = useNavigate();

  if (!localStorage.getItem("regions")) {
    return null;
  }

  const items = [
    {
      label: t("form.editRegionSettings.label.defaultRegion"),
      icon: !Auth.getRegions().find((region) => region.active) ? (
        <CheckIcon />
      ) : undefined,
      id: "region.default",
      "data-testid": "region.default",
      onClick: () => {
        Auth.setRegions(
          Auth.getRegions().map((region) => ({ ...region, active: false })),
        );
        window.location.reload();
        return true;
      },
    },
    ...Auth.getRegions().map((region, index) => ({
      label: region.name,
      icon: region.active ? <CheckIcon /> : undefined,
      id: region.name,
      "data-testid": region.name,
      onClick: () => {
        Auth.setRegions(
          Auth.getRegions().map((region, idx) => ({
            ...region,
            active: idx === index,
          })),
        );
        window.location.reload();
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
          {items.find((item) => item.icon !== undefined)?.label ||
            t("form.editRegionSettings.label.defaultRegion")}
        </Button>
      </Tooltip>
    </Menu>
  );
}

export default withTranslation()(RegionSettingsMenu);
