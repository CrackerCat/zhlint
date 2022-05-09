import { isContentType, isPunctuationType } from '.'
import { Validation } from '../report'
import { checkCharType } from './char'
import {
  CharType,
  Mark,
  MutableMark,
  MarkMap,
  MarkSideType,
  MarkType,
  MutableSingleToken,
  MutableGroupToken,
  MutableToken,
  Token,
  ParseStatus,
  ParseResult
} from './types'
import {
  appendContent,
  addHyperContent,
  addHyperToken,
  finalizeLastToken,
  getConnectingSpaceLength,
  getHyperMarkMap,
  getPreviousToken,
  handleContent,
  handlePunctuation,
  initNewStatus,
  isShorthand,
  handleErrors
} from './util'

/**
 * Parse a string into several tokens.
 * - half-width content x {1,n} (English words)
 * - full-width content x {1,n} (Chinese sentenses without punctuations in between)
 * - half-width punctuation
 * - width-width punctuation
 * - punctuation pair as special marks: brackets
 * - punctuation pair as a group: quotes
 * Besides them there are some special tokens
 * - content-hyper from hyperMarks as input
 * For spaces they would be included as one or multiple successive spaces in
 * - afterSpace after a token or
 * - innerSpaceBefore after the left quote of a group
 */
export const parse = (str: string, hyperMarks: Mark[] = []): ParseResult => {
  // init status and hyper marks
  const status: ParseStatus = initNewStatus(str, hyperMarks)
  const hyperMarkMap: MarkMap = getHyperMarkMap(hyperMarks)

  // travel every character in the string
  for (let i = 0; i < str.length; i++) {
    const char = str[i]
    const type = checkCharType(char)
    const hyperMark = hyperMarkMap[i]

    // finally get `status.marks` and `status.lastGroup` as the top-level tokens
    // - hyper marks: finalize current token -> add mark
    // - space: end current -> move forward -> record space beside
    // - punctuation: whether start/end a mark or group, or just add a normal one
    // - content: whether start a new one or append into the current one
    if (hyperMark) {
      // end the last unfinished token
      finalizeLastToken(status, i)
      // for hyper mark without startContent
      delete hyperMarkMap[i]
      // check the next token
      // - if the mark type is raw
      //   - append next token
      // - else
      //   - start mark: append token
      //   - end mark: append token, append mark
      if (hyperMark.type === MarkType.RAW) {
        addHyperContent(
          status,
          i,
          str.substring(hyperMark.startIndex, hyperMark.endIndex)
        )
        i = hyperMark.endIndex - 1
      } else {
        if (i === hyperMark.startIndex) {
          addHyperToken(
            status,
            i,
            hyperMark,
            hyperMark.startContent,
            MarkSideType.LEFT
          )
          i += hyperMark.startContent.length - 1
        } else if (i === hyperMark.endIndex) {
          addHyperToken(
            status,
            i,
            hyperMark,
            hyperMark.endContent,
            MarkSideType.RIGHT
          )
          i += hyperMark.endContent.length - 1
        }
      }
    } else if (type === CharType.SPACE) {
      // end the last unfinished token
      // jump to the next non-space char
      // record the last space
      // - space after a token
      // - inner space before a group
      finalizeLastToken(status, i)
      if (status.lastGroup) {
        const spaceLength = getConnectingSpaceLength(str, i)
        const spaces = str.substring(i, i + spaceLength)
        if (status.lastGroup.length) {
          const lastToken = getPreviousToken(status)
          if (lastToken) {
            lastToken.spaceAfter = spaces
          }
        } else {
          status.lastGroup.innerSpaceBefore = spaces
        }
        if (spaceLength - 1 > 0) {
          i += spaceLength - 1
        }
      }
    } else if (isShorthand(str, status, i, char)) {
      appendContent(status, char)
    } else if (isPunctuationType(type)) {
      handlePunctuation(i, char, type, status)
    } else if (isContentType(type)) {
      handleContent(i, char, type, status)
    } else if (type === CharType.EMPTY) {
      // Nothing
    } else {
      handleContent(i, char, CharType.CONTENT_HALF, status)
    }
  }
  finalizeLastToken(status, str.length)

  // handle all the unmatched parsing tokens
  handleErrors(status)

  return {
    tokens: status.tokens,
    groups: status.groups,
    marks: status.marks,
    errors: status.errors
  }
}

export type MutableParseResult = {
  tokens: MutableGroupToken
  groups: MutableGroupToken[]
  marks: MutableMark[]
  errors: Validation[]
}

const toMutableToken = (token: Token): MutableToken => {
  if (Array.isArray(token)) {
    const mutableToken: MutableGroupToken = token as MutableGroupToken
    mutableToken.modifiedType = token.type
    mutableToken.modifiedContent = token.content
    mutableToken.modifiedSpaceAfter = token.spaceAfter
    mutableToken.modifiedStartContent = token.startContent
    mutableToken.modifiedEndContent = token.endContent
    mutableToken.modifiedInnerSpaceBefore = token.innerSpaceBefore
    mutableToken.validations = []
    token.forEach(toMutableToken)
    return mutableToken
  } else {
    const mutableToken: MutableSingleToken = token as MutableSingleToken
    mutableToken.modifiedType = token.type
    mutableToken.modifiedContent = token.content
    mutableToken.modifiedSpaceAfter = token.spaceAfter
    mutableToken.validations = []
    return mutableToken
  }
}

const toMutableMark = (mark: Mark): MutableMark => {
  const mutableMark: MutableMark = mark as MutableMark
  mutableMark.modifiedStartContent = mark.startContent
  mutableMark.modifiedEndContent = mark.endContent
  return mutableMark
}

export const toMutableResult = (result: ParseResult): MutableParseResult => {
  toMutableToken(result.tokens)
  result.marks.forEach(toMutableMark)
  return result as MutableParseResult
}
