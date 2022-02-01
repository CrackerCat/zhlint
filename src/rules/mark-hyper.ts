// space besides hyper mark:
// add 1 space outside the most outside mark if there is any space besides mark or mark group

import { ValidationTarget } from '../report'
import {
  Handler,
  MutableGroupToken as GroupToken,
  MutableToken as Token,
  SingleTokenType
} from '../parser'
import {
  findTokenBefore,
  findMarkSeq,
  findSpaceAfterHost,
  addValidation,
  removeValidation
} from './util'

const messages: Record<string, string> = {
  inside: 'There should be no space inside a Markdown mark.',
  outside: 'There should be a space outside a Markdown mark.',
  before: 'There should be a space before a Markdown mark.',
  after: 'There should be a space after a Markdown mark.'
}

const validate = (token: Token, type: string, condition: boolean): void => {
  if (condition) {
    addValidation(
      token,
      'mark-hyper',
      ValidationTarget.SPACE_AFTER,
      messages[type]
    )
  }
}

const checkSpace = (group: GroupToken, markSeq: Token[]): boolean => {
  if (markSeq.some((markToken) => markToken.modifiedSpaceAfter)) {
    return true
  }
  const tokenBefore = findTokenBefore(group, markSeq[0])
  if (tokenBefore) {
    return !!tokenBefore.modifiedSpaceAfter
  }
  return false
}

const markHyperHandler: Handler = (token: Token, _, group: GroupToken) => {
  if (token.type === SingleTokenType.MARK_HYPER) {
    // Usually, it's `[`, `](...)`, etc.
    const markSeq = findMarkSeq(group, token)
    const tokenBeforeMarkSeq = findTokenBefore(group, markSeq[0])
    const hasSpace = checkSpace(group, markSeq)

    // Only handle the case when the current token is the first in the seq to
    // dedupe the logic.
    if (token === markSeq[0]) {
      const spaceAfterHost = findSpaceAfterHost(
        group,
        tokenBeforeMarkSeq,
        markSeq[markSeq.length - 1]
      )
      const seq = [tokenBeforeMarkSeq, ...markSeq].filter(Boolean) as Token[]
      seq.forEach((token) => {
        if (hasSpace) {
          if (token === spaceAfterHost) {
            validate(token, 'outside', token.spaceAfter !== ' ')
            token.modifiedSpaceAfter = ' '
          } else {
            removeValidation(token, '', ValidationTarget.SPACE_AFTER)
            validate(token, 'inside', !!token.spaceAfter)
            token.modifiedSpaceAfter = ''
          }
        } else {
          removeValidation(token, '', ValidationTarget.SPACE_AFTER)
          token.modifiedSpaceAfter = ''
        }
      })
    }
  }
}

export default markHyperHandler
