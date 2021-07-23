const { app, BrowserWindow } = require("electron"); // eslint-disable-line

let mainWindow;

global.ElectronRouter = require("../dist");

// ROUTER TESTS
global.router = new global.ElectronRouter.Router("test", {
  standard: true,
  supportFetchAPI: true,
});

global.router.get("/test", (req, res, next) => {
  console.log(req);
  console.log(req.query);
  console.log("router_route_get");
  setTimeout(next, 1000);
});

global.router.get("/:param", (req, res) => {
  console.log("router_route_get_params");
  res.json(Object.assign({ foo: "bar", thing: req.params.param }, req));
});

global.router.post("/post", (req, res) => {
  console.log(req.uploadData[0].json());
  res.json(Object.assign({ foo: "bar", thing: req.params.thing }, req));
});

// MINIROUTER TESTS
const testUse = new global.ElectronRouter.MiniRouter();

global.router.use("/mini", testUse);
testUse.use("/thing", (req, res, next) => {
  console.log("mini_route_use");
  setTimeout(next, 1000);
});

testUse.get("/thing", (req, res, next) => {
  console.log("mini_route_get");
  setTimeout(next, 1000);
});

testUse.get("/:param", (req, res) => {
  console.log("mini_route_get_params");
  res.json({ use: req.params.use, this: req.params.param });
});

function createWindow() {
  mainWindow = new BrowserWindow({ width: 800, height: 600 });

  mainWindow.loadURL(`file://${__dirname}/index.html`);

  mainWindow.webContents.openDevTools();

  mainWindow.on("closed", function () {
    mainWindow = null;
  });
}

app.on("ready", createWindow);

app.on("window-all-closed", function () {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", function () {
  if (mainWindow === null) {
    createWindow();
  }
});
