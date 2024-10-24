// (C) Copyright 2024 Dassault Systemes SE.  All Rights Reserved.

import Auth from "../../../utils/auth";
import { useNavigate } from 'react-router-dom';

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

function ResponsiveAppBar(resources: string[]) {
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
                  "data-testid": "menu-label-" + index,
                  id: "menu-label-" + index,
                  label: resource,
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
                  id: "menu-button-" + index,
                  className: "NuoBannerItem",
                  label: resource,
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
                  label: "Settings",
                  id: "settings",
                  onClick: () => {
                    navigate("/ui/settings");
                  }
                },
                {
                  label: "Logout",
                  id: "logout",
                  onClick: () => {
                    Auth.logout();
                    window.location.href = "/ui";
                  }
                }
              ]}
            >
              <Tooltip title="Open settings">
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
  schema: SchemaType
}

export default function Banner({ schema }: Props) {

  if (!schema) {
    return null;
  }

  let resources: string[] = Object.keys(schema).filter(path => !path.includes("{") && schema[path]["get"] && ("x-ui" in schema[path]["get"])).map(path => {
    while (path.startsWith("/")) {
      path = path.substring(1);
    }
    return path;
  });

  return ResponsiveAppBar(resources);
}
