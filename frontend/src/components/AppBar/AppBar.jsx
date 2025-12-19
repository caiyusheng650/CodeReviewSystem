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
  Tooltip,
  Paper,
  ListItemIcon,
  ListItemButton,
  CircularProgress,
  Popover
} from '@mui/material'
import {
  Menu as MenuIcon,
  Search as SearchIcon,
  Notifications as NotificationsIcon,
  AccountCircle,
  LightMode,
  DarkMode,
  ExpandMore,
  Logout as LogoutIcon,
  Code as CodeIcon,
  Translate as LanguageIcon
} from '@mui/icons-material'
import { alpha, styled } from '@mui/material/styles'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import codeReviewAPI from '../../services/api/codeReviewAPI'
import { formatSmartTime } from '../../utils/dateUtils';
import { useTranslation } from 'react-i18next'

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
  title = t('app.title'),
  menuItems = [],
  user = null,
  onMenuClick,
  onUserMenuClick,
  showSearch = true,
  showNotifications = true,
  onThemeToggle,
  isDarkMode = false,
  onLanguageToggle,
  window
}) => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const navigate = useNavigate()
  const { user: authUser, logout } = useAuth()
  const { t, i18n } = useTranslation()
  
  // 使用传入的用户或认证上下文中的用户
  const currentUser = user || authUser
  
  const [anchorEl, setAnchorEl] = useState(null)
  const [mobileMenuAnchorEl, setMobileMenuAnchorEl] = useState(null)
  const [notificationAnchorEl, setNotificationAnchorEl] = useState(null)
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  
  // 语言切换处理函数
  const handleLanguageToggle = () => {
    const currentLang = i18n.language
    const newLang = currentLang === 'zh' ? 'en' : 'zh'
    i18n.changeLanguage(newLang)
    
    // 如果有外部语言切换回调，则调用
    if (onLanguageToggle) {
      onLanguageToggle(newLang)
    }
  }
  
  // 搜索相关状态
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchAnchorEl, setSearchAnchorEl] = useState(null)
  const [searchError, setSearchError] = useState('')
  const searchRef = useRef(null)
  const inputRef = useRef(null)
  
  const isMenuOpen = Boolean(anchorEl)
  const isMobileMenuOpen = Boolean(mobileMenuAnchorEl)
  const isNotificationMenuOpen = Boolean(notificationAnchorEl)
  const isSearchOpen = Boolean(searchAnchorEl)

  // 处理点击外部区域关闭搜索菜单
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setSearchAnchorEl(null)
        setSearchResults([])
      }
    }

    if (isSearchOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [isSearchOpen])

  // 保持输入框焦点
  useEffect(() => {
    if (isSearchOpen && inputRef.current) {
      // 确保搜索框保持焦点
      inputRef.current.focus()
    }
  }, [isSearchOpen, searchResults])

  // 搜索函数
  const handleSearch = async (query) => {
    if (!query.trim()) {
      setSearchResults([])
      setSearchAnchorEl(null)
      return
    }

    setIsSearching(true)
    
    try {
      // 优先从localStorage获取数据
      const cachedReviews = localStorage.getItem('cachedReviews')
      let reviews = []
      
      if (cachedReviews) {
        reviews = JSON.parse(cachedReviews)
      } else {
        // 如果localStorage中没有数据，调用API获取
        reviews = await codeReviewAPI.getReviewHistory({})
        // 缓存到localStorage
        localStorage.setItem('cachedReviews', JSON.stringify(reviews))
      }
      
      // 过滤搜索结果
      const filteredResults = reviews.filter(review => 
        review.pr_title?.toLowerCase().includes(query.toLowerCase()) ||
        review.pr_number?.toString().includes(query) ||
        review.repo_name?.toLowerCase().includes(query.toLowerCase()) ||
        review.author?.toLowerCase().includes(query.toLowerCase())||
        review._id?.toLowerCase().includes(query.toLowerCase())
      )
      
      const results = filteredResults.slice(0, 5) // 最多显示5个结果
      setSearchResults(results)
      
      // 只有当有搜索结果或正在搜索时才显示菜单
      if (results.length > 0 || isSearching) {
        setSearchAnchorEl(searchRef.current)
      }
    } catch (error) {
      console.error('搜索失败:', error)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  // 搜索输入变化处理
  const handleSearchChange = (event) => {
    const query = event.target.value
    setSearchQuery(query)
    
    // 防抖处理，避免频繁搜索
    clearTimeout(searchRef.current?.timeout)
    searchRef.current.timeout = setTimeout(() => {
      handleSearch(query)
    }, 300)
  }

  // 点击搜索结果处理
  const handleSearchResultClick = (review) => {
    navigate(`/reviews/${review._id || review.id}`)
    setSearchQuery('')
    setSearchResults([])
    setSearchAnchorEl(null)
  }

  // 处理输入框获得焦点
  const handleInputFocus = () => {
    if (searchQuery.trim() && searchResults.length > 0) {
      setSearchAnchorEl(searchRef.current)
    }
  }

  // 处理输入框失去焦点
  const handleInputBlur = () => {
    // 延迟关闭，给点击事件时间处理
    setTimeout(() => {
      if (document.activeElement?.closest('[data-menu]') == null) {
        setSearchAnchorEl(null)
      }
    }, 150)
  }

  // 关闭搜索下拉菜单
  const handleSearchClose = () => {
    setSearchAnchorEl(null)
    setSearchResults([])
  }

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
      
      
      
      <MenuItem onClick={onThemeToggle}>
        <IconButton size="large" color="inherit">
          {isDarkMode ? <LightMode /> : <DarkMode />}
        </IconButton>
        <p>{isDarkMode ? t('app.switchToLight') : t('app.switchToDark')}</p>
      </MenuItem>
      
      <MenuItem onClick={handleLanguageToggle}>
        <IconButton size="large" color="inherit">
          <LanguageIcon />
        </IconButton>
        <p>{t('language.switch')} ({i18n.language === 'zh' ? t('language.chinese') : t('language.english')})</p>
      </MenuItem>
    </Menu>
  )

  // 搜索下拉菜单
  const renderSearchMenu = (
    <Popover
      open={isSearchOpen}
      anchorEl={searchAnchorEl}
      onClose={handleSearchClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'left',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'left',
      }}
      PaperProps={{
        sx: {
          maxHeight: 300,
          width: searchRef.current ? searchRef.current.offsetWidth : 300,
          mt: 0.5,
        },
        'data-menu': true
      }}
    >
      {isSearching ? (
        <MenuItem disabled data-menu>
          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', justifyContent: 'center' }}>
            <CircularProgress size={20} />
            <Typography variant="body2" sx={{ ml: 2 }}>{t('app.searching')}</Typography>
          </Box>
        </MenuItem>
      ) : searchResults.length > 0 ? (
        searchResults.map((review, index) => (
          <MenuItem key={index} onClick={() => handleSearchResultClick(review)} data-menu>
            
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              <Typography variant="body2" noWrap>
                {review.pr_title}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatSmartTime(review.created_at, t)}
              </Typography>
            </Box>
          </MenuItem>
        ))
      ) : searchQuery.trim() ? (
        <MenuItem disabled data-menu>
          <Typography variant="body2" color="text.secondary">
            {t('app.noResults')}
          </Typography>
        </MenuItem>
      ) : null}
    </Popover>
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
              <Box sx={{ position: 'relative' }} ref={searchRef}>
                <Search>
                  <SearchIconWrapper>
                    <SearchIcon />
                  </SearchIconWrapper>
                  <StyledInputBase
                    ref={inputRef}
                    placeholder={t('app.searchPlaceholder')}
                    inputProps={{ 'aria-label': 'search' }}
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      // 输入时清除错误提示
                      if (searchError) {
                        setSearchError('');
                      }
                    }}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        const query = searchQuery.trim();
                        const prIdPattern = /^[a-zA-Z0-9]+$/;  // 允许数字和字母
                        
                        if (query && prIdPattern.test(query)) {
                          // 验证通过，导航到 review 详情页面
                          navigate(`/reviews/${query}`);
                          setSearchQuery('');
                          setSearchResults([]);
                          setSearchAnchorEl(null);
                          setSearchError(''); // 清除错误提示
                        } else if (query) {
                          // 输入不为空但格式错误，显示错误提示
                          setSearchError('请输入有效的PR编号');
                        }
                      }
                    }}
                    error={!!searchError}
                  />
                </Search>
                {searchError && (
                  <Typography 
                    variant="caption" 
                    color="error"
                    sx={{ 
                      position: 'absolute', 
                      bottom: -20, 
                      left: 8, 
                      fontSize: '0.75rem' 
                    }}
                  >
                    {searchError}
                  </Typography>
                )}
                {renderSearchMenu}
              </Box>
            )}

            {/* 用户名显示 */}
            <Button
              color="inherit"
              onClick={handleProfileMenuOpen}
              sx={{ ml: 1 }}
            >
              {currentUser ? currentUser.username : t('common.user')}
            </Button>

            <Box sx={{ display: 'flex' }}>
              {/* 语言切换按钮 */}
              <Tooltip title={t('language.switch')}>
                <IconButton size="large" color="inherit" onClick={handleLanguageToggle}>
                  <LanguageIcon />
                </IconButton>
              </Tooltip>
              
              {/* 主题切换按钮 */}
              <Tooltip title={isDarkMode ? t('app.switchToLight') : t('app.switchToDark')}>
                <IconButton size="large" color="inherit" onClick={onThemeToggle}>
                  {isDarkMode ? <LightMode /> : <DarkMode />}
                </IconButton>
              </Tooltip>

              {/* 登出按钮 */}
              <Tooltip title={t('auth.logout')}>
                <IconButton
                  color="inherit"
                  onClick={() => handleUserMenuItemClick('logout')}
                  sx={{ ml: 1 }}
                  size="large"
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