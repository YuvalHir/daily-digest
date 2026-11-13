export const plainMoves = (text: string) =>
  text.replace(/\{\{move:([+-]\d+(?:\.\d+)?%)\}\}/g, '$1');
