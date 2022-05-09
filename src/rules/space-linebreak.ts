/**
 * @fileoverview
 * 
 * This rule is used to revert changes of spaceAfter with linebreaks.
 * And it's compulsory.
 * 
 * TODO: better blockquote and indentation handling in markdown
 */

import { Handler, MutableToken } from "../parser";
import { ValidationTarget } from "../report";
import { Options, removeValidation } from "./util";

const generateHandler = (options: Options): Handler => {
  // do nothing
  options

  return (token: MutableToken) => {
    if (token.spaceAfter && token.spaceAfter.match(/\n/)) {
      removeValidation(token, '', ValidationTarget.SPACE_AFTER)
      token.modifiedSpaceAfter = token.spaceAfter
    }
  }
}

export const defaultConfig: Options = {}

export default generateHandler
