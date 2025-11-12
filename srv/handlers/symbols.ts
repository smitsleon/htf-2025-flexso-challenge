import * as cds from "@sap/cds";
const { Symbol, SymbolTranslation } = cds.entities;

export const translate = async (req: cds.Request) => {
  for (const id of req.params) {
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
  }
};
