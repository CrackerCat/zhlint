import { Data } from './types'

// TODO: ::: tips 提示...
//
// ::: xxx\nyyy\nzzz\n:::\n
// - `(?<=^|\n)` + `(:::.*)`
// - `\n`
// - `(.+)`
// - `\n`
// - `(:::)` + `(?=\n|$)`
const matcher = /(?<=^|\n)(:::.*)\n([\s\S]+?)\n(:::)(?=\n|$)/g

const parser = (data: Data): Data => {
  data.modifiedContent = data.modifiedContent.replace(
    matcher,
    (raw: string, start: string, content: string, end: string, index: number) => {
      const { length } = raw
      const name = start.substring(3).trim().split(' ')[0] || 'default'
      data.ignoredByParsers.push({
        name,
        index,
        length: start.length,
        originContent: start,
        meta: `vuepress-${name}-start`
      })
      data.ignoredByParsers.push({
        name,
        index: index + length - 3,
        length: 3,
        originContent: end,
        meta: `vuepress-${name}-end`
      })
      return '@'.repeat(start.length) + '\n' + content + '\n' + '@'.repeat(3)
    }
  )
  return data
}

export default parser
