function gotoDefStartService() {
  function mapTokensBackward(cm, func) {
    var cur = cm.getCursor();
    for (var line = cur.line; line >= 0; line--) {
      var tokens = cm.getLineTokens(line);
      for (var i = tokens.length - 1; i >= 0; i--) {
        if (func(tokens[i], line)) return;
      }
    }
  }

  var STATE_FIND_CLOSING_PAREN = 0,
    STATE_FIND_OPEN_PAREN = 1,
    STATE_FIND_BEGINNING = 2;

  return cm => {
    var state = STATE_FIND_CLOSING_PAREN,
      level = 1;
    mapTokensBackward(cm, (token, line) => {
      // console.log("state=" + state + "; type=" + token.type + "; string=" + token.string);
      switch (state) {
        case STATE_FIND_CLOSING_PAREN:
          if (token.string == ')') state = STATE_FIND_OPEN_PAREN;
          return false;
        case STATE_FIND_OPEN_PAREN:
          if (token.string == ')') level++;
          else if (token.string == '(' && !--level) state = STATE_FIND_BEGINNING;
          return false;
        case STATE_FIND_BEGINNING:
          if (token.type == 'variable') {
            cm.setCursor(line, token.start);
            return true;
          }
        default:
          throw new Error('bad state');
      }
    });
  };
}

export default gotoDefStartService;
