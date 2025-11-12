import * as cds from "@sap/cds";
import { material, production, state } from "srv/types/generalTypes";
const { Material, Production, State, ProductCamera, Installation } =
  cds.entities;

export const order = async (req: cds.Request) => {
  const { id, amount } = req.data;
  // add amount to database
  // trigger background job to simulate order > delivery > add in stock
  const current = await SELECT.from(Material).columns("amountOrderd").where({
    ID: id,
  });
  const currentAmount = current[0].amountOrderd;
  await UPDATE.entity(Material)
    .set({ amountOrderd: currentAmount + amount })
    .where({ ID: id });

  cds.spawn({ every: 15000 /* ms */ }, async (tx) => {
    const result = await SELECT.from(Material)
      .columns("amountOrderd", "amountInStock")
      .where({
        ID: id,
      });
    const amountNew = result[0].amountOrderd;
    let stock = result[0].amountInStock as number;

    if (amountNew > 0) {
      stock = stock + 1;
      await UPDATE.entity(Material)
        .set({ amountOrderd: amountNew - 1 })
        .where({ ID: id });
      await UPDATE.entity(Material)
        .set({ amountInStock: stock })
        .where({ ID: id });
    }
  });
};

export const produce = async (req: cds.Request) => {
  // remove 2 of each amount for all materials
  // produce in the background
  const productId = req.params[0] as cds.__UUID;

  const allMaterials = (await SELECT.from(Material)
    .columns("ID", "amountInStock")
    .where({ product: productId })) as unknown as material[];

  const check = allMaterials.every((material: material) => {
    return parseInt(material.amountInStock.toString()) >= 2;
  });

  if (check) {
    new Promise(() => runInBackgroundProduce(allMaterials, productId));
  }
};

async function runInBackgroundProduce(
  allMaterials: material[],
  productId: cds.__UUID
) {
  //Remove the needed materials from stock
  allMaterials.forEach(async (m: material) => {
    await UPDATE.entity(Material)
      .set({ amountInStock: m.amountInStock - 2 })
      .where({ ID: m.ID });
  });

  //start production

  const flows = (await SELECT.from(Production)
    .orderBy("position")
    .where({ product: productId })) as unknown as production[];

  const production = setInterval(async () => {
    const stateFlow1 = (await SELECT.from(State).where({
      production: flows[0].ID,
      state: "Neutral",
    })) as unknown as state[];
    const stateFlow2 = (await SELECT.from(State).where({
      production: flows[1].ID,
      state: "Neutral",
    })) as unknown as state[];
    const stateFlow3 = (await SELECT.from(State).where({
      production: flows[2].ID,
      state: "Neutral",
    })) as unknown as state[];

    const neutralState1 = stateFlow1[0];
    const neutralState2 = stateFlow2[0];
    const neutralState3 = stateFlow3[0];
    //every 10 seconds, the production will have progress
    if (neutralState1.value > 0) {
      //add a state 'Positive' with value 5 => indicating part of the process is succeeded
      const newState = {
        state: "Positive",
        value: 5,
        production: neutralState1.production,
      };

      const newValue = neutralState1.value - 5;

      await INSERT.into(State).entries([newState]);
      await UPDATE.entity(State)
        .set({ value: newValue })
        .where({ ID: neutralState1.ID });
    } else if (neutralState2.value > 0) {
      //add a state 'Positive' with value 5 => indicating part of the process is succeeded
      const newState = {
        state: "Positive",
        value: 5,
        production: neutralState2.production,
      };
      const newValue = neutralState2.value - 5;

      await INSERT.into(State).entries([newState]);
      await UPDATE.entity(State)
        .set({ value: newValue })
        .where({ ID: neutralState2.ID });
    } else if (neutralState3.value > 0) {
      //add a state 'Positive' with value 5 => indicating part of the process is succeeded
      const newState = {
        state: "Positive",
        value: 5,
        production: neutralState3.production,
      };
      const newValue = neutralState3.value - 5;

      await INSERT.into(State).entries([newState]);
      await UPDATE.entity(State)
        .set({ value: newValue })
        .where({ ID: neutralState3.ID });
    } else {
      production.close();
      const currentAmountCamera = await SELECT.from(ProductCamera)
        .columns("amountInStock")
        .where({ ID: productId });
      await UPDATE.entity(ProductCamera)
        .set({ amountInStock: currentAmountCamera[0].amountInStock + 1 })
        .where({ ID: productId });
    }
  }, 10000);
}

export const replaceInstallation = async (req: cds.Request) => {
  const { id } = req.data;
  const installation = await SELECT.from(Installation)
    .columns("product", "status")
    .where({ ID: id });

  const productID = installation[0].product;
  
  // Check if there are cameras in stock
  const camera = await SELECT.from(ProductCamera)
    .columns("amountInStock")
    .where({ ID: productID });
  
  if (camera && camera[0].amountInStock > 0) {
    // Replace the installation - set status to working
    await UPDATE.entity(Installation)
      .set({ status: "Working" })
      .where({ ID: id });
    
    // Reduce stock by 1
    await UPDATE.entity(ProductCamera)
      .set({ amountInStock: camera[0].amountInStock - 1 })
      .where({ ID: productID });
    
    return { success: true, message: "Installation replaced successfully" };
  } else {
    return { success: false, message: "No cameras in stock" };
  }
};
