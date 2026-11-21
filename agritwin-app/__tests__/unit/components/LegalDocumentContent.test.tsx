import React from 'react';
import { render, screen } from '@testing-library/react-native';

import LegalDocumentContent from '@/components/LegalDocumentContent';

describe('LegalDocumentContent', () => {
  it('renders paragraphs, headings, quotes, and skips separators', () => {
    render(
      <LegalDocumentContent
        content={
          '# Title *#*\r\n\r\n---\r\nA paragraph.\r\n> A quote\r\n### Subheading *#*'
        }
      />,
    );

    expect(screen.getByText('Title')).toBeTruthy();
    expect(screen.getByText('A paragraph.')).toBeTruthy();
    expect(screen.getByText('A quote')).toBeTruthy();
    expect(screen.getByText('Subheading')).toBeTruthy();
    expect(screen.queryByText('---')).toBeNull();
  });

  it('renders unordered, ordered, and indented list items', () => {
    const { toJSON } = render(
      <LegalDocumentContent
        content={'- First item\n  * Nested item\n2) Second item'}
      />,
    );

    expect(screen.getByText('• First item')).toBeTruthy();
    expect(screen.getByText('• Nested item')).toBeTruthy();
    expect(screen.getByText('2) Second item')).toBeTruthy();

    const rendered = JSON.stringify(toJSON());
    expect(rendered).toContain('• ');
    expect(rendered).toContain('2) ');
  });

  it('renders bold, italic, code, and link spans inline', () => {
    render(
      <LegalDocumentContent
        content={
          'Plain **bold** __strong__ *italic* _emphasis_ `code` [link](https://example.test/path)'
        }
      />,
    );

    for (const text of [
      'bold',
      'strong',
      'italic',
      'emphasis',
      'code',
      'link',
    ]) {
      expect(screen.getByText(text)).toBeTruthy();
    }
  });

  it('keeps unmatched and multiline delimiters as plain text', () => {
    const { toJSON } = render(
      <LegalDocumentContent
        content={
          '**unclosed _marker `code\n[link](https://example.test/a(b))\n[unclosed\n[label] plain\n[empty]()'
        }
      />,
    );

    expect(screen.getByText('**unclosed _marker `code')).toBeTruthy();
    expect(screen.getByText('[link](https://example.test/a(b))')).toBeTruthy();
    const rendered = JSON.stringify(toJSON());
    expect(rendered).toContain('[unclosed');
    expect(rendered).toContain('[label] plain');
    expect(rendered).toContain('[empty]()');
  });

  it('keeps malformed headings, lists, and short separators as paragraphs', () => {
    render(
      <LegalDocumentContent
        content={
          '--\n...\n#No space *#*\n## Missing suffix\n## Has * mark *#*\n-\n4.no-space\n3x invalid'
        }
      />,
    );

    for (const text of [
      '--',
      '...',
      '## Missing suffix',
      '-',
      '4.no-space',
      '3x invalid',
    ]) {
      expect(screen.getByText(text)).toBeTruthy();
    }
  });
});
