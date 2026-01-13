import sanitizeHtml from 'sanitize-html';
import { stripHtml } from '@/lib/text-utils';

type SanitizedComment = {
  sanitizedHtml: string;
  plain: string;
};

export function sanitizeCommentHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li', 'a', 'span'],
    allowedAttributes: {
      a: ['href', 'title', 'rel'],
      span: ['class'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { rel: 'nofollow noopener noreferrer' }),
    },
  });
}

export function extractPlainCommentText(html: string): string {
  return stripHtml(html, { replaceNbsp: true });
}

export function sanitizeCommentBody(html: string): SanitizedComment {
  const sanitizedHtml = sanitizeCommentHtml(html);
  const plain = extractPlainCommentText(sanitizedHtml);
  return { sanitizedHtml, plain };
}
