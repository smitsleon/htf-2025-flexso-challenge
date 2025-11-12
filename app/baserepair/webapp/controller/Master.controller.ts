import Controller from "sap/ui/core/mvc/Controller";
import Component from "../Component";
import formatter from "../model/formatter";
import ODataContextBinding from "sap/ui/model/odata/v4/ODataContextBinding";
import Context from "sap/ui/model/odata/v4/Context";
import Binding from "sap/ui/model/Binding";
import ListItemBase from "sap/m/ListItemBase";
import Table from "sap/m/Table";
import JSONModel from "sap/ui/model/json/JSONModel";
import Fragment from "sap/ui/core/Fragment";
import Dialog from "sap/m/Dialog";
import Sorter from "sap/ui/model/Sorter";
import BusyIndicator from "sap/ui/core/BusyIndicator";
import ProcessFlowLaneHeader from "sap/suite/ui/commons/ProcessFlowLaneHeader";
import ProcessFlow from "sap/suite/ui/commons/ProcessFlow";
import ListItem from "sap/ui/core/ListItem";
import ui5Event from "sap/ui/base/Event";
import MessageToast from "sap/m/MessageToast";
import MessageBox from "sap/m/MessageBox";
/**
 * @namespace flexso.cap.htf.baserepair.controller
 */
export default class Master extends Controller {
  formatter = formatter;
  table: Table;
  orderDialog: Dialog;

  public onInit(): void {
    // Initialize view model for UI state
    const oViewModel = new JSONModel({
      hasSelectedItems: false
    });
    this.getView()?.setModel(oViewModel, "view");
    
    (this.getOwnerComponent() as Component)
      .getRouter()
      .attachRouteMatched(this.onRouteMatched, this);
  }

  onRouteMatched() {
    this.getView()?.bindObject({
      path: "/ProductCamera('0a85863f-100d-4e0b-91a1-89897f4490d6')",
      parameters: {
        $expand: "materials",
      },
    });

    this.table = this.byId("idMaterialTable") as Table;
    
    // Attach selection change handler
    if (this.table) {
      this.table.attachSelectionChange(this.onMaterialSelectionChange, this);
    }
  }
  
  onMaterialSelectionChange() {
    const oViewModel = this.getView()?.getModel("view") as JSONModel;
    const selectedItems = this.table.getSelectedItems();
    oViewModel?.setProperty("/hasSelectedItems", selectedItems.length > 0);
  }

  async order() {
    const orderModel = new JSONModel({
      amount: 0,
    });

    if (!this.orderDialog) {
      this.orderDialog ??= (await Fragment.load({
        name: "flexso.cap.htf.baserepair.view.fragments.order",
        controller: this,
      })) as Dialog;

      this.getView()?.addDependent(this.orderDialog);
    }

    this.orderDialog.setModel(orderModel, "order");

    this.orderDialog.open();
  }

  async saveOrder() {
    this.orderDialog.close();
    BusyIndicator.show();
    const amount = parseInt(
      this.orderDialog.getModel("order")?.getProperty("/amount") as string
    );

    if (amount === 0 || amount === undefined || isNaN(amount)) {
      MessageToast.show("Please enter a valid amount to order");
      BusyIndicator.hide();
      return;
    }
    
    const selectedItems = this.table.getSelectedItems();
    let orderedCount = 0;
    
    for (const item of selectedItems) {
      try {
        const contextBinding = this.getView()
          ?.getModel()
          ?.bindContext(
            `${(
              item.getBindingContext() as Context
            ).getPath()}/AdminService.order(...)`,
            item.getBindingContext() as Context
          ) as ODataContextBinding;

        contextBinding.setParameter("amount", amount);
        contextBinding.setParameter(
          "id",
          item.getBindingContext()!.getProperty("ID")
        );

        await contextBinding.invoke();
        orderedCount++;
      } catch (error) {
        console.error("Error ordering material:", error);
      }
    }
    
    this.refresh();
    BusyIndicator.hide();
    
    if (orderedCount > 0) {
      MessageToast.show(`Successfully ordered ${amount} units of ${orderedCount} material(s)`);
    }
  }
  closeDialog() {
    this.orderDialog.close();
  }

  refresh() {
    this.table.getModel()?.refresh();
  }

  async produce() {
    //HACK THE FUTURE Challenge:
    //Write code to trigger AdminService.produce action 
    //You can base yourself on existing action code from the symboltranslation app
    BusyIndicator.show();
    
    try {
      const contextBinding = this.getView()
        ?.getModel()
        ?.bindContext(
          "/ProductCamera('0a85863f-100d-4e0b-91a1-89897f4490d6')/AdminService.produce(...)"
        ) as ODataContextBinding;

      if (contextBinding) {
        await contextBinding.invoke();
        // Refresh the model to show updated production states
        this.getView()?.getModel()?.refresh();
        MessageToast.show("Production started successfully! Check the production stages for progress.");
      }
    } catch (error: any) {
      console.error("Error starting production:", error);
      MessageBox.error(
        error?.message || "Failed to start production. Check if materials are in stock.",
        { title: "Production Failed" }
      );
    }
    
    BusyIndicator.hide();
  }

  refeshProducton() {
    // Refresh the production list
    this.getView()?.getModel()?.refresh();
  }

  async replaceCamera(event: ui5Event) {
    //HACK THE FUTURE Challenge:
    //Write code to trigger AdminService.replace action on the selected installation
    //Some backend code will have to be implemented as well!
    const listItem = event.getParameter("listItem" as never) as any;
    
    if (!listItem) {
      return;
    }
    
    const status = listItem.getBindingContext()?.getProperty("status");
    const location = listItem.getBindingContext()?.getProperty("location");
    
    // Only allow repair of damaged cameras
    if (status !== "Damaged") {
      MessageToast.show(`Camera at ${location} is already working!`);
      return;
    }
    
    // Ask for confirmation before repairing
    MessageBox.confirm(
      `Do you want to repair the damaged camera at ${location}? This will use 1 camera from stock.`,
      {
        title: "Confirm Repair",
        onClose: async (action: string) => {
          if (action !== MessageBox.Action.OK) {
            return;
          }
          
          BusyIndicator.show();
          
          try {
            const installationId = listItem.getBindingContext()?.getProperty("ID");
            
            const contextBinding = this.getView()
              ?.getModel()
              ?.bindContext(
                `${listItem.getBindingContext()?.getPath()}/AdminService.replace(...)`,
                listItem.getBindingContext() as Context
              ) as ODataContextBinding;

            if (contextBinding) {
              contextBinding.setParameter("id", installationId);
              await contextBinding.invoke();
              
              // Refresh the view to show updated stock and status
              this.getView()?.getModel()?.refresh();
              MessageBox.success(`Camera at ${location} successfully repaired! ✓`);
            }
          } catch (error: any) {
            console.error("Error replacing camera:", error);
            MessageBox.error(
              error?.message || "Failed to replace camera. Check if cameras are in stock.",
              { title: "Repair Failed" }
            );
          }
          
          BusyIndicator.hide();
        }
      }
    );
  }
}
