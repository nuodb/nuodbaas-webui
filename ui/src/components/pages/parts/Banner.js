import React from "react";
import Auth from "../../../utils/auth";
import { useNavigate } from 'react-router-dom';

import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Menu from '@mui/material/Menu';
import MenuIcon from '@mui/icons-material/Menu';
import Container from '@mui/material/Container';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';

function ResponsiveAppBar(resources) {
    const navigate = useNavigate();

    const [anchorElNav, setAnchorElNav] = React.useState(null);
    const [anchorElUser, setAnchorElUser] = React.useState(null);

    const handleOpenNavMenu = (event) => {
      setAnchorElNav(event.currentTarget);
    };
    const handleOpenUserMenu = (event) => {
      setAnchorElUser(event.currentTarget);
    };

    const handleCloseNavMenu = () => {
      setAnchorElNav(null);
    };

    const handleCloseUserMenu = () => {
      setAnchorElUser(null);
    };

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
              <IconButton
                size="large"
                aria-label="account of current user"
                aria-controls="menu-appbar"
                aria-haspopup="true"
                onClick={handleOpenNavMenu}
                color="inherit"
              >
                <MenuIcon data-testid="menu-appbar" />
              </IconButton>
              <Menu
                id="menu-appbar"
                anchorEl={anchorElNav}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'left',
                }}
                keepMounted
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'left',
                }}
                open={Boolean(anchorElNav)}
                onClose={handleCloseNavMenu}
                sx={{
                  display: { xs: 'block', md: 'none' },
                }}
              >
                {resources.map((resource, index) => {
                    return (
                        <MenuItem key={resource} onClick={() => {
                            handleCloseNavMenu();
                            navigate("/ui/resource/list/" + resource);
                        }}>
                            <Typography textAlign="center"><span data-testid={"menu-label-" + index}>{resource}</span></Typography>
                        </MenuItem>);
                })}
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
              {resources.map((resource, index) => (
                <Button
                data-testid={"menu-button-" + index}
                  key={resource}
                  onClick={()=>{
                    handleCloseNavMenu();
                    navigate("/ui/resource/list/" + resource);
                  }}
                  sx={{ my: 2, color: 'white', display: 'block' }}
                >
                  {resource}
                </Button>
              ))}
            </Box>

            <Box sx={{ flexGrow: 0 }}>
              <Tooltip title="Open settings">
                <IconButton onClick={handleOpenUserMenu} sx={{ p: 0 }}>
                  <Avatar>{Auth.getAvatarText()}</Avatar>
                </IconButton>
              </Tooltip>
              <Menu
                sx={{ mt: '45px' }}
                id="menu-appbar"
                anchorEl={anchorElUser}
                anchorOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                keepMounted
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                open={Boolean(anchorElUser)}
                onClose={handleCloseUserMenu}
              >
                  <MenuItem onClick={() => {
                    handleCloseUserMenu();
                    Auth.logout();
                    window.location.href = "/ui";
                  }}>
                    <Typography textAlign="center">Logout</Typography>
                  </MenuItem>
              </Menu>
            </Box>
          </Toolbar>
        </Container>
      </AppBar>
    );
  }

export default function Banner({ schema }) {

    if(!schema) {
        return null;
    }

    let resources = Object.keys(schema).filter(path => !path.includes("{") && schema[path]["get"] && ("x-ui" in schema[path]["get"])).map(path => {
        while(path.startsWith("/")) {
            path = path.substring(1);
        }
        return path;
    });

    return ResponsiveAppBar(resources);
}
