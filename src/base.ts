export const baseTsContent = `export type Result<a, b>
  = ["Ok", a]
  | ["Err", b]

  
export const networkId = '1337'

export async function tryCall(method: any, from: string): Promise<Result<any, any>> {
  try {
    const result = await method.call({ from })
    return ["Ok", result]
  } catch (e) {
    return ["Err", e]
  }
}

export async function trySendAfterCall(
  method: any,
  from: string,
  extraOptions: any = {}
): Promise<Result<any, any>> {
  try {
    const options = { from, ...extraOptions }
    await method.call(options)
    const result = await method.send(options)
    return result
  } catch (e) {
    return ["Err", e]
  }
}

export type ErrorHandler = {
  handle: (e: any) => any
}

export class ContractService {
  private static _instance: ContractService

  private _handlers: ErrorHandler[] = []

  private constructor() {

  }

  public static get instance() {
    if (this._instance === null) {
      this._instance = new ContractService()
    }
    return this._instance
  }

  public addErrorHandler(errorHandler: ErrorHandler) {
    this._handlers.push(errorHandler)
  }

  public handleError(e: any) {
    this._handlers.forEach(f => f.handle(e))
  }
}

export class Service {
  constructor(private method: any, private isSend = false) {
  }

  async exec() {
    const result = this.isSend
      ? await trySendAfterCall(this.method, "")
      : await tryCall(this.method, "")
    if (result[0] === "Err") {
      ContractService.instance.handleError(result[1])
    }
    return result
  }

  async execWithError() {
    const result = this.isSend
      ? await trySendAfterCall(this.method, "")
      : await tryCall(this.method, "")
    if (result[0] === "Err") {
      ContractService.instance.handleError(result[1])
      throw new Error(result[1])
    } else {
      return result[1]
    }
  }
}`