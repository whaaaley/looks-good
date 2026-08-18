import { docUrl } from '../utils/docs.utils.ts'
import { isSingleLine, locationOf } from '../utils/location.utils.ts'
import type { Rule } from 'eslint'
import type { ArrayExpression, Expression } from 'estree'

const rule: Rule.RuleModule = {
  meta: {
    type: 'layout',
    docs: {
      description: 'An array of object literals hugs its brackets, opening [{ and closing }] with }, { between elements',
      url: docUrl('array-bracket-hug'),
    },
    fixable: 'whitespace',
    schema: [],
    messages: {
      hugOpen: 'The bracket opens an array of objects, so the first { belongs on this line',
      hugSeam: 'The next object continues the array, so its { belongs beside this },',
      hugClose: 'The bracket closes an array of objects, so it belongs beside the last }',
    },
  },
  create(context): Rule.RuleListener {
    const { sourceCode } = context

    // Hugging is for blocks: a list of single-line objects reads as a list, not a chain.
    const objectElements = (node: ArrayExpression): Expression[] => {
      const elements: Expression[] = []

      for (const element of node.elements) {
        if (!element || element.type !== 'ObjectExpression') return []

        if (isSingleLine(element)) return []

        elements.push(element)
      }

      return elements
    }

    // A comment between the brackets anchors the expanded form, since the chain has no line to hold it.
    // A partial fix would leave a hybrid the formatter reflows destructively, so the whole array opts out.
    const hasGapComment = (node: ArrayExpression, elements: Expression[]): boolean => {
      for (const comment of sourceCode.getCommentsInside(node)) {
        if (!comment.range) return true

        const [commentStart, commentEnd] = comment.range
        const isInsideElement = elements.some((element) => {
          if (!element.range) return false

          const [elementStart, elementEnd] = element.range
          return elementStart <= commentStart && commentEnd <= elementEnd
        })

        if (!isInsideElement) return true
      }

      return false
    }

    const check = (node: ArrayExpression): void => {
      const elements = objectElements(node)
      const [first] = elements
      if (!first) return
      if (hasGapComment(node, elements)) return

      const opening = sourceCode.getFirstToken(node)
      const closing = sourceCode.getLastToken(node)
      if (!opening || !closing) return

      const firstToken = sourceCode.getFirstToken(first)
      const firstLocation = locationOf(first)
      if (!firstToken || !firstLocation) return

      if (opening.loc.end.line !== firstLocation.start.line) {
        const [, from] = opening.range
        const [to] = firstToken.range

        context.report({
          loc: opening.loc.start,
          messageId: 'hugOpen',
          fix: (fixer): Rule.Fix => fixer.replaceTextRange([from, to], ''),
        })
      }

      elements.forEach((element, index) => {
        const next = elements[index + 1]
        if (!next) return

        const elementLocation = locationOf(element)
        const nextLocation = locationOf(next)
        if (!elementLocation || !nextLocation) return
        if (elementLocation.end.line === nextLocation.start.line) return

        const elementToken = sourceCode.getLastToken(element)
        const nextToken = sourceCode.getFirstToken(next)
        if (!elementToken || !nextToken) return

        const [, from] = elementToken.range
        const [to] = nextToken.range

        context.report({
          loc: nextToken.loc.start,
          messageId: 'hugSeam',
          fix: (fixer): Rule.Fix => fixer.replaceTextRange([from, to], ', '),
        })
      })

      const last = elements[elements.length - 1]
      if (!last) return

      const lastLocation = locationOf(last)
      if (!lastLocation) return
      if (lastLocation.end.line === closing.loc.start.line) return

      const lastToken = sourceCode.getLastToken(last)
      if (!lastToken) return

      // Swallowing the trailing comma is intentional: the compact chain closes }] with no comma before it.
      const [, from] = lastToken.range
      const [to] = closing.range

      context.report({
        loc: closing.loc.start,
        messageId: 'hugClose',
        fix: (fixer): Rule.Fix => fixer.replaceTextRange([from, to], ''),
      })
    }

    return { ArrayExpression: check }
  },
}

export default rule
