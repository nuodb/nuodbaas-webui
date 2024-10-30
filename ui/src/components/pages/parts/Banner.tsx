// (C) Copyright 2024 Dassault Systemes SE.  All Rights Reserved.

import Auth from "../../../utils/auth";
import { useNavigate } from 'react-router-dom';
import { withTranslation } from "react-i18next";

import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import MenuIcon from '@mui/icons-material/Menu';
import Container from '@mui/material/Container';
import Avatar from '@mui/material/Avatar';
import Tooltip from '@mui/material/Tooltip';
import { SchemaType } from "../../../utils/types";
import Menu from "../../controls/Menu";

function ResponsiveAppBar(resources: string[], t: any) {
  const navigate = useNavigate();

  return (
    <AppBar data-testid={resources.length > 0 ? "banner-done" : ""}
      position="static">
      <Container maxWidth="xl">
        <Toolbar disableGutters>
          <Typography
            variant="h6"
            noWrap
            component="a"
            href="#app-bar-with-responsive-menu"
            sx={{
              mr: 2,
              display: { xs: 'none', md: 'flex' },
              fontFamily: 'monospace',
              fontWeight: 700,
              letterSpacing: '.3rem',
              color: 'inherit',
              textDecoration: 'none',
            }}
            onClick={() => navigate("/")}
          >
            NuoDB
          </Typography>

          <Box sx={{ flexGrow: 1, display: { xs: 'flex', md: 'none' } }}>
            <Menu
              items={resources.map((resource: string, index: number) => {
                return {
                  "data-testid": "menu-label-" + resource,
                  id: "menu-label-" + resource,
                  label: t("resource.label." + resource, resource),
                  onClick: () => navigate("/ui/resource/list/" + resource)
                };
              })}
            >
              <IconButton
                size="large"
                aria-label="account of current user"
                aria-controls="menu-appbar"
                aria-haspopup="true"
                color="inherit"
              >
                <MenuIcon data-testid="menu-appbar" />
              </IconButton>
            </Menu>
          </Box>
          <Typography
            variant="h5"
            noWrap
            component="a"
            href="#app-bar-with-responsive-menu"
            sx={{
              mr: 2,
              display: { xs: 'flex', md: 'none' },
              flexGrow: 1,
              fontFamily: 'monospace',
              fontWeight: 700,
              letterSpacing: '.3rem',
              color: 'inherit',
              textDecoration: 'none',
            }}
          >
            NuoDB
          </Typography>
          <Box sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' } }}>
            <Menu
              className="NuoBannerMenu"
              items={resources.map((resource: string, index: number) => {
                return {
                  id: "menu-button-" + resource,
                  className: "NuoBannerItem",
                  label: t("resource.label." + resource, resource),
                  onClick: () => {
                  navigate("/ui/resource/list/" + resource);
                  }
                }
              })}
            />
          </Box>

          <Box sx={{ flexGrow: 0 }}>
            <Menu
              align="right"
              items={[
                {
                  label: t("button.settings"),
                  id: "settings",
                  onClick: () => {
                    navigate("/ui/settings");
                  }
                },
                {
                  label: t("button.logout"),
                  id: "logout",
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
            </Menu>
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
}

interface Props {
  schema: SchemaType,
  t: any
}

function Banner({ schema, t }: Props) {

  if (!schema) {
    return null;
  }

  let resources: string[] = Object.keys(schema).filter(path => !path.includes("{") && schema[path]["get"] && ("x-ui" in schema[path]["get"])).map(path => {
    while (path.startsWith("/")) {
      path = path.substring(1);
    }
    return path;
  });

  return ResponsiveAppBar(resources, t);
}

export default withTranslation()(Banner);