import React, { useState, useEffect, useRef } from 'react'
import {
  AppBar as MuiAppBar,
  Toolbar,
  Typography,
  IconButton,
  InputBase,
  Box,
  Menu,
  MenuItem,
  Badge,
  Avatar,
  Button,
  useScrollTrigger,
  Slide,
  Drawer,
  List,
  ListItem,
  ListItemText,
  useTheme,
  useMediaQuery,
  Tooltip
} from '@mui/material'
import {
  Menu as MenuIcon,
  Search as SearchIcon,
  Notifications as NotificationsIcon,
  AccountCircle,
  LightMode,
  DarkMode,
  ExpandMore,
  Logout as LogoutIcon
} from '@mui/icons-material'
import { alpha, styled } from '@mui/material/styles'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

// 自定义搜索框组件
const Search = styled('div')(({ theme }) => ({
  position: 'relative',
  borderRadius: theme.shape.borderRadius,
  backgroundColor: alpha(theme.palette.common.white, 0.15),
  '&:hover': {
    backgroundColor: alpha(theme.palette.common.white, 0.25),
  },
  marginRight: theme.spacing(2),
  marginLeft: 0,
  width: '100%',
  [theme.breakpoints.up('sm')]: {
    marginLeft: theme.spacing(3),
    width: 'auto',
  },
}))

const SearchIconWrapper = styled('div')(({ theme }) => ({
  padding: theme.spacing(0, 2),
  height: '100%',
  position: 'absolute',
  pointerEvents: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}))

const StyledInputBase = styled(InputBase)(({ theme }) => ({
  color: 'inherit',
  '& .MuiInputBase-input': {
    padding: theme.spacing(1, 1, 1, 0),
    paddingLeft: `calc(1em + ${theme.spacing(4)})`,
    transition: theme.transitions.create('width'),
    width: '100%',
    [theme.breakpoints.up('md')]: {
      width: '20ch',
    },
  },
}))

// 隐藏滚动时的AppBar
function HideOnScroll(props) {
  const { children, window } = props
  const trigger = useScrollTrigger({
    target: window ? window() : undefined,
  })

  return (
    <Slide appear={false} direction="down" in={!trigger}>
      {children}
    </Slide>
  )
}

const AppBar = ({
  title = "智能代码审查系统",
  menuItems = [],
  user = null,
  onMenuClick,
  onUserMenuClick,
  showSearch = true,
  showNotifications = true,
  onThemeToggle,
  isDarkMode = false,
  window
}) => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const navigate = useNavigate()
  const { user: authUser, logout } = useAuth()
  
  // 使用传入的用户或认证上下文中的用户
  const currentUser = user || authUser
  
  const [anchorEl, setAnchorEl] = useState(null)
  const [mobileMenuAnchorEl, setMobileMenuAnchorEl] = useState(null)
  const [notificationAnchorEl, setNotificationAnchorEl] = useState(null)
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  
  const isMenuOpen = Boolean(anchorEl)
  const isMobileMenuOpen = Boolean(mobileMenuAnchorEl)
  const isNotificationMenuOpen = Boolean(notificationAnchorEl)

  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget)
  }

  const handleMobileMenuClose = () => {
    setMobileMenuAnchorEl(null)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
    handleMobileMenuClose()
  }

  const handleMobileMenuOpen = (event) => {
    setMobileMenuAnchorEl(event.currentTarget)
  }

  const handleNotificationMenuOpen = (event) => {
    setNotificationAnchorEl(event.currentTarget)
  }

  const handleNotificationMenuClose = () => {
    setNotificationAnchorEl(null)
  }

  const handleDrawerToggle = () => {
    setMobileDrawerOpen(!mobileDrawerOpen)
  }

  const handleMenuItemClick = (item) => {
    if (onMenuClick) {
      onMenuClick(item)
    }
    // 执行导航操作
    if (item.path) {
      navigate(item.path)
    }
    handleMobileMenuClose()
  }

  const handleUserMenuItemClick = (action) => {
    if (action === 'logout') {
      logout()
    }
    
    if (onUserMenuClick) {
      onUserMenuClick(action)
    }
    handleMenuClose()
  }

  const menuId = 'primary-search-account-menu'
  const mobileMenuId = 'primary-search-account-menu-mobile'
  const notificationMenuId = 'primary-search-notification-menu'

  // 移动端菜单
  const renderMobileMenu = (
    <Menu
      anchorEl={mobileMenuAnchorEl}
      anchorOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      keepMounted
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      open={isMobileMenuOpen}
      onClose={handleMobileMenuClose}
    >
      {menuItems.map((item, index) => (
        <MenuItem key={index} onClick={() => handleMenuItemClick(item)} >
          {item.label}
        </MenuItem>
      ))}
      
      {showNotifications && (
        <MenuItem onClick={handleNotificationMenuOpen}>
          <IconButton size="large" aria-label="show notifications" color="inherit">
            <Badge badgeContent={3} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>
          <p>通知</p>
        </MenuItem>
      )}
      
      <MenuItem onClick={handleProfileMenuOpen}>
        <IconButton
          size="large"
          aria-label="account of current user"
          aria-controls="primary-search-account-menu"
          aria-haspopup="true"
          color="inherit"
        >
          <AccountCircle />
        </IconButton>
        <p>个人资料</p>
      </MenuItem>
      
      <MenuItem onClick={onThemeToggle}>
        <IconButton size="large" color="inherit">
          {isDarkMode ? <LightMode /> : <DarkMode />}
        </IconButton>
        <p>{isDarkMode ? '切换到浅色主题' : '切换到深色主题'}</p>
      </MenuItem>
    </Menu>
  )


  // 移动端抽屉菜单
  const drawer = (
    <Box
      sx={{ width: 250 }}
      role="presentation"
      onClick={handleDrawerToggle}
      onKeyDown={handleDrawerToggle}
    >
      <List>
        {menuItems.map((item, index) => (
          <ListItem button key={index} onClick={() => handleMenuItemClick(item)}>
            <ListItemText primary={item.label} />
          </ListItem>
        ))}
      </List>
    </Box>
  )

  return (
    <>
      <HideOnScroll window={window}>
        <MuiAppBar position="fixed">
          <Toolbar>
            {isMobile && (
              <IconButton
                size="large"
                edge="start"
                color="inherit"
                aria-label="open drawer"
                onClick={handleDrawerToggle}
                sx={{ mr: 2 }}
              >
                <MenuIcon />
              </IconButton>
            )}
            
            <Typography
              variant="h6"
              noWrap
              component="div"
              sx={{ display: { xs: 'none', sm: 'block' } }}
            >
              {title}
            </Typography>
            
            {!isMobile && menuItems.map((item, index) => (
              <Button
                key={index}
                color="inherit"
                onClick={() => handleMenuItemClick(item)}
                sx={{ ml: 1 }}
              >
                {item.label}
              </Button>
            ))}

            <Box sx={{ flexGrow: 1 }} />
            
            {showSearch && (
              <Search>
                <SearchIconWrapper>
                  <SearchIcon />
                </SearchIconWrapper>
                <StyledInputBase
                  placeholder="搜索..."
                  inputProps={{ 'aria-label': 'search' }}
                />
              </Search>
            )}
            
            <Box sx={{ display: 'flex' }}>
              {/* 主题切换按钮 */}
              <IconButton size="large" color="inherit" onClick={onThemeToggle}>
                {isDarkMode ? <LightMode /> : <DarkMode />}
              </IconButton>
              
              
              {/* 用户名显示 */}
              <Button
                color="inherit"
                onClick={handleProfileMenuOpen}
                sx={{ ml: 1 }}
              >
                {currentUser ? currentUser.username : '用户'}
              </Button>

              {/* 登出按钮 */}
              <Tooltip title="登出">
                <IconButton
                  color="inherit"
                  onClick={() => handleUserMenuItemClick('logout')}
                  sx={{ ml: 1 }}
                >
                  <LogoutIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Toolbar>
        </MuiAppBar>
      </HideOnScroll>
      
      {/* 移动端菜单 */}
      {renderMobileMenu}
      

      
      {/* 移动端抽屉 */}
      <Drawer
        anchor="left"
        open={mobileDrawerOpen}
        onClose={handleDrawerToggle}
      >
        {drawer}
      </Drawer>
    </>
  )
}

export default AppBar