// (C) Copyright 2025-2026 Dassault Systemes SE.  All Rights Reserved.

import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StopIcon from "@mui/icons-material/Stop";
import InfoIcon from "@mui/icons-material/Info";
import StorageIcon from "@mui/icons-material/Storage";
import PasswordIcon from "@mui/icons-material/Password";

export default function Icon({ name }: { name: string | undefined }) {
  if (!name) {
    return <span></span>;
  }

  switch (name) {
    case "Stop":
      return <StopIcon />;
    case "PlayArrow":
      return <PlayArrowIcon />;
    case "Info":
      return <InfoIcon />;
    case "Storage":
      return <StorageIcon />;
    case "Password":
      return <PasswordIcon />;
  }

  return <span className="material-icons">{name}</span>;
}
