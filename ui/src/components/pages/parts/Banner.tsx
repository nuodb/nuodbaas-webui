// (C) Copyright 2024 Dassault Systemes SE.  All Rights Reserved.

import Auth from "../../../utils/auth";
import { useNavigate } from 'react-router-dom';
import { withTranslation } from "react-i18next";

import IconButton from '@mui/material/IconButton';
import Avatar from '@mui/material/Avatar';
import Tooltip from '@mui/material/Tooltip';
import { SchemaType } from "../../../utils/types";
import Menu from "../../controls/Menu";
import { Rest } from "./Rest";
import Button from "../../controls/Button";

interface Props {
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
  const { schema, t } = props;
  const navigate = useNavigate();
  if (!schema) {
    return null;
  }

  return <div className="NuoColumn">
    <Recording {...props} />
    <div className="NuoBanner">
      <img className="NuoLogo" src="/ui/nuodb.png" alt="" />
      <Menu
        align="right"
        items={[
          {
            label: t("button.settings"),
            id: "settings",
            "data-testid": "settings",
            onClick: () => {
              navigate("/ui/settings");
            }
          },
          {
            label: t("button.automation"),
            id: "automation",
            "data-testid": "automation",
            onClick: () => {
              navigate("/ui/automation");
            }
          },
          {
            label: t("button.logout"),
            id: "logout",
            "data-testid": "logout",
            onClick: () => {
              Auth.logout();
              window.location.href = "/ui";
            }
          }
        ]}
      >
        <Tooltip title={t("hint.open.settings")}>
          <IconButton sx={{ p: 0 }}>
            <Avatar>{Auth.getAvatarText()}</Avatar>
          </IconButton>
        </Tooltip>
      </Menu></div></div>;
}

export default withTranslation()(Banner);