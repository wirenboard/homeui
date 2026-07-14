_wb_homeui_gates() {
  local cur="${COMP_WORDS[COMP_CWORD]}"
  if [ "$COMP_CWORD" -eq 1 ]; then
    COMPREPLY=( $(compgen -W "check apply -h --help" -- "$cur") )
  fi
}

complete -F _wb_homeui_gates wb-homeui-gates
