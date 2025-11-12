import * as cds from "@sap/cds";
const { Symbol, SymbolTranslation } = cds.entities;

export const translate = async (req: cds.Request) => {
  req.params.forEach(async (id) => {
    //HACK THE FUTURE Challenge
    //The Symbol entity contains all records that are already translated or will be translated by this action
    //The Symbol Translation entity contains all translation mapping
    //Don't forget that we should be able to translate whole strings, not only singluar symbols
    const record = await SELECT.from(Symbol).where({ ID: id });
    
    if (record && record.length > 0) {
      const symbolText = record[0].symbol;
      let translatedText = "";
      
      // Get all translation mappings
      const translations = await SELECT.from(SymbolTranslation);
      
      // Translate the entire string by replacing each symbol
      translatedText = symbolText;
      for (const translation of translations) {
        const regex = new RegExp(translation.symbol, 'g');
        translatedText = translatedText.replace(regex, translation.translation);
      }
      
      // Update the record with the translation
      await UPDATE.entity(Symbol)
        .set({ translation: translatedText })
        .where({ ID: id });
    }
  });
};
