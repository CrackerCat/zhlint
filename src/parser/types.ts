// Char

import { Validation } from '../report'

export enum CharType {
  EMPTY = 'empty',
  SPACE = 'space',
  CONTENT_HALF = 'content-half',
  CONTENT_FULL = 'content-full',
  PUNCTUATION_HALF = 'punctuation-half',
  PUNCTUATION_FULL = 'punctuation-full',
  UNKNOWN = 'unknown'
}

type CharSet = {
  [setName: string]: string
}

export const MARK_CHAR_SET: CharSet = {
  left: '(（',
  right: ')）'
}
export const GROUP_CHAR_SET: CharSet = {
  left: `“‘《〈『「【{`,
  right: `”’》〉』」】}`,
  neutral: `'"`
}
export const SHORTHAND_CHARS = `'’`
export const SHORTHAND_PAIR_SET: CharSet = {
  [`'`]: `'`,
  [`’`]: `‘`
}

// Reusable

type Pair = {
  startIndex: number
  startContent: string
  endIndex: number
  endContent: string
}

type MutablePair = {
  modifiedStartContent: string
  modifiedEndContent: string
}

// Mark

export enum MarkType {
  BRACKETS = 'brackets',
  HYPER = 'hyper',
  RAW = 'raw'
}

export enum MarkSideType {
  LEFT = 'left',
  RIGHT = 'right'
}

export type Mark = Pair & {
  type: MarkType
  meta?: string // AST type enum
}

export type RawMark = Mark & {
  code: MarkSideType
  rightPair?: RawMark
}

export type MutableMark = Mark & MutablePair

export type MutableRawMark = RawMark & MutablePair

export type MarkMap = {
  [index: number]: Mark
}

export const isRawMark = (mark: Mark): mark is RawMark => {
  return (mark as RawMark).code !== undefined
}

// Token

export enum SingleTokenType {
  MARK_BRACKETS = 'mark-brackets',
  MARK_HYPER = 'mark-hyper',
  MARK_RAW = 'mark-raw',
  CONTENT_HYPER = 'content-hyper'
}

export enum GroupTokenType {
  GROUP = 'group'
}

export type TokenType = CharType | SingleTokenType | GroupTokenType

type CommonToken = {
  index: number
  length: number

  content: string
  spaceAfter: string

  mark?: Mark
  markSide?: MarkSideType
}

type MutableCommonToken = {
  modifiedContent: string
  modifiedSpaceAfter: string
  validations: Validation[]
}

export type SingleToken = CommonToken & {
  type: CharType | SingleTokenType
}

export type MutableSingleToken = CommonToken &
  MutableCommonToken & {
    type: CharType | SingleTokenType
    modifiedType: CharType | SingleTokenType
  }

export type GroupToken = Array<Token> &
  CommonToken &
  Pair & {
    type: GroupTokenType
    innerSpaceBefore: string
  }

export type MutableGroupToken = Array<MutableToken> &
  CommonToken &
  MutableCommonToken &
  Pair &
  MutablePair & {
    type: GroupTokenType
    modifiedType: GroupTokenType
    innerSpaceBefore: string
    modifiedInnerSpaceBefore: string
  }

export type Token = SingleToken | GroupToken

export type MutableToken = MutableSingleToken | MutableGroupToken

// Status

export type ParseStatus = {
  lastToken?: Token
  lastGroup?: GroupToken
  lastMark?: Mark

  tokens: GroupToken
  marks: Mark[]
  groups: GroupToken[]

  markStack: Mark[]
  groupStack: GroupToken[]
}

// Travel

export type FilterFunction = (
  token: MutableToken | Token,
  index: number,
  group: MutableGroupToken | GroupToken
) => boolean | RegExpMatchArray | null

export type Filter = FilterFunction | string | RegExp | { type: TokenType }

export type Handler = (
  token: MutableToken | Token,
  index: number,
  group: MutableGroupToken | GroupToken,
  matched: boolean | RegExpMatchArray | null,
  marks: MutableMark[] | Mark[]
) => void
