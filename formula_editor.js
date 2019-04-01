// Token class, defined by a token type and (sometimes) a value
class Token {
  constructor (type, value) {
    this.type = type
    this.value = value
  }
}

// Properties of token: the regular expression that identifies it and the class name we want to apply
class TokenTypeProperties {
  constructor (regularExp, classForStyle) {
    this.regularExp = regularExp
    this.classForStyle = classForStyle
  }

  // we could use prototype instead
  htmlChunk (pos, value) {
    var str = value.replace(/\</g, '&lt;') // for <
    str = str.replace(/\>/g, '&gt;') // for >
    str = str.replace(/\s/g, '')
    // template strings available since ES6
    if (str.length > 0) {
      return `<span id='#chunk-${pos}' class='${this.classForStyle}'>${str}</span>`
    } else {
      return ''
    }
  }
}

// from string to list of tokens
function tokenize (formula) {
  var tokens = []
  var cursor = 0
  while (cursor < formula.length) {
    var remaining = formula.substring(cursor)
    for (var tokenType in lexicalDict) {
      var matchResult = remaining.match(lexicalDict[tokenType].regularExp)
      if (matchResult != null) {
        tokenValue = matchResult[0]
        break
      }
    }

    tokens.push(new Token(tokenType, tokenValue))
    cursor += tokenValue.length
  }

  return tokens
}

// fired any time there is new input in the editor
function formatEditor () {
  var formula = editor.innerText

  // retain cursor position: + anchorOffset after anchorNode
  var caretPosition = getCaretPosition()

  // let us tokenize
  var tokens = tokenize(formula)
  var formulaHTML = ''
  for (var i = 0; i < tokens.length; i++) {
    // simplify later
    var token = tokens[i]
    var spanned = lexicalDict[token.type].htmlChunk(i, token.value)
    formulaHTML = formulaHTML.concat(spanned)
  }

  editor.innerHTML = formulaHTML
  restoreCaretPosition(caretPosition)
}

// returns the current position of the cursor before styling
function getCaretPosition () {
  var selection = window.getSelection()
  var position = selection.anchorOffset
  // We move up to the parent span
  var sibling = selection.anchorNode.parentNode.previousSibling
  while (sibling !== null) {
    if (sibling.childNodes.length > 0) {
      position += sibling.childNodes[0].length
    }
    sibling = sibling.previousSibling
  }
  return position // position
}

// restore the cursor to its original position
// dropped whitespaces are taken into account
function restoreCaretPosition (lastPosition) {
  // we go over all span chunks until the right node is identified
  var currentChunk = editor.childNodes[0]
  var covered = 0
  var position = Math.min(lastPosition, editor.innerText.length)

  while (covered < position) { // in case we have removed spaces
    if (currentChunk.childNodes[0].length + covered >= position) {
      break // chunk found
    }
    covered += currentChunk.childNodes[0].length
    currentChunk = currentChunk.nextSibling
  }

  var offset = position - covered

  var range = document.createRange()
  var sel = window.getSelection()
  range.setStart(currentChunk.childNodes[0], offset)
  range.collapse(true)
  sel.removeAllRanges()
  sel.addRange(range)
}

// retain editor element
var editor = document.getElementById('formula-editor')
editor.oninput = formatEditor

// maps regular expressions and CSS classes to token types
var lexicalDict = {}

lexicalDict['WHITESPACE'] = new TokenTypeProperties(/^\s/, 'ws-class')
lexicalDict['IDENTIFIER'] = new TokenTypeProperties(/^([A-Za-z][A-Za-z]?\d{1,3})/, 'id-class')
lexicalDict['ARITHMETICOPERATOR'] = new TokenTypeProperties(/^[\+\-*\/]/, 'op-class')
lexicalDict['NUMBER'] = new TokenTypeProperties(/^((\+|\-)?([0-9]+(\.[0-9]*)?))/, 'num-class')
lexicalDict['STRING'] = new TokenTypeProperties(/^\".*\"/, 'str-class')
lexicalDict['EQUALS'] = new TokenTypeProperties(/^=/, 'eq-class')
lexicalDict['RELOPERATOR'] = new TokenTypeProperties(/^((\<[=]?)|(\>[=]?)|!=)/, 'rel-class')
lexicalDict['LOGICALOPERATOR'] = new TokenTypeProperties(/^(and|or|xor)/, 'log-class')
lexicalDict['UNARYLOGICALOPERATOR'] = new TokenTypeProperties(/^not/, 'log-class')
lexicalDict['SEMICOLON'] = new TokenTypeProperties(/^;/, 'scol-class')

lexicalDict['LEFTPARENTHESIS'] = new TokenTypeProperties(/^\(/, 'par-class')
lexicalDict['RIGHTPARENTESIS'] = new TokenTypeProperties(/^\)/, 'par-class')
lexicalDict['FUNCTION'] = new TokenTypeProperties(/^(if|exp|log|find)/, 'function-class')

// default token when nothing else is matched
lexicalDict['UNKNOWN'] = new TokenTypeProperties(/[\s\S]*/, 'unk-class')

var tokenValue = ''
