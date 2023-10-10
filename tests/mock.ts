export const MockedSentry = () => ({
  addBreadcrumb: jest.fn(),
  setUser: jest.fn(),
  setTag: jest.fn(),
  setExtra: jest.fn(),
  setExtras: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
});

export const MockedConsole = () => ({
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
});

export class MockResponse {
  body: string;
  status: number = 200;
  headers: Map<string, string> = new Map();
  ok = true;
  constructor(body: string, data?: any) {
    this.body = body;
    if (data) {
      this.status = data.status || 200;
      this.headers = new Map(Object.entries(data.headers || {}));
      this.ok = data.ok ?? true;
    }
  }
  async json() {
    return JSON.parse(this.body);
  }
  async text() {
    return this.body;
  }
}
