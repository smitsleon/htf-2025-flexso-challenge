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
/**
 * @namespace flexso.cap.htf.baserepair.controller
 */
export default class Master extends Controller {
  formatter = formatter;
  table: Table;
  orderDialog: Dialog;

  public onInit(): void {
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

    if (amount === 0 || amount === undefined) {
      BusyIndicator.hide();
      return;
    }
    this.table.getSelectedItems().forEach(async (item: ListItemBase) => {
      const contextBinding = this.getView()
        ?.getModel()
        ?.bindContext(
          `${(
            item.getBindingContext() as Context
          ).getPath()}/AdminService.order(...)`,
          item.getBindingContext() as Context
        ) as ODataContextBinding;

      contextBinding.setParameter(
        "amount",
        parseInt(
          this.orderDialog.getModel("order")?.getProperty("/amount") as string
        )
      );

      contextBinding.setParameter(
        "id",
        item.getBindingContext()!.getProperty("ID")
      );

      await contextBinding.invoke();
      this.refresh();
      BusyIndicator.hide();
    });
  }
  closeDialog() {
    this.orderDialog.close();
  }

  refresh() {
    this.table.getModel()?.refresh();
  }

  async produce() {
    BusyIndicator.show();
    
    const contextBinding = this.getView()
      ?.getModel()
      ?.bindContext(
        "/ProductCamera('0a85863f-100d-4e0b-91a1-89897f4490d6')/AdminService.produce(...)"
      ) as ODataContextBinding;

    if (contextBinding) {
      await contextBinding.invoke();
      this.refeshProducton();
    }
    
    BusyIndicator.hide();
  }

  refeshProducton() {
    const processFlow = this.byId("processflow") as ProcessFlow;
    processFlow.updateModel();
  }

  async replaceCamera(event: ui5Event) {
    const listItem = event.getParameter("listItem" as never) as any;
    
    if (!listItem) {
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
        
        // Refresh the view
        this.getView()?.getModel()?.refresh();
      }
    } catch (error) {
      console.error("Error replacing camera:", error);
    }
    
    BusyIndicator.hide();
  }
}
