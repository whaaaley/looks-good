export const isLineComment = (comment: { type: string }): boolean => {
  return comment.type === 'Line'
}
