import * as cds from "@sap/cds";
import * as handlerSymbol from "./handlers/symbols";
import * as handlerMaterial from "./handlers/materials";
import * as handlerCamera from "./handlers/camera";

export = (srv: cds.Service) => {
  srv.on("UPDATE", "Symbols", () => {});

  srv.after("READ", "Symbols", (data: any[]) => {
    return data;
  });

  srv.after("READ", "SymbolTranslations", (data: any[]) => {
    console.log(data);
    return data;
  });

  srv.on("translateSymbolBound", "Symbols", (req: any) => {
    return handlerSymbol.translate(req);
  });

  srv.on("order", "Materials", (req: any) => {
    return handlerMaterial.order(req);
  });

  srv.on("produce", "ProductCamera", (req: any) => {
    return handlerMaterial.produce(req);
  });

  srv.on("replace", "Installation", (req: any) => {
    return handlerMaterial.replaceInstallation(req);
  });

  // Removed the before READ check that was blocking all CameraImages reads
  // srv.before("READ", "CameraImages", req => handlerCamera.checkCameraAvailability(req));

  srv.on("checkCameraAvailability", async (req) => {
    return handlerCamera.areAllCamerasAvailable(req);
  });

  srv.on("getCamerarecordingIdForLocation", async (req) => {
    return handlerCamera.getCamerarecordingIdForLocation(req);
  });

};
