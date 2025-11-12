import Controller from "sap/ui/core/mvc/Controller";
import VizFrame from "sap/viz/ui5/controls/VizFrame";
import Event from "sap/ui/base/Event";
import ResourceModel from "sap/ui/model/resource/ResourceModel";
import Popover from "sap/viz/ui5/controls/Popover";
import ChartFormatter from "sap/viz/ui5/format/ChartFormatter";
import SimpleForm from "sap/ui/layout/form/SimpleForm";
import Label from "sap/m/Label";
import Text from "sap/m/Text";
import Dataset from "sap/viz/ui5/data/Dataset";
import FlattenedDataset from "sap/viz/ui5/data/FlattenedDataset";
import JSONModel from "sap/ui/model/json/JSONModel";
/**
 * @namespace flexso.cap.hrf.sonaroverview.controller
 */
export default class SonarOverview extends Controller {
    selectedSonarReading: any;

    public onInit(): void {
        // Initialize view model for attacker information
        const oViewModel = new JSONModel({
            attackerDistance: undefined,
            attackerLastSeen: undefined,
            attackerFinding: undefined
        });
        this.getView()?.setModel(oViewModel, "view");
        
        this._initVizFrame();
        this._findAttackerDistance();
    }

    private async _findAttackerDistance(): Promise<void> {
        //HACK THE FUTURE Challenge:
        //Discover the current distance of the attacker
        const oModel = this.getOwnerComponent()?.getModel() as any;
        const oBinding = oModel.bindList("/Sonar", undefined, undefined, undefined, {
            $expand: "sonarType",
            $orderby: "hoursInPast asc",
            $top: 5
        });
        
        await oBinding.requestContexts(0, 5);
        const aContexts = oBinding.getContexts();
        
        // Zoek naar de meest recente leviathan/attacker finding
        for (const oContext of aContexts) {
            const oData = oContext.getObject();
            const finding = oData.finding?.toLowerCase() || "";
            const sonarType = oData.sonarType?.type?.toLowerCase() || "";
            
            // Check of het een leviathan/attacker is
            if (finding.includes("leviathan") || finding.includes("attacker") || 
                finding.includes("unknown") && finding.includes("massive") ||
                sonarType.includes("leviathan")) {
                
                // Bereken de huidige afstand
                const currentDistance = this._calculateCurrentDistance(
                    oData.hoursInPast, 
                    oData.milesFromBase
                );
                
                // Toon de afstand in de view
                const oViewModel = this.getView()?.getModel("view") as JSONModel;
                if (oViewModel) {
                    oViewModel.setProperty("/attackerDistance", currentDistance);
                    oViewModel.setProperty("/attackerLastSeen", oData.hoursInPast);
                    oViewModel.setProperty("/attackerFinding", oData.finding);
                }
                
                break; // Stop na de eerste (meest recente) match
            }
        }
    }
    
    private _calculateCurrentDistance(hoursInPast: number, milesFromBase: number): number {
        // Als de leviathan 1 uur geleden op 35 miles was en nu (0 uur geleden) nog steeds daar is,
        // dan is de huidige afstand gewoon de milesFromBase van de meest recente reading
        return Math.round(milesFromBase * 10) / 10;
    }

    private async _initVizFrame(): Promise<void> { 
        //This whole vizframe setup isn't very well documented or known online
        //Don't be afraid to ask some of the Crew to help with this part if you get stuck

        const oViz = this.byId("sonarBubble") as VizFrame;
        //Viz Property logic
        if (oViz) {
            const i18nModel = this.getOwnerComponent()?.getModel("i18n") as ResourceModel | undefined;
            const resourceBundle = await i18nModel?.getResourceBundle();

            oViz.setVizProperties({
                title: { text: resourceBundle?.getText("title") },
                plotArea: {
                    dataLabel: { visible: true },
                    background: { visible: true }
                },
                legend: { visible: true },
                valueAxis: { title: { text: resourceBundle?.getText("HoursInPast") } },
                valueAxis2: { title: { text: resourceBundle?.getText("MilesFromBase") } },
                interaction: { selectability: { mode: "single" } }
            });
            oViz.attachSelectData(this.onSelectData, this);
            oViz.attachEventOnce("renderComplete", () => {
                oViz.setVizProperties({ legend: { title: { text: resourceBundle?.getText("SonarType") } } });
            });
        }

        //You are limited what you can set as context
        //It's definitely a good idea to show the sonar finding
        //Extra challenge: Could there be ways to show more context in the popover?
        (oViz.getDataset() as FlattenedDataset).setContext("SonarFinding");

        //Popover logic
        const vizPopover = this.byId("sonarPopOver") as Popover;
        if (vizPopover) {
            vizPopover.setCustomDataControl( (selectedSonarReading: any) => {
                //HACK THE FUTURE Challenge:
                //We want to visualise our findings when clicked
                const form = new SimpleForm({
                    content: [
                        new Label({ text: "Finding" }),
                        new Text({ text: selectedSonarReading.data.SonarFinding }),
                        new Label({ text: "Hours in Past" }),
                        new Text({ text: selectedSonarReading.data.Hours }),
                        new Label({ text: "Miles from Base" }),
                        new Text({ text: selectedSonarReading.data.Miles }),
                        new Label({ text: "Sonar Type" }),
                        new Text({ text: selectedSonarReading.data.SonarType || "Unknown" })
                    ]
                });
                return form;
            })
            vizPopover.connect(oViz.getVizUid());
            vizPopover.setFormatString(ChartFormatter.DefaultPattern.STANDARDFLOAT);
        }

    }

    public onSelectData(oEvent: Event): void {
        const vizFrame = oEvent.getSource() as VizFrame;
        (vizFrame.getDataset() as FlattenedDataset).setContext("SonarFinding");

    }

}