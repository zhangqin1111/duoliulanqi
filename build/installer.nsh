!macro customInit
  DeleteRegValue SHELL_CONTEXT "${INSTALL_REGISTRY_KEY}" KeepShortcuts
  WriteRegStr SHELL_CONTEXT "${INSTALL_REGISTRY_KEY}" KeepShortcuts "false"
!macroend

!macro customInstall
  WriteRegStr SHELL_CONTEXT "${INSTALL_REGISTRY_KEY}" KeepShortcuts "false"
  StrCpy $launchLink "$appExe"
!macroend
