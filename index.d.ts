import type { Privileges, UploadData } from "electron";

interface RouterModule {
  Router: typeof Router;
  MiniRouter: typeof MiniRouter;
  /**
   * Enables CORS and the fetch API with your custom schemes
   */
  rendererPreload: () => void;
}

interface RouterUploadData extends UploadData {
  json?: () => any;
  stringContent?: () => string;
}

export interface Request {
  /**
   * An object of all the URL params that resulted in this path being valid.
   */
  params: any;
  /**
   * The HTTP method that caused this request. Normally one of get, post, put or delete.
   */
  method: string;
  /**
   * The URL that referred the client to this URL
   */
  referrer: string;
  /**
   * An array of Electron's uploadData objects. They follow the same structure as found in the Electron docs but with two extra methods.
   */
  uploadData: RouterUploadData[];
  /**
   * The URL of the Request
   */
  url: string;
  /**
   * The headers of the request, currently a permenantly empty object
   */
  headers: any;
}

export interface Response {
  /**
   * Will immediately terminate the request sending a stringified version of the object back to the client.
   */
  json(object: any): void;
  /**
   * Will immediately terminate the request sending the string as the response text back to the client.
   */
  send(content: string | Buffer): void;
  /**
   * Will immediately terminate the request with a 404 File Not Found response
   */
  notFound(): void;
  /**
   * Immediately sends the response with the given data
   */
  end(response: string | Buffer | Buffer[]): void;
  getHeader(name?: string): undefined;
  setHeader(name?: string, value?: string): undefined;
}

export class Router extends MiniRouter {
  /**
   * Constructs a new top level router for the given scheme
   * By default scheme = "app"
   */
  constructor(scheme?: string, privileges?: Privileges);
}

export interface PathHandler {
  (request: Request, response: Response, next: Function): void;
}

export class MiniRouter {
  constructor();
  get(pathMatch: string, handler: PathHandler): void;
  post(pathMatch: string, handler: PathHandler): void;
  put(pathMatch: string, handler: PathHandler): void;
  delete(pathMatch: string, handler: PathHandler): void;
  use(pathMatch: string, handler: PathHandler): void;
  foo(): void;

  use(pathMatch: string, handler: MiniRouter): void;
}
