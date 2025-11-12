import Controller from "sap/ui/core/mvc/Controller";
import ui5Event from "sap/ui/base/Event";
import Component from "../Component";
import { LayoutType } from "sap/f/library";
import JSONModel from "sap/ui/model/json/JSONModel";
import UIComponent from "sap/ui/core/UIComponent";
import { Route$MatchedEvent } from "sap/ui/core/routing/Route";
import Filter from "sap/ui/model/Filter";
import FilterOperator from "sap/ui/model/FilterOperator";

/**
 * @namespace flexso.cap.htf.securityoverview.controller
 */
export default class Master extends Controller {
  private appViewModel: JSONModel;

  public onInit(): void {
    //Routings can be tricky! Don't hesitate to ask for help if you get stuck
    const router = (this.getOwnerComponent() as Component).getRouter();
    router.getRoute("master")?.attachMatched(this.onRouteMatched.bind(this));
    router.getRoute("masterWithSelection")?.attachMatched(this.onRouteMatched.bind(this));

    //This is a local JSON Model that tracks whether a location is selected or not
    this.appViewModel = new JSONModel({
      hasSelectedLocation: false,
      allCamerasAvailable: true
    });
    this.getView()?.setModel(this.appViewModel, "appView");
    
    // Check camera availability
    this.checkCameraAvailability();
  }
  
  private async checkCameraAvailability(): Promise<void> {
    try {
      const oModel = this.getView()?.getModel();
      const binding = oModel?.bindList("/Installation", undefined, undefined, undefined, {
        $filter: "status eq 'Damaged'"
      }) as any;
      
      const contexts = await binding?.requestContexts(0, 100);
      const hasDamagedCameras = contexts && contexts.length > 0;
      
      this.appViewModel.setProperty("/allCamerasAvailable", !hasDamagedCameras);
    } catch (error) {
      console.error("Error checking camera availability:", error);
    }
  }

  private onRouteMatched(event: Route$MatchedEvent): void {
    const routeName = event.getParameter("name");

    if (routeName === "masterWithSelection") {
      const args = event.getParameter("arguments") as any;
      const cameraImageGuid = args.id;
      
      this.appViewModel.setProperty("/hasSelectedLocation", true);
      this.getView()?.bindElement({
        path: `/CameraImages(${cameraImageGuid})`,
        parameters: {
          $expand: "subnauticLocation"
        }
      });
    } else {
      this.appViewModel.setProperty("/hasSelectedLocation", false);
    }
  }

  public async onSelectLocation(oEvent: ui5Event): Promise<void> {
    //HACK THE FUTURE Challenge:
    //When a location is selected, we want to route to a different page with the details for the camera image of that location
    //The camera image GUID is different than the location guid, maybe you can write some code to get the correct one?
    const locationName = (oEvent.getParameter("value" as never) as string);
    
    if (!locationName) {
      return;
    }
    
    // Get the camera image for the selected location
    const oModel = this.getView()?.getModel();
    const binding = oModel?.bindList("/CameraImages", undefined, undefined, undefined, {
      $expand: "subnauticLocation",
      $filter: `subnauticLocation/name eq '${locationName}'`
    }) as any;
    
    const contexts = await binding?.requestContexts(0, 1);
    
    if (contexts && contexts.length > 0) {
      const cameraImageGuid = contexts[0].getProperty("ID");
      
      const router = (this.getOwnerComponent() as UIComponent).getRouter();
      router.navTo("masterWithSelection", {
        id: cameraImageGuid
      });
    }
  }

  public onSearchCameras(oEvent: ui5Event): void {
    //HACK THE FUTURE Challenge:
    //Filter the camera list based on search query to help find the monster
    // Support both 'query' (from search event) and 'newValue' (from liveChange event)
    const searchQuery = (oEvent.getParameter("query" as never) as string) || 
                       (oEvent.getParameter("newValue" as never) as string) || "";
    const list = this.byId("cameraList") as any;
    const binding = list?.getBinding("items") as any;
    
    if (!binding) {
      return;
    }
    
    if (searchQuery && searchQuery.length > 0) {
      // Filter by recording content or location (case-insensitive)
      const filter = new Filter({
        filters: [
          new Filter("recording", FilterOperator.Contains, searchQuery),
          new Filter("subnauticLocation/name", FilterOperator.Contains, searchQuery),
          new Filter("subnauticLocation/description", FilterOperator.Contains, searchQuery)
        ],
        and: false
      });
      binding.filter(filter);
    } else {
      binding.filter([]);
    }
  }

  public onCameraSelected(oEvent: ui5Event): void {
    //HACK THE FUTURE Challenge:
    //Navigate to the selected camera recording
    const listItem = oEvent.getParameter("listItem" as never) as any;
    
    if (!listItem) {
      return;
    }
    
    const cameraImageGuid = listItem.getBindingContext()?.getProperty("ID");
    
    if (cameraImageGuid) {
      const router = (this.getOwnerComponent() as UIComponent).getRouter();
      router.navTo("masterWithSelection", {
        id: cameraImageGuid
      });
    }
  }

}
