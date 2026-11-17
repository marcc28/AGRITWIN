import { Fragment } from 'react';
import { StyleSheet, Text, View } from 'react-native';

type Props = { content: string };

function renderInline(text: string, keyPrefix: string) {
  const tokenPattern =
    /(\*\*[^*\r\n]+\*\*|__[^_\r\n]+__|\*[^*\r\n]+\*|_[^_\r\n]+_|`[^`\r\n]+`|\[[^\]\r\n]+\]\([^)()\r\n]+\))/g;
  const pieces = text.split(tokenPattern).filter(Boolean);

  return pieces.map((piece, index) => {
    const key = `${keyPrefix}-${index}`;
    const link = piece.match(/^\[([^\]]+)\]\([^)]+\)$/);
    if (link)
      return (
        <Text key={key} style={styles.link}>
          {link[1]}
        </Text>
      );
    if (
      (piece.startsWith('**') && piece.endsWith('**')) ||
      (piece.startsWith('__') && piece.endsWith('__'))
    ) {
      return (
        <Text key={key} style={styles.bold}>
          {piece.slice(2, -2)}
        </Text>
      );
    }
    if (
      (piece.startsWith('*') && piece.endsWith('*')) ||
      (piece.startsWith('_') && piece.endsWith('_'))
    ) {
      return (
        <Text key={key} style={styles.italic}>
          {piece.slice(1, -1)}
        </Text>
      );
    }
    if (piece.startsWith('`') && piece.endsWith('`')) {
      return (
        <Text key={key} style={styles.code}>
          {piece.slice(1, -1)}
        </Text>
      );
    }
    return <Fragment key={key}>{piece}</Fragment>;
  });
}

export default function LegalDocumentContent({ content }: Props) {
  const lines = content.replace(/\r\n?/g, '\n').split('\n');
  const blocks: {
    type: string;
    text: string;
    depth?: number;
    marker?: string;
  }[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();
    if (!trimmed || /^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) continue;

    const heading = trimmed.match(/^(#{1,6})\s+([^*]+)\s\*#\*$/);
    if (heading) {
      blocks.push({ type: `h${heading[1].length}`, text: heading[2] });
      continue;
    }
    const quote = trimmed.match(/^>\s?(.*)$/);
    if (quote) {
      blocks.push({ type: 'quote', text: quote[1] });
      continue;
    }
    const list = line.match(/^\s*(?:[-*+]|\d+[.)])\s+(.*)$/);
    if (list) {
      blocks.push({
        type: 'list',
        text: list[3],
        depth: Math.floor(list[1].length / 2),
        marker: /^\d/.test(list[2]) ? list[2].trim() : '•',
      });
      continue;
    }
    blocks.push({ type: 'paragraph', text: trimmed });
  }

  return (
    <View>
      {blocks.map((block, index) => (
        <Text
          key={`${block.type}-${index}`}
          style={[
            styles.paragraph,
            block.type.startsWith('h') && styles.heading,
            block.type === 'h1' && styles.title,
            block.type === 'h3' && styles.subheading,
            block.type === 'quote' && styles.quote,
            block.type === 'list' && styles.listItem,
            block.type === 'list' && {
              marginLeft: 8 + (block.depth ?? 0) * 18,
            },
          ]}
        >
          {block.type === 'list' ? `${block.marker} ` : null}
          {renderInline(block.text, `block-${index}`)}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  paragraph: {
    color: '#26332B',
    fontSize: 15,
    lineHeight: 23,
    marginBottom: 12,
  },
  heading: {
    color: '#183D2A',
    fontSize: 19,
    fontWeight: '700',
    lineHeight: 26,
    marginTop: 14,
    marginBottom: 9,
  },
  title: {
    fontSize: 23,
    lineHeight: 30,
    marginTop: 0,
    marginBottom: 14,
  },
  subheading: { fontSize: 17, lineHeight: 24 },
  quote: {
    borderLeftWidth: 3,
    borderLeftColor: '#7A9B71',
    color: '#526257',
    fontStyle: 'italic',
    paddingLeft: 12,
  },
  listItem: { marginBottom: 8 },
  bold: { fontWeight: '700' },
  italic: { fontStyle: 'italic' },
  code: {
    backgroundColor: '#EEF2ED',
    color: '#31533E',
    fontFamily: 'monospace',
  },
  link: { color: '#276B45', textDecorationLine: 'underline' },
});
