// (C) Copyright 2024-2025 Dassault Systemes SE.  All Rights Reserved.

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
      </Menu></div>
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