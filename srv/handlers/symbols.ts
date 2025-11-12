import * as cds from "@sap/cds";
const { Symbol, SymbolTranslation } = cds.entities;

// Helper function to escape regex special characters
const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const translate = async (req: cds.Request) => {
  const tx = cds.transaction(req);

  // Use for...of instead of forEach to properly handle async operations
  for (const param of req.params ?? []) {
    const id = typeof param === "string" ? param : (param as any)?.ID;
    if (!id) {
      continue;
    }

    // Get the symbol record
    const record = await tx.run(
      SELECT.one.from(Symbol).where({ ID: id })
    );
    
    if (!record) {
      continue;
    }

    const symbolText = record.symbol;
    
    // Get translation mappings for the specific language
    const translations = await tx.run(
      SELECT.from(SymbolTranslation).where({ language: record.language })
    );
    
    if (!translations?.length) {
      continue;
    }

    // Translate the entire string by replacing each symbol
    let translatedText = symbolText;
    for (const translation of translations) {
      // Escape special regex characters in the symbol
      const pattern = escapeRegExp(translation.symbol);
      const regex = new RegExp(pattern, 'g');
      translatedText = translatedText.replace(regex, translation.translation);
    }
    
    // Update the record with the translation
    await tx.update(Symbol)
      .set({ translation: translatedText })
      .where({ ID: id });
  }
};
