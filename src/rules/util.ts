import { Validation, ValidationTarget } from '../report'
import {
  MarkSideType,
  MutableGroupToken as GroupToken,
  MutableToken as Token,
  HyperTokenType,
  isNonCodeVisibleType,
  isInvisibleType,
  isVisibleType,
  TokenType,
  CharType
} from '../parser'

// options

export type Options = {
  // parsing
  noSinglePair?: boolean

  // punctuation
  halfWidthPunctuation?: string
  fullWidthPunctuation?: string
  unifiedPunctuation?: 'traditional' | 'simplified'

  // case: abbrs
  skipAbbrs?: string[]

  // space around content
  spaceBetweenHalfWidthLetters?: boolean
  noSpaceBetweenFullWidthLetters?: boolean
  spaceBetweenMixedWidthLetters?: boolean

  // space around punctuation
  noSpaceBeforePunctuation?: boolean
  spaceAfterHalfWidthPunctuation?: boolean
  noSpaceAfterFullWidthPunctuation?: boolean

  // space around quote
  spaceOutsideHalfQuote?: boolean
  noSpaceOutsideFullQuote?: boolean
  noSpaceInsideQuote?: boolean

  // space around bracket
  spaceOutsideHalfBracket?: boolean
  noSpaceOutsideFullBracket?: boolean
  noSpaceInsideBracket?: boolean

  // space around code
  spaceOutsideCode?: boolean

  // space around mark
  noSpaceInsideWrapper?: boolean

  // trim space
  trimSpace?: boolean

  // case: number x Chinese unit
  skipZhUnits?: string

  // custom preset
  preset?: string

  /**
   * @deprecated
   *
   * Please use `noSpaceInsideWrapper` instead.
   */
  noSpaceInsideMark?: boolean
  /**
   * @deprecated
   *
   * Please use `spaceBetweenHalfWidthLetters` instead.
   */
  spaceBetweenHalfWidthContent?: boolean
  /**
   * @deprecated
   *
   * Please use `noSpaceBetweenFullWidthLetters` instead.
   */
  noSpaceBetweenFullWidthContent?: boolean
  /**
   * @deprecated
   *
   * Please use `spaceBetweenMixedWidthLetters` instead.
   */
  spaceBetweenMixedWidthContent?: boolean
}

// find tokens

/**
 * Find the previous token if exists
 */
export const findTokenBefore = (
  group: GroupToken,
  token: Token | undefined
): Token | undefined => {
  if (!token) {
    return
  }
  const index = group.indexOf(token)
  if (index < 0) {
    return
  }
  return group[index - 1]
}

/**
 * Find the next token if exists
 */
export const findTokenAfter = (
  group: GroupToken,
  token: Token | undefined
): Token | undefined => {
  if (!token) {
    return
  }
  const index = group.indexOf(token)
  if (index < 0) {
    return
  }
  return group[index + 1]
}

/**
 * Find a certain token before, which:
 * - group, content, punctuation, and bracket will be passed
 * - code, container, and unknown will be failed
 * - hyper mark, html pairs will be skipped
 */
export const findNonCodeVisibleTokenBefore = (
  group: GroupToken,
  token: Token | undefined
): Token | undefined => {
  if (!token) {
    return
  }
  const beforeToken = findTokenBefore(group, token)
  if (!beforeToken) {
    return
  }
  // hyper mark, html pairs: skip
  if (isInvisibleType(beforeToken.type) || getHtmlTagSide(beforeToken)) {
    return findNonCodeVisibleTokenBefore(group, beforeToken)
  }
  // content, punctuation, bracket, group: return token
  if (isNonCodeVisibleType(beforeToken.type)) {
    return beforeToken
  }
  // code, unknown, container: return undefined
  return
}

/**
 * Find a certain token after, which:
 * - group, content, punctuation, and bracket will be passed
 * - code, container, and unknown will be failed
 * - hyper mark, html pairs will be skipped
 */
export const findNonCodeVisibleTokenAfter = (
  group: GroupToken,
  token: Token | undefined
): Token | undefined => {
  if (!token) {
    return
  }
  const afterToken = findTokenAfter(group, token)
  if (!afterToken) {
    return
  }
  // hyper mark, html pairs: skip
  if (isInvisibleType(afterToken.type) || getHtmlTagSide(afterToken)) {
    return findNonCodeVisibleTokenAfter(group, afterToken)
  }
  // content, punctuation, bracket, group: return token
  if (isNonCodeVisibleType(afterToken.type)) {
    return afterToken
  }
  // code, unknown, container: return undefined
  return
}

/**
 * Find a certain token before, which:
 * - group, content, punctuation, bracket, and code will be passed
 * - container, and unknown will be failed
 * - hyper mark, html pairs will be skipped
 */
export const findVisibleTokenBefore = (
  group: GroupToken,
  token: Token | undefined
): Token | undefined => {
  if (!token) {
    return
  }
  const beforeToken = findTokenBefore(group, token)
  if (!beforeToken) {
    return
  }
  // hyper mark, html pairs: skip
  if (isInvisibleType(beforeToken.type) || getHtmlTagSide(beforeToken)) {
    return findVisibleTokenBefore(group, beforeToken)
  }
  // content, punctuation, bracket, group, code: return token
  if (isVisibleType(beforeToken.type)) {
    return beforeToken
  }
  // unknown, container: return undefined
  return
}

/**
 * Find a certain token after, which:
 * - group, content, punctuation, bracket, and code will be passed
 * - container, and unknown will be failed
 * - hyper mark, html pairs will be skipped
 */
export const findVisibleTokenAfter = (
  group: GroupToken,
  token: Token | undefined
): Token | undefined => {
  if (!token) {
    return
  }
  const afterToken = findTokenAfter(group, token)
  if (!afterToken) {
    return
  }
  // hyper mark, html pairs: skip
  if (isInvisibleType(afterToken.type) || getHtmlTagSide(afterToken)) {
    return findVisibleTokenAfter(group, afterToken)
  }
  // content, punctuation, bracket, group, code: return token
  if (isVisibleType(afterToken.type)) {
    return afterToken
  }
  // unknown, container: return undefined
  return
}

// hyper mark seq

const isHtmlTag = (token: Token): boolean => {
  if (token.type !== HyperTokenType.HYPER_CONTENT) {
    return false
  }
  return !!token.content.match(/^<.+>$/)
}

const getHtmlTagSide = (token: Token): MarkSideType | undefined => {
  if (!isHtmlTag(token)) {
    return
  }
  if (token.content.match(/^<code.*>.*<\/code.*>$/)) {
    return
  }
  if (token.content.match(/^<[^/].+\/\s*>$/)) {
    return
  }
  if (token.content.match(/^<[^/].+>$/)) {
    return MarkSideType.LEFT
  }
  if (token.content.match(/^<\/.+>$/)) {
    return MarkSideType.RIGHT
  }
}

export const isWrapper = (token: Token): boolean => {
  return token.type === HyperTokenType.HYPER_WRAPPER || !!getHtmlTagSide(token)
}

export const getWrapperSide = (token: Token): MarkSideType | undefined => {
  if (token.type === HyperTokenType.HYPER_WRAPPER) {
    return token.markSide
  }
  return getHtmlTagSide(token)
}

const spreadHyperMarkSeq = (
  group: GroupToken,
  token: Token,
  seq: Token[],
  isBackward: boolean
): void => {
  if (isBackward) {
    const tokenBefore = findTokenBefore(group, token)
    if (tokenBefore && isWrapper(tokenBefore)) {
      seq.unshift(tokenBefore)
      spreadHyperMarkSeq(group, tokenBefore, seq, isBackward)
    }
  } else {
    const tokenAfter = findTokenAfter(group, token)
    if (tokenAfter && isWrapper(tokenAfter)) {
      seq.push(tokenAfter)
      spreadHyperMarkSeq(group, tokenAfter, seq, isBackward)
    }
  }
}

export const findConnectedWrappers = (
  group: GroupToken,
  token: Token
): Token[] => {
  const seq: Token[] = [token]
  spreadHyperMarkSeq(group, token, seq, false)
  spreadHyperMarkSeq(group, token, seq, true)
  return seq
}

const findSpaceHostInHyperMarkSeq = (
  group: GroupToken,
  hyperMarkSeq: Token[]
): Token | undefined => {
  // Return nothing if the seq is empty
  if (!hyperMarkSeq.length) {
    return
  }

  const firstMark = hyperMarkSeq[0]
  const lastMark = hyperMarkSeq[hyperMarkSeq.length - 1]
  const firstMarkSide = getWrapperSide(firstMark)
  const lastMarkSide = getWrapperSide(lastMark)

  const tokenBefore = findTokenBefore(group, firstMark)
  if (!tokenBefore) {
    return
  }

  // Return nothing if any token is not a mark.
  if (!firstMarkSide || !lastMarkSide) {
    return
  }

  // If first and last mark have the same side, then return:
  // - token before first mark if they are the left side
  // - last mark if they are the right side
  if (firstMarkSide === lastMarkSide) {
    if (firstMarkSide === MarkSideType.LEFT) {
      return tokenBefore
    }
    return lastMark
  }

  // If first mark is the left side and last mark is the right side,
  // that usually means multiple marks partially overlapped.
  // This situation is abnormal but technically exists.
  // We'd better do nothing and leave this issue to human.
  if (firstMarkSide === MarkSideType.LEFT) {
    return
  }

  // If first mark is the right side and last mark is the left side,
  // that usually means multiple marks closely near eath other.
  // We'd better find the gap outside the both sides of marks.
  let target: Token | undefined = tokenBefore
  while (target && target !== lastMark) {
    const nextToken = findTokenAfter(group, target)
    if (nextToken && getWrapperSide(nextToken) === MarkSideType.LEFT) {
      return target
    }
    target = nextToken
  }
  return tokenBefore
}

export const findWrappersBetween = (
  group: GroupToken,
  before: Token | undefined,
  after: Token | undefined
): {
  spaceHost?: Token
  wrappers: Token[]
  tokens: Token[]
} => {
  if (!before || !after) {
    return {
      spaceHost: undefined,
      wrappers: [],
      tokens: []
    }
  }

  const firstMark = findTokenAfter(group, before)
  const firstVisible = findVisibleTokenAfter(group, before)
  if (!firstMark || firstVisible !== after) {
    return {
      spaceHost: undefined,
      wrappers: [],
      tokens: []
    }
  }
  if (firstMark === after) {
    return {
      spaceHost: before,
      wrappers: [],
      tokens: [before]
    }
  }

  const markSeq = findConnectedWrappers(group, firstMark)
  const spaceHost = findSpaceHostInHyperMarkSeq(group, markSeq)

  return {
    spaceHost,
    wrappers: markSeq,
    tokens: [before, ...markSeq]
  }
}

// special cases

export const isHalfWidthPunctuationWithoutSpaceAround = (
  group: GroupToken,
  token: Token
): boolean => {
  const tokenBefore = findTokenBefore(group, token)
  const tokenAfter = findTokenAfter(group, token)

  if (
    token.type === CharType.PUNCTUATION_HALF &&
    tokenBefore &&
    tokenBefore.type === CharType.LETTERS_HALF &&
    tokenAfter &&
    tokenAfter.type === CharType.LETTERS_HALF
  ) {
    return !tokenBefore.spaceAfter && !token.spaceAfter
  }

  return false
}

export const isSuccessiveHalfWidthPunctuation = (
  group: GroupToken,
  token: Token
): boolean => {
  if (token.type === CharType.PUNCTUATION_HALF) {
    const tokenBefore = findTokenBefore(group, token)
    const tokenAfter = findTokenAfter(group, token)
    if (
      (tokenBefore &&
        tokenBefore.type === CharType.PUNCTUATION_HALF &&
        !tokenBefore.spaceAfter) ||
      (tokenAfter &&
        tokenAfter.type === CharType.PUNCTUATION_HALF &&
        !token.spaceAfter)
    ) {
      return true
    }
  }
  return false
}

// validations helpers

const createValidation = (
  token: Token,
  target: ValidationTarget,
  message: string,
  name: string
): Validation => {
  const validation: Validation = {
    index: token.index,
    length: token.length,
    target,
    name,
    message
  }
  if (target === ValidationTarget.START_CONTENT) {
    validation.index = (token as GroupToken).startIndex
    validation.length = 0
  } else if (target === ValidationTarget.END_CONTENT) {
    validation.index = (token as GroupToken).endIndex
    validation.length = 0
  } else if (target === ValidationTarget.INNER_SPACE_BEFORE) {
    validation.index = (token as GroupToken).startIndex
    validation.length = (token as GroupToken).startContent.length
  }
  return validation
}

export const setValidationOnTarget = (
  token: Token,
  target: ValidationTarget,
  message: string,
  name: string
): void => {
  const validation = createValidation(token, target, message, name)
  removeValidationOnTarget(token, target)
  token.validations.push(validation)
}

export const hasValidationOnTarget = (
  token: Token,
  target: ValidationTarget
): boolean => {
  return token.validations.some((validation) => validation.target === target)
}

export const removeValidationOnTarget = (
  token: Token,
  target: ValidationTarget
): void => {
  token.validations = token.validations.filter(
    (validation) => validation.target !== target
  )
}

// validation checkers

type Checker = (token: Token, value: string, message: string) => void

const genChecker = (
  key: keyof Token | keyof GroupToken,
  target: ValidationTarget
): Checker => {
  return (token: Token, value: string, message: string) => {
    if (token[key] !== value) {
      token[key] = value
      setValidationOnTarget(token, target, message, '')
    }
  }
}

export const checkSpaceAfter: Checker = genChecker(
  'modifiedSpaceAfter',
  ValidationTarget.SPACE_AFTER
)

export const checkStartContent: Checker = genChecker(
  'modifiedStartContent',
  ValidationTarget.START_CONTENT
)

export const checkEndContent: Checker = genChecker(
  'modifiedEndContent',
  ValidationTarget.END_CONTENT
)

export const checkInnerSpaceBefore: Checker = genChecker(
  'modifiedInnerSpaceBefore',
  ValidationTarget.INNER_SPACE_BEFORE
)

export const checkContent = (
  token: Token,
  value: string,
  type: TokenType,
  message: string
): void => {
  if (token.modifiedContent === value) {
    return
  }
  token.modifiedContent = value
  token.modifiedType = type
  setValidationOnTarget(token, ValidationTarget.CONTENT, message, '')
}
