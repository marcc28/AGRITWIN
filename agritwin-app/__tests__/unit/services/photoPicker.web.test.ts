import { choosePhoto } from '../../../src/services/photoPicker.web';

type Listener = () => void;

function createFakeInput() {
  const listeners: Record<string, Listener> = {};
  const attributes: Record<string, string> = {};
  return {
    type: '',
    accept: '',
    style: { display: '' },
    files: null as File[] | null,
    click: jest.fn(),
    remove: jest.fn(),
    setAttribute: (name: string, value: string) => {
      attributes[name] = value;
    },
    getAttribute: (name: string) => attributes[name] ?? null,
    addEventListener: (event: string, listener: Listener) => {
      listeners[event] = listener;
    },
    fire: (event: string) => listeners[event](),
  };
}

describe('web photo picker', () => {
  const originalDocument = global.document;
  const originalCreateObjectURL = URL.createObjectURL;
  let input: ReturnType<typeof createFakeInput>;

  beforeEach(() => {
    input = createFakeInput();
    global.document = {
      createElement: () => input,
      body: { appendChild: jest.fn() },
    } as unknown as Document;
    URL.createObjectURL = jest.fn(() => 'blob:plant');
  });

  afterEach(() => {
    global.document = originalDocument;
    URL.createObjectURL = originalCreateObjectURL;
  });

  it('returns the selected file and removes the input', async () => {
    const promise = choosePhoto(false);
    const file = { type: 'image/png' } as File;

    expect(input.click).toHaveBeenCalled();
    expect(input.accept).toBe('image/jpeg,image/png');
    input.files = [file];
    input.fire('change');

    await expect(promise).resolves.toEqual({
      uri: 'blob:plant',
      mimeType: 'image/png',
      file,
    });
    expect(input.remove).toHaveBeenCalled();
  });

  it('asks for the back camera when taking a photo', () => {
    void choosePhoto(true);

    expect(input.getAttribute('capture')).toBe('environment');
  });

  it('returns null when the user cancels', async () => {
    const promise = choosePhoto(false);

    input.fire('cancel');

    await expect(promise).resolves.toBeNull();
    expect(input.remove).toHaveBeenCalled();
  });
});
