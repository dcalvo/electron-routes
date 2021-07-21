import {
  app,
  Privileges,
  protocol,
  ProtocolRequest,
  ProtocolResponse,
  session,
} from "electron";
import MiniRouter, { HandlerBundle } from "./MiniRouter";
import { WritableStreamBuffer } from "stream-buffers";
import { Response, RouterUploadData } from "..";

class Router extends MiniRouter {
  static schemes: string[] = [];
  schemeName: string;

  constructor(
    schemeName = "app",
    schemePrivileges: Privileges,
    partitionKey: string
  ) {
    if (app.isReady()) {
      throw new Error("Router must be initialized before the app is ready");
    }
    if (Router.schemes.includes(schemeName)) {
      throw new Error(
        `Reusing router schemes is not allowed, there is already a scheme registed called ${schemeName}`
      );
    }
    super();
    this.schemeName = schemeName;
    Router.schemes.push(schemeName);
    protocol.registerSchemesAsPrivileged([
      { scheme: schemeName, privileges: schemePrivileges },
    ]);
    app.on("ready", () => {
      let mProtocol = protocol;
      if (partitionKey) {
        mProtocol = session.fromPartition(partitionKey).protocol;
      }
      mProtocol.registerBufferProtocol(schemeName, this._handle.bind(this));
    });
  }

  _nicePost(uploadData: RouterUploadData[]) {
    return uploadData.map((data) => {
      if (data.bytes) {
        data.stringContent = () => data.bytes!.toString();
        data.json = () => JSON.parse(data.stringContent!());
      }
      return data;
    });
  }

  _handle(request: ProtocolRequest, cb: (response: ProtocolResponse) => void) {
    const callback = (
      data: Buffer | string | undefined,
      mimeType = "text/html"
    ) => {
      if (data === undefined) {
        cb({ error: -6 });
      }
      if (typeof data === "string") {
        data = Buffer.from(data);
      }
      cb({
        mimeType,
        data,
      });
    };

    const { url, referrer, method, uploadData } = request;
    const path = url.substr(this.schemeName.length + 3);
    const handlers: HandlerBundle[] = [];
    this.processRequest(path, method, handlers);
    if (handlers.length === 0) {
      callback(undefined);
    } else {
      let calledBack = false;
      // Move out of scope so it can be mutated
      const req = {
        params: {},
        method,
        referrer,
        uploadData: this._nicePost(uploadData || []),
        url: request.url,
        headers: {},
      };
      const attemptHandler = (index: number) => {
        const tHandler = handlers[index];
        req.params = tHandler.params;
        const called =
          (fn: (...args: any[]) => any) =>
          (...args: any[]) => {
            if (calledBack) throw new Error("Already callled back");
            calledBack = true;
            fn(...args);
          };

        let res = new WritableStreamBuffer({
          initialSize: 1024 * 1024,
          incrementAmount: 10 * 1024,
        });
        const originalEnd = res.end.bind(res);
        const routerRes: Response = Object.assign(res, {
          json: called((object: object) => callback(JSON.stringify(object))),
          send: called((string: string, mimeType: string) =>
            callback(string, mimeType)
          ),
          notFound: called(() => callback(undefined)),
          end: called((data, ...args) => {
            originalEnd(data, ...args);
            if (typeof data === "string") {
              callback(data);
            } else if (data instanceof Buffer) {
              callback(data);
            } else if (
              res.size() > 0 &&
              (res.getContentsAsString("utf8") as string).length > 0
            ) {
              callback(res.getContentsAsString("utf8") as string);
            } else {
              callback("");
            }
          }),
          setHeader: () => undefined,
          getHeader: () => undefined,
        });

        const next = () => {
          if (calledBack)
            throw new Error(
              "Can't call next once data has already been sent as a response"
            );
          if (index + 1 < handlers.length) {
            attemptHandler(index + 1);
          } else {
            routerRes.notFound();
          }
        };
        tHandler.fn(req, routerRes, next);
      };
      attemptHandler(0);
    }
  }
}

module.exports = Router;
