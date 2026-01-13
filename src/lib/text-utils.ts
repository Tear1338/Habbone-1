export type StripHtmlOptions = {
  replaceNbsp?: boolean;
};

export function stripHtml(input: string, options?: StripHtmlOptions): string {
  if (!input) return '';
  let output = input.replace(/<[^>]+>/g, ' ');
  if (options?.replaceNbsp) {
    output = output.replace(/&nbsp;/gi, ' ');
  }
  return output.replace(/\s+/g, ' ').trim();
}
