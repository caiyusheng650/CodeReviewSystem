import React from 'react'
import {
  Box,
  Typography,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  Chip,
  Divider,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Container,
  Breadcrumbs,
  Link
} from '@mui/material'
import { ExpandMore, Code, Download, GitHub, Create } from '@mui/icons-material'
import { useTranslation } from 'react-i18next'

const Documentation = ({ isDarkMode }) => {
  const { t } = useTranslation()
  const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'

  const installationSteps = [
    {
      title: t('documentation.installation.method1.title'),
      description: t('documentation.installation.method1.description'),
      command: `curl -s ${apiBaseUrl}/api/install/script | bash`,
      warning: t('documentation.installation.method1.warning')
    },
    {
      title: t('documentation.installation.method2.title'),
      description: t('documentation.installation.method2.description'),
      steps: [
        {
          title: t('documentation.installation.method2.step1.title'),
          command: `mkdir -p .github/workflows`,
          description: t('documentation.installation.method2.step1.description')
        },
        {
          title: t('documentation.installation.method2.step2.title'),
          command: `curl -s ${apiBaseUrl}/api/install/workflow/ai-review.yml -o .github/workflows/ai-review.yml`,
          description: t('documentation.installation.method2.step2.description')
        },
        {
          title: t('documentation.installation.method2.step3.title'),
          command: `curl -s ${apiBaseUrl}/api/install/workflow/docs.txt -o .github/workflows/docs.txt`,
          description: t('documentation.installation.method2.step3.description')
        },
        {
          title: t('documentation.installation.method2.step4.title'),
          description: t('documentation.installation.method2.step4.description'),
          steps: [
            t('documentation.installation.method2.step4.substep1'),
            t('documentation.installation.method2.step4.substep2'),
            t('documentation.installation.method2.step4.substep3'),
            t('documentation.installation.method2.step4.substep4')
          ]
        },
        {
          title: t('documentation.installation.method2.step5.title'),
          description: t('documentation.installation.method2.step5.description'),
          warning: t('documentation.installation.method2.step5.warning')
        }
      ]
    }
  ]

  const apiEndpoints = [
    {
      method: 'GET',
      path: '/api/install/',
      description: t('documentation.api.installGuide'),
      color: 'primary'
    },
    {
      method: 'GET',
      path: '/api/install/script',
      description: t('documentation.api.installScript'),
      color: 'success'
    },
    {
      method: 'GET',
      path: '/api/install/workflow/{filename}',
      description: t('documentation.api.workflowFile'),
      color: 'warning'
    }
  ]

  const githubSecrets = [
    {
      name: 'CODE_REVIEW_API_TOKEN',
      description: t('documentation.secrets.apiToken'),
      required: true,
      link: '/settings',
      linkText: t('documentation.secrets.getToken')
    },
    {
      name: 'CODE_REVIEW_API_URL',
      description: t('documentation.secrets.apiUrl'),
      required: true,
      value: apiBaseUrl
    }
  ]

  return (
    <Container maxWidth="1200">
      <Box sx={{ mt: 4, mb: 4 }}>
        {/* 面包屑导航 */}
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
          
          <Typography color="text.primary">{t('documentation.title')}</Typography>
        </Breadcrumbs>

        {/* 页面标题 */}
        <Typography variant="h4" component="h1" gutterBottom>
          {t('documentation.title')}
        </Typography>

      {/* 安装指南部分 */}
      <Paper sx={{ p: 3, mb: 4 }} elevation={2}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
          <Download sx={{ mr: 1 }} />
          {t('documentation.installation.title')}
        </Typography>
        
        {installationSteps.map((step, index) => (
          <Box key={index} sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom color="primary">
              {step.title}
            </Typography>
            
            {step.description && (
              <Typography variant="body1" paragraph>
                {step.description}
              </Typography>
            )}
            
            {step.command && (
              <Paper 
                variant="outlined" 
                sx={{ 
                  p: 2, 
                  backgroundColor: isDarkMode ? '#1e1e1e' : '#f5f5f5',
                  fontFamily: 'monospace',
                  mb: 1
                }}
              >
                {step.command}
              </Paper>
            )}
            
            {step.warning && (
              <Typography variant="body2" color="warning.main" sx={{ fontStyle: 'italic' }}>
                ⚠️ {step.warning}
              </Typography>
            )}
            
            {step.steps && (
              <Box sx={{ ml: 2 }}>
                {step.steps.map((subStep, subIndex) => (
                  <Box key={subIndex} sx={{ mb: 3 }}>
                    {subStep.title && (
                      <Typography variant="subtitle1" gutterBottom color="secondary">
                        {subStep.title}
                      </Typography>
                    )}
                    
                    {subStep.description && (
                      <Typography variant="body2" paragraph>
                        {subStep.description}
                      </Typography>
                    )}
                    
                    {subStep.command && (
                      <Paper 
                        variant="outlined" 
                        sx={{ 
                          p: 2, 
                          backgroundColor: isDarkMode ? '#1e1e1e' : '#f5f5f5',
                          fontFamily: 'monospace',
                          mb: 1
                        }}
                      >
                        {subStep.command}
                      </Paper>
                    )}
                    
                    {subStep.warning && (
                      <Typography variant="body2" color="warning.main" sx={{ fontStyle: 'italic' }}>
                        ⚠️ {subStep.warning}
                      </Typography>
                    )}
                    
                    {subStep.steps && (
                      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                        <List dense sx={{ width: 'fit-content' }}>
                          {subStep.steps.map((nestedStep, nestedIndex) => (
                            <ListItem key={nestedIndex}>
                              <ListItemText primary={nestedStep} sx={{ textAlign: 'center' }} />
                            </ListItem>
                          ))}
                        </List>
                      </Box>
                    )}
                    
                    {subIndex < step.steps.length - 1 && <Divider sx={{ my: 2 }} />}
                  </Box>
                ))}
              </Box>
            )}
            
            {index < installationSteps.length - 1 && <Divider sx={{ my: 2 }} />}
          </Box>
        ))}
      </Paper>

      {/* GitHub Secrets配置 */}
      <Paper sx={{ p: 3, mb: 4 }} elevation={2}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
          <GitHub sx={{ mr: 1 }} />
          {t('documentation.secrets.title')}
        </Typography>
        
        <Typography variant="body1" paragraph>
          {t('documentation.secrets.description')}
        </Typography>
        
        <TableContainer component={Paper} variant="outlined">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell><strong>{t('documentation.secrets.secretName')}</strong></TableCell>
                <TableCell><strong>{t('documentation.description')}</strong></TableCell>
                <TableCell><strong>{t('documentation.secrets.value')}</strong></TableCell>
                <TableCell><strong>{t('documentation.secrets.actions')}</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {githubSecrets.map((secret, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Chip 
                      label={secret.name} 
                      color={secret.required ? 'primary' : 'default'} 
                      variant="outlined"
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {secret.description}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {secret.value && (
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                        {secret.value}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    {secret.link && (
                      <Button 
                        variant="text" 
                        size="small" 
                        href={secret.link}
                        target="_blank"
                        sx={{ textTransform: 'none' }}
                      >
                        {secret.linkText}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* PR创建教程 */}
      <Paper sx={{ p: 3, mb: 4 }} elevation={2}>
        <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
          <Create sx={{ mr: 1 }} />
          {t('documentation.prTutorial.title')}
        </Typography>
        
        <Typography variant="body1" paragraph>
          {t('documentation.prTutorial.description')}
        </Typography>
        
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom color="primary">
            {t('documentation.prTutorial.step1.title')}
          </Typography>
          <Typography variant="body1" paragraph>
            {t('documentation.prTutorial.step1.description')}
          </Typography>
          <Paper 
            variant="outlined" 
            sx={{ 
              p: 2, 
              backgroundColor: isDarkMode ? '#1e1e1e' : '#f5f5f5',
              fontFamily: 'monospace',
              mb: 1
            }}
          >
            git checkout -b feature/your-feature-name
          </Paper>
        </Box>
        
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom color="primary">
            {t('documentation.prTutorial.step2.title')}
          </Typography>
          <Typography variant="body1" paragraph>
            {t('documentation.prTutorial.step2.description')}
          </Typography>
          <Paper 
            variant="outlined" 
            sx={{ 
              p: 2, 
              backgroundColor: isDarkMode ? '#1e1e1e' : '#f5f5f5',
              fontFamily: 'monospace',
              mb: 1
            }}
          >
            git add .
          </Paper>
          <Paper 
            variant="outlined" 
            sx={{ 
              p: 2, 
              backgroundColor: isDarkMode ? '#1e1e1e' : '#f5f5f5',
              fontFamily: 'monospace',
              mb: 1
            }}
          >
            git commit -m "描述你的修改内容"
          </Paper>
        </Box>
        
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom color="primary">
            {t('documentation.prTutorial.step3.title')}
          </Typography>
          <Typography variant="body1" paragraph>
            {t('documentation.prTutorial.step3.description')}
          </Typography>
          <Paper 
            variant="outlined" 
            sx={{ 
              p: 2, 
              backgroundColor: isDarkMode ? '#1e1e1e' : '#f5f5f5',
              fontFamily: 'monospace',
              mb: 1
            }}
          >
            git push origin feature/your-feature-name
          </Paper>
        </Box>
        
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom color="primary">
            {t('documentation.prTutorial.step4.title')}
          </Typography>
          <Typography variant="body1" paragraph>
            {t('documentation.prTutorial.step4.description')}
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            {t('documentation.prTutorial.step4.instructions')}
          </Typography>
        </Box>
        
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom color="primary">
            {t('documentation.prTutorial.step5.title')}
          </Typography>
          <Typography variant="body1" paragraph>
            {t('documentation.prTutorial.step5.description')}
          </Typography>
          <Typography variant="body2" color="success.main" sx={{ fontStyle: 'italic' }}>
            ✅ {t('documentation.prTutorial.step5.success', {
              reviewRecordsPage: t('documentation.prTutorial.step5.successLink')
            })}
            <Link href="/reviews" sx={{ color: 'inherit', textDecoration: 'underline', ml: 0.5 }}>
              {t('documentation.prTutorial.step5.successLink')}
            </Link>
          </Typography>
        </Box>
      </Paper>

      {/* 快速操作按钮 */}
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mt: 4 }}>
        <Button 
          variant="contained" 
          href={`${apiBaseUrl}/api/install/`}
          target="_blank"
          startIcon={<Download />}
        >
          {t('documentation.actions.viewGuide')}
        </Button>
        <Button 
          variant="outlined" 
          href={`${apiBaseUrl}/api/install/script`}
          target="_blank"
          startIcon={<Code />}
        >
          {t('documentation.actions.downloadScript')}
        </Button>
      </Box>
      </Box>
    </Container>
  )
}

export default Documentation