import pathToRegexp, { Key } from "path-to-regexp";
import { HandlerBundle, HandlerInfo, Method, PathHandler } from "..";

export default class MiniRouter {
  _methods: Record<Method, HandlerInfo[]>;

  constructor() {
    this._methods = {
      get: [],
      post: [],
      put: [],
      delete: [],
      use: [],
    };
  }

  _push(method: Method, pathMatch: string, callback: PathHandler): void {
    pathMatch = pathMatch.replace(/^\//g, "");
    const keys: Key[] = [];
    this._methods[method].push({
      pathComponent: pathMatch,
      pathRegExp: pathToRegexp(pathMatch, keys),
      pathKeys: keys,
      callback,
    });
  }

  get(pathMatch: string, callback: PathHandler): void {
    this._push("get", pathMatch, callback);
  }

  post(pathMatch: string, callback: PathHandler): void {
    this._push("post", pathMatch, callback);
  }

  put(pathMatch: string, callback: PathHandler): void {
    this._push("put", pathMatch, callback);
  }

  delete(pathMatch: string, callback: PathHandler): void {
    this._push("delete", pathMatch, callback);
  }

  all(pathMatch: string, callback: PathHandler) {
    this.get(pathMatch, callback);
    this.post(pathMatch, callback);
    this.put(pathMatch, callback);
    this.delete(pathMatch, callback);
  }

  use(pathMatch: string, handler: MiniRouter | PathHandler) {
    const keys: Key[] = [];
    pathMatch = pathMatch.replace(/^\//g, "");
    const use: HandlerInfo = {
      pathComponent: pathMatch,
      pathRegExp: pathToRegexp(pathMatch, keys, { end: false }),
      pathKeys: keys,
    };
    if (handler.constructor === MiniRouter) {
      use.router = handler;
    } else if (typeof handler === "function") {
      use.callback = handler;
    } else {
      throw new Error("You can only use a router or a function");
    }
    this._methods.use.push(use);
  }

  processRequest(path: string, method: string, handlers: HandlerBundle[]) {
    path = path.replace(/^\//g, "");
    const testHandler = (tHandler: HandlerInfo) => {
      const tPathMatches = tHandler.pathRegExp.exec(path);
      if (tPathMatches) {
        const params: Record<Key["name"], string> = {};
        tHandler.pathKeys.forEach((pathKey, index) => {
          params[pathKey.name] = tPathMatches[index + 1];
        });
        handlers.push({
          params,
          fn: tHandler.callback!,
        });
      }
    };
    this._methods.use.filter((u) => !!u.callback).forEach(testHandler);
    this._methods[method.toLowerCase() as Method].forEach(testHandler);
    this._methods.use
      .filter((u) => !!u.router)
      .forEach((tHandler) => {
        const tUseMatches = tHandler.pathRegExp.exec(path);
        if (tUseMatches) {
          const useHandlers: HandlerBundle[] = [];
          const params: Record<Key["name"], string> = {};
          tHandler.pathKeys.forEach((pathKey, index) => {
            params[pathKey.name] = tUseMatches[index + 1];
          });
          tHandler.router!.processRequest(
            path.replace(tUseMatches[0], ""),
            method,
            useHandlers
          );
          useHandlers.forEach((tUseHandler) => {
            tUseHandler.params = Object.assign({}, params, tUseHandler.params);
            handlers.push(tUseHandler);
          });
        }
      });
  }
}
