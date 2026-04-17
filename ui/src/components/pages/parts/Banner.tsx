// (C) Copyright 2024-2026 Dassault Systemes SE.  All Rights Reserved.

import Auth from "../../../utils/auth";
import { useNavigate } from 'react-router-dom';
import { withTranslation } from "react-i18next";

import IconButton from '@mui/material/IconButton';
import Avatar from '@mui/material/Avatar';
import Tooltip from '@mui/material/Tooltip';
import { PageProps, SchemaType } from "../../../utils/types";
import Menu from "../../controls/Menu";
import { Rest } from "./Rest";
import Button from "../../controls/Button";
import MenuIcon from '@mui/icons-material/Menu';
import { useState } from "react";
import LeftMenu from "./LeftMenu";
import PublicIcon from '@mui/icons-material/Public';
import CheckIcon from '@mui/icons-material/Check';
import EditIcon from '@mui/icons-material/Edit';

interface Props extends PageProps {
  schema: SchemaType,
  isRecording: boolean,
  t: any
}

function Recording({ isRecording, t }: Props) {
  const navigate = useNavigate();
  if (!isRecording) {
    return null;
  }
  return isRecording && <div className="NuoRecordingBanner">{t("dialog.automation.recordingInProgress")}
    <Button data-testid="btnStopRecording" variant="text" onClick={() => {
      Rest.setIsRecording(false);
      navigate("/ui/automation");
    }}>{t("dialog.automation.stopRecording")}</Button>
  </div>;
}

function Banner(props: Props) {
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const { schema, t } = props;
  const navigate = useNavigate();
  if (!schema) {
    return null;
  }

  return <div className="NuoColumn">
    <Recording {...props} />
    <div className="NuoBanner">
      <div className="NuoMenuIcon NuoForMobile">
        <MenuIcon onClick={() => {
          setShowMobileMenu(!showMobileMenu);
        }} />
      </div>
      <div className="NuoForDesktop">
      </div>
      <div className="NuoRowReverse">
        <Menu data-testid="user-menu"
          align="right"
          items={[
            {
              label: t("button.settings"),
              id: "settings",
              "data-testid": "settings",
              onClick: () => {
                navigate("/ui/settings");
                return true;
              }
            },
            {
              label: t("button.automation"),
              id: "automation",
              "data-testid": "automation",
              onClick: () => {
                navigate("/ui/automation");
                return true;
              }
            },
            {
              label: t("button.logout"),
              id: "logout",
              "data-testid": "logout",
              onClick: () => {
                Auth.logout();
                window.location.href = "/ui";
                return true;
              }
            }
          ]}
        >
          <Tooltip title={t("hint.open.settings")}>
            <IconButton sx={{ p: 0 }}>
              <Avatar>{Auth.getAvatarText()}</Avatar>
            </IconButton>
          </Tooltip>
        </Menu>
        {localStorage.getItem("regions") && <Menu data-testid="region.menu"
          align="right"
          items={[
            {
              label: t("form.editRegionSettings.label.defaultRegion"),
              icon: !Auth.getRegions().find(region => region.active) ? <CheckIcon /> : undefined,
              id: "region.default",
              "data-testid": "region.default",
              onClick: () => {
                Auth.setRegions(Auth.getRegions().map((region) => ({ ...region, active: false })));
                window.location.reload();
                return true;
              }
            },
            ...Auth.getRegions().map((region, index) => ({
              label: region.name,
              icon: region.active ? <CheckIcon /> : undefined,
              id: region.name,
              "data-testid": region.name,
              onClick: () => {
                Auth.setRegions(Auth.getRegions().map((region, idx) => ({ ...region, active: idx === index })));
                window.location.reload();
                return true;
              }
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
              }
            }
          ]}
        >
          <Tooltip title={t("hint.regionSelector")}>
            <IconButton>
              <PublicIcon fontSize="large" />
            </IconButton>
          </Tooltip>
        </Menu>}
      </div>
    </div>
    {showMobileMenu && <div><div
      style={{
        position: "fixed",
        right: 0,
        left: 0,
        top: 0,
        bottom: 0,
        backgroundColor: "transparent",
        zIndex: 101
      }}
      className="NuoMenuToggle"
      onClick={() => { setShowMobileMenu(false) }}></div>
      <LeftMenu className="NuoLeftMenu NuoLeftMenuPopup NuoForMobile" {...props} onSelection={() => {
      setShowMobileMenu(false);
      }} /></div>}
  </div>;
}

export default withTranslation()(Banner);