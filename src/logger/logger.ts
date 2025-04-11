export class Logger {
  name: string;

  constructor(name: string) {
    this.name = name;
  }

  log(message: string): void {
    const now = new Date().toISOString().substring(11, 19);
    const logName = this.yellow(`[${this.name}]`);
    const timestamp = this.blue(`[${now}]`);
    console.log(`${logName} ${timestamp}: `, message);
  }

  private yellow(text: string): string {
    return `\x1b[33m${text}\x1b[0m`;
  }

  private blue(text: string): string {
    return `\x1b[34m${text}\x1b[0m`;
  }
}
