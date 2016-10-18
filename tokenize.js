var LOG_LEVEL = 10; // Higher log level = log more

var operators = {};

var getEscape = function(escapeLetter) {
  switch (escapeLetter) {
    case '\n': return '\n';
    case 'n':  return '\n';
    case 't':  return '\t';
    case 'r':  return '\r';
    case '\\': return '\\';
    case '"':  return '"';
    default:   throw "Error: Unrecognized escape sequence \\" + escapeLetter + ".";
  }
};

var log = function(thing, level) {
  if (typeof level !== 'number') {
    throw "Internal error: logging level is not a number.";
  }
  if (LOG_LEVEL >= level) {
    console.log(thing);
  }
};

var tokenize = function(codeString) {
  var tokens = [];
  var indices = {infix: {}, outfix: {}};
  var addToken = function(token) {
    log("Adding token " + JSON.stringify(token), 10);
    tokens.push(token);
    // TODO indices
  };
  var parseComment = function(comment) {
    log("Parsing comment " + JSON.stringify(comment), 8);
    if (comment.charAt(0) === '-' && comment.charAt(comment.length - 1) === '-') {
      var directives = comment.substring(1, comment.length - 1).trim().split("\n");
      var curDirective;
      for (var i = 0; i < directives.length; i++) {
        curDirective = directives[i].split(/\s/);
        switch (curDirective[0]) {
          case 'infixr':
            if (curDirective.length !== 3) {
              throw "Error: Wrong number of arguments passed to directive \"infixr\"";
            }
            operators[curDirective[1]] = ['right', parseInt(curDirective[2], 10)];
            break;
          case 'infixl':
            if (curDirective.length !== 3) {
              throw "Error: Wrong number of arguments passed to directive \"infixl\"";
            }
            operators[curDirective[1]] = ['left', parseInt(curDirective[2], 10)];
            break;
          default:
            throw "Error: Unrecognized directive " + JSON.stringify(curDirective[0]);
        }
      }
    }
  };
  var curToken = null;
  var char, curType;
  for (var i = 0; i < codeString.length; i++) {
    char = codeString.charAt(i);
    if (curToken === null) {
      switch (char) {
        case '"':
          curToken = {type: "string", val: ""};
          break;
        case '{':
          curToken = {type: "comment-multi", val: ""};
          break;
        case '#':
          curToken = {type: "comment-single", val: ""};
          break;
        case '(':
          addToken({
            type: "outfix-open",
            val:  "("
          });
          break;
        case '[':
          addToken({
            type: "outfix-open",
            val:  "["
          });
          break;
        case ')':
          addToken({
            type: "outfix-close",
            val:  ")"
          });
          break;
        case ']':
          addToken({
            type: "outfix-close",
            val:  "]"
          });
          break;
        case '`':
          addToken({
            type: "infixer",
            val:  "`"
          });
          break;
        default:
          if ((/\s/).test(char)) {
            // Ignore whitespace
          }
          else if ((/[0-9]/).test(char)) {
            curToken = {type: "int", val: char};
          }
          else if ((/[a-zA-Z_]/).test(char)) {
            curToken = {type: "id", val: char};
          }
          else {
            curToken = {type: "infix", val: char};
          }
      }
    }
    else {
      curType = curToken.type;
      switch (curType) {
        case 'comment-single':
        case 'comment-multi':
          if ((curType === 'comment-single' && char === '\n')
            || curType === 'comment-multi'  && char === '}') {
            parseComment(curToken.val);
            curToken = null;
          }
          else {
            curToken.val += char;
          }
          break;
        case 'string':
          switch (char) {
            case '"':
              addToken(curToken);
              curToken = null;
              break;
            case '\\':
              curToken.val += getEscape(codeString.charAt(i + 1));
              i++; // Skip next char (already dealt with) (TODO)
              break;
            default:
              curToken.val += char;
          }
          break;
        case 'int':
          // TODO replace regexes
          // TODO condense repetitive code
          if ((/[0-9]/).test(char)) {
            curToken.val += char;
          }
          else {
            addToken(curToken);
            curToken = null;
            i--; // Reevaluate char with no current token
          }
          break;
        case 'id':
          if ((/[a-zA-Z0-9_']/).test(char)) {
            curToken.val += char;
          }
          else {
            addToken(curToken);
            curToken = null;
            i--;
          }
          break;
        case 'infix':
          // TODO int negative
          if ((/[^a-zA-Z0-9_\[\]{}\(\)#"'`\s]/).test(char)) {
            curToken.val += char;
          }
          else {
            addToken(curToken);
            curToken = null;
            i--;
          }
          break;
        default:
          throw "Internal error: unrecognized token type " + curType;
      }
    }
  }
  if (curToken !== null) {
    if (curToken.type === 'comment-multi') {
      throw "Error: Unclosed multi-line comment";
    }
    if (curToken.type !== 'comment-single') {
      addToken(curToken);
    }
    else {
      parseComment(curToken.val);
    }
  }
  return {
    tokens:  tokens,
    indices: indices
  };
};
