import { Fragment } from 'react';
import { StyleSheet, Text, View } from 'react-native';

type Props = { content: string };

type InlinePiece = {
  kind: 'text' | 'bold' | 'italic' | 'code' | 'link';
  text: string;
};

type InlineMatch = { piece: InlinePiece; end: number };
type CharacterIndexes = Record<string, number[]>;

function buildNextCharacterIndexes(text: string, characters: string[]) {
  const indexes: Record<string, number[]> = Object.fromEntries(
    characters.map((character) => [character, Array(text.length + 1).fill(-1)]),
  );
  const nextIndexes: Record<string, number> = Object.fromEntries(
    characters.map((character) => [character, -1]),
  );

  for (let index = text.length - 1; index >= 0; index -= 1) {
    for (const character of characters) {
      if (text[index] === character) nextIndexes[character] = index;
      indexes[character][index] = nextIndexes[character];
    }
  }

  return indexes;
}

function buildNextDoubleDelimiterIndexes(text: string, delimiter: string) {
  const indexes = Array(text.length + 1).fill(-1);
  let nextIndex = -1;

  for (let index = text.length - 1; index >= 0; index -= 1) {
    if (text[index] === delimiter && text[index + 1] === delimiter) {
      nextIndex = index;
    }
    indexes[index] = nextIndex;
  }

  return indexes;
}

function addTextPiece(pieces: InlinePiece[], text: string) {
  if (text) pieces.push({ kind: 'text', text });
}

function parseEmphasisToken(
  text: string,
  index: number,
  next: CharacterIndexes,
  nextDoubleAsterisk: number[],
  nextDoubleUnderscore: number[],
): InlineMatch | undefined {
  const character = text[index];
  const isDouble = text[index + 1] === character;
  const nextDelimiter = character === '*' ? next['*'] : next['_'];
  const nextDoubleDelimiter =
    character === '*' ? nextDoubleAsterisk : nextDoubleUnderscore;

  if (isDouble) {
    const closing = nextDoubleDelimiter[index + 2];
    if (closing <= index + 2 || nextDelimiter[index + 2] !== closing) {
      return undefined;
    }
    return {
      piece: { kind: 'bold', text: text.slice(index + 2, closing) },
      end: closing + 2,
    };
  }

  const closing = nextDelimiter[index + 1];
  if (closing <= index + 1) return undefined;
  return {
    piece: { kind: 'italic', text: text.slice(index + 1, closing) },
    end: closing + 1,
  };
}

function parseCodeToken(
  text: string,
  index: number,
  next: CharacterIndexes,
): InlineMatch | undefined {
  const closing = next['`'][index + 1];
  if (closing <= index + 1) return undefined;
  return {
    piece: { kind: 'code', text: text.slice(index + 1, closing) },
    end: closing + 1,
  };
}

function parseLinkToken(
  text: string,
  index: number,
  next: CharacterIndexes,
): InlineMatch | undefined {
  const labelEnd = next[']'][index + 1];
  if (labelEnd <= index + 1 || text[labelEnd + 1] !== '(') return undefined;

  const urlStart = labelEnd + 2;
  const urlEnd = next[')'][urlStart];
  if (urlEnd <= urlStart) return undefined;

  const nextOpenParen = next['('][urlStart];
  if (nextOpenParen >= 0 && nextOpenParen < urlEnd) return undefined;

  return {
    piece: { kind: 'link', text: text.slice(index + 1, labelEnd) },
    end: urlEnd + 1,
  };
}

function parseInlineToken(
  text: string,
  index: number,
  next: CharacterIndexes,
  nextDoubleAsterisk: number[],
  nextDoubleUnderscore: number[],
): InlineMatch | undefined {
  const character = text[index];
  if (character === '*' || character === '_') {
    return parseEmphasisToken(
      text,
      index,
      next,
      nextDoubleAsterisk,
      nextDoubleUnderscore,
    );
  }
  if (character === '`') return parseCodeToken(text, index, next);
  if (character === '[') return parseLinkToken(text, index, next);
  return undefined;
}

function tokenizeInline(text: string): InlinePiece[] {
  const next = buildNextCharacterIndexes(text, ["*", '_', '`', '[', ']', '(', ')']);
  const nextDoubleAsterisk = buildNextDoubleDelimiterIndexes(text, '*');
  const nextDoubleUnderscore = buildNextDoubleDelimiterIndexes(text, '_');
  const pieces: InlinePiece[] = [];
  let index = 0;
  let plainStart = 0;

  while (index < text.length) {
    const match = parseInlineToken(
      text,
      index,
      next,
      nextDoubleAsterisk,
      nextDoubleUnderscore,
    );

    if (match) {
      addTextPiece(pieces, text.slice(plainStart, index));
      pieces.push(match.piece);
      index = match.end;
      plainStart = match.end;
    } else {
      index += 1;
    }
  }

  addTextPiece(pieces, text.slice(plainStart));
  return pieces;
}

function renderInline(text: string, keyPrefix: string) {
  return tokenizeInline(text).map((piece, index) => {
    const key = `${keyPrefix}-${index}`;
    if (piece.kind === 'link')
      return (
        <Text key={key} style={styles.link}>
          {piece.text}
        </Text>
      );
    if (piece.kind === 'bold') {
      return (
        <Text key={key} style={styles.bold}>
          {piece.text}
        </Text>
      );
    }
    if (piece.kind === 'italic') {
      return (
        <Text key={key} style={styles.italic}>
          {piece.text}
        </Text>
      );
    }
    if (piece.kind === 'code') {
      return (
        <Text key={key} style={styles.code}>
          {piece.text}
        </Text>
      );
    }
    return <Fragment key={key}>{piece.text}</Fragment>;
  });
}

function isHorizontalRule(text: string) {
  if (text.length < 3) return false;
  const marker = text[0];
  if (marker !== '-' && marker !== '*' && marker !== '_') return false;

  for (const character of text) {
    if (character !== marker) return false;
  }
  return true;
}

function parseHeading(text: string) {
  let level = 0;
  while (level < 6 && text[level] === '#') level += 1;
  if (level === 0 || text[level] !== ' ') return null;

  const suffix = ' *#*';
  const headingText = text.slice(level).trimStart();
  if (!headingText.endsWith(suffix)) return null;

  const title = headingText.slice(0, -suffix.length);
  if (!title || title.includes('*')) return null;
  return { type: `h${level}`, text: title, depth: 0 };
}

function isWhitespaceCharacter(character: string | undefined) {
  return character !== undefined && character.trim() === '';
}

function parseListItem(line: string) {
  const depth = line.length - line.trimStart().length;
  const trimmed = line.trimStart();
  let markerEnd = 0;
  let marker = '•';

  if (
    (trimmed[0] === '-' || trimmed[0] === '*' || trimmed[0] === '+') &&
    isWhitespaceCharacter(trimmed[1])
  ) {
    markerEnd = 1;
  } else {
    while (markerEnd < trimmed.length && trimmed[markerEnd] >= '0' && trimmed[markerEnd] <= '9') {
      markerEnd += 1;
    }
    const listTerminator = trimmed[markerEnd];
    if (
      markerEnd === 0 ||
      (listTerminator !== '.' && listTerminator !== ')') ||
      !isWhitespaceCharacter(trimmed[markerEnd + 1])
    ) {
      return null;
    }
    marker = trimmed.slice(0, markerEnd + 1);
    markerEnd += 1;
  }

  while (isWhitespaceCharacter(trimmed[markerEnd])) markerEnd += 1;
  return {
    type: 'list',
    text: trimmed.slice(markerEnd),
    depth: Math.floor(depth / 2),
    marker,
  };
}

export default function LegalDocumentContent({ content }: Props) {
  const lines = content.replace(/\r\n?/g, '\n').split('\n');
  const blocks: {
    type: string;
    text: string;
    depth: number;
    marker?: string;
  }[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();
    if (!trimmed || isHorizontalRule(trimmed)) continue;

    const heading = parseHeading(trimmed);
    if (heading) {
      blocks.push(heading);
      continue;
    }
    if (trimmed.startsWith('>')) {
      blocks.push({
        type: 'quote',
        text: trimmed.slice(1).trimStart(),
        depth: 0,
      });
      continue;
    }
    const list = parseListItem(line);
    if (list) {
      blocks.push(list);
      continue;
    }
    blocks.push({ type: 'paragraph', text: trimmed, depth: 0 });
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
              marginLeft: 8 + block.depth * 18,
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
