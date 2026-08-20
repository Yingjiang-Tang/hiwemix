import { readFileSync, writeFileSync } from 'fs';

const translations = {
  zh: {
    navCompare: "对比",
    cancel: "取消",
    compareTitle: "配方对比",
    addToCompare: "加入对比", inCompare: "已在对比",
    addedToCompare: "已加入对比", removedFromCompare: "已移出对比",
    compareEmpty: "对比篮为空",
    compareEmptyHint: "打开配方，点击对比图标即可加入",
    compareGrams: "克/100g", compareOnlyIn: "仅在",
    compareClearAll: "全部清空",
  },
  de: {
    navCompare: "Vergleichen",
    cancel: "Abbrechen",
    compareTitle: "Formeln vergleichen",
    addToCompare: "Zum Vergleich hinzufügen", inCompare: "Im Vergleich",
    addedToCompare: "Zum Vergleich hinzugefügt", removedFromCompare: "Aus Vergleich entfernt",
    compareEmpty: "Vergleichsliste ist leer",
    compareEmptyHint: "Öffnen Sie Formeln und tippen Sie auf Vergleichen, um sie hier hinzuzufügen",
    compareGrams: "g/100g", compareOnlyIn: "Nur in",
    compareClearAll: "Alle löschen",
  },
  es: {
    navCompare: "Comparar",
    cancel: "Cancelar",
    compareTitle: "Comparar fórmulas",
    addToCompare: "Añadir a comparar", inCompare: "En comparación",
    addedToCompare: "Añadido a comparación", removedFromCompare: "Eliminado de comparación",
    compareEmpty: "La lista de comparación está vacía",
    compareEmptyHint: "Abre fórmulas y toca Comparar para añadirlas aquí",
    compareGrams: "g/100g", compareOnlyIn: "Solo en",
    compareClearAll: "Borrar todo",
  },
  fr: {
    navCompare: "Comparer",
    cancel: "Annuler",
    compareTitle: "Comparer les formules",
    addToCompare: "Ajouter à la comparaison", inCompare: "En comparaison",
    addedToCompare: "Ajouté à la comparaison", removedFromCompare: "Retiré de la comparaison",
    compareEmpty: "La liste de comparaison est vide",
    compareEmptyHint: "Ouvrez des formules et appuyez sur Comparer pour les ajouter ici",
    compareGrams: "g/100g", compareOnlyIn: "Seulement dans",
    compareClearAll: "Tout effacer",
  },
  it: {
    navCompare: "Confronta",
    cancel: "Annulla",
    compareTitle: "Confronta formule",
    addToCompare: "Aggiungi al confronto", inCompare: "In confronto",
    addedToCompare: "Aggiunto al confronto", removedFromCompare: "Rimosso dal confronto",
    compareEmpty: "Lista confronto vuota",
    compareEmptyHint: "Apri le formule e tocca Confronta per aggiungerle qui",
    compareGrams: "g/100g", compareOnlyIn: "Solo in",
    compareClearAll: "Cancella tutto",
  },
  pt: {
    navCompare: "Comparar",
    cancel: "Cancelar",
    compareTitle: "Comparar fórmulas",
    addToCompare: "Adicionar à comparação", inCompare: "Em comparação",
    addedToCompare: "Adicionado à comparação", removedFromCompare: "Removido da comparação",
    compareEmpty: "Lista de comparação vazia",
    compareEmptyHint: "Abra fórmulas e toque em Comparar para adicioná-las aqui",
    compareGrams: "g/100g", compareOnlyIn: "Apenas em",
    compareClearAll: "Limpar tudo",
  },
  ru: {
    navCompare: "Сравнить",
    cancel: "Отмена",
    compareTitle: "Сравнить формулы",
    addToCompare: "Добавить к сравнению", inCompare: "В сравнении",
    addedToCompare: "Добавлено к сравнению", removedFromCompare: "Удалено из сравнения",
    compareEmpty: "Список сравнения пуст",
    compareEmptyHint: "Откройте формулы и нажмите Сравнить, чтобы добавить их сюда",
    compareGrams: "г/100г", compareOnlyIn: "Только в",
    compareClearAll: "Очистить всё",
  },
  ar: {
    navCompare: "مقارنة",
    cancel: "إلغاء",
    compareTitle: "مقارنة الوصفات",
    addToCompare: "إضافة للمقارنة", inCompare: "في المقارنة",
    addedToCompare: "تمت الإضافة للمقارنة", removedFromCompare: "تمت الإزالة من المقارنة",
    compareEmpty: "قائمة المقارنة فارغة",
    compareEmptyHint: "افتح الوصفات واضغط مقارنة لإضافتها هنا",
    compareGrams: "جم/100جم", compareOnlyIn: "فقط في",
    compareClearAll: "مسح الكل",
  },
  he: {
    navCompare: "השוואה",
    cancel: "ביטול",
    compareTitle: "השוואת מתכונים",
    addToCompare: "הוסף להשוואה", inCompare: "בהשוואה",
    addedToCompare: "נוסף להשוואה", removedFromCompare: "הוסר מההשוואה",
    compareEmpty: "רשימת ההשוואה ריקה",
    compareEmptyHint: "פתח מתכונים והקש השווה כדי להוסיף אותם לכאן",
    compareGrams: "גר'/100גר'", compareOnlyIn: "רק ב",
    compareClearAll: "נקה הכל",
  },
  tr: {
    navCompare: "Karşılaştır",
    cancel: "İptal",
    compareTitle: "Formülleri Karşılaştır",
    addToCompare: "Karşılaştırmaya Ekle", inCompare: "Karşılaştırmada",
    addedToCompare: "Karşılaştırmaya eklendi", removedFromCompare: "Karşılaştırmadan çıkarıldı",
    compareEmpty: "Karşılaştırma listesi boş",
    compareEmptyHint: "Formülleri açın ve buraya eklemek için Karşılaştır'a dokunun",
    compareGrams: "g/100g", compareOnlyIn: "Sadece",
    compareClearAll: "Tümünü Temizle",
  },
  sl: {
    navCompare: "Primerjaj",
    cancel: "Prekliči",
    compareTitle: "Primerjaj formule",
    addToCompare: "Dodaj v primerjavo", inCompare: "V primerjavi",
    addedToCompare: "Dodano v primerjavo", removedFromCompare: "Odstranjeno iz primerjave",
    compareEmpty: "Seznam primerjave je prazen",
    compareEmptyHint: "Odprite formule in tapnite Primerjaj, da jih dodate sem",
    compareGrams: "g/100g", compareOnlyIn: "Samo v",
    compareClearAll: "Počisti vse",
  },
};

const expected = new Set(Object.values(translations).flatMap(Object.keys));
let totalAdded = 0;
let totalSkipped = 0;

for (const lang of Object.keys(translations)) {
  const path = `src/lib/i18n/${lang}.ts`;
  let src = readFileSync(path, 'utf8');
  const t = translations[lang];
  let added = 0, skipped = 0;

  // 精确定位 dict({...}) 的闭合点：最后一个 `});` 之前
  // 用锚点：匹配 '\n});' 后跟 '\n\nexport default dict_xx;'（每个语言文件名固定）
  const exportMarker = `\nexport default dict_${lang};`;
  const exportIdx = src.lastIndexOf(exportMarker);
  if (exportIdx === -1) {
    console.error(`✗ ${lang}: cannot find export marker`);
    continue;
  }
  // 在 export marker 前找到最后一个 '});'
  const closeBeforeExport = src.lastIndexOf('});', exportIdx);
  if (closeBeforeExport === -1) {
    console.error(`✗ ${lang}: cannot find closing }); before export`);
    continue;
  }

  let additions = '';
  for (const [k, v] of Object.entries(t)) {
    // 检查 key 是否已存在
    const existing = new RegExp(`(^|\\n)\\s*${k}\\s*:`);
    if (existing.test(src)) {
      skipped++;
      continue;
    }
    additions += `    ${k}: ${JSON.stringify(v)},\n`;
    added++;
  }

  if (additions) {
    // 在 `});` 闭合前插入新 keys
    const before = src.slice(0, closeBeforeExport);
    const after = src.slice(closeBeforeExport);
    const newSrc = before + additions + after;
    writeFileSync(path, newSrc);
  }
  totalAdded += added;
  totalSkipped += skipped;
  console.log(`✓ ${lang}: added=${added} skipped=${skipped}`);
}

console.log(`\nTotal: added=${totalAdded} skipped=${totalSkipped}`);

// 二次校验
console.log('\n--- Post-check ---');
for (const lang of Object.keys(translations)) {
  const path = `src/lib/i18n/${lang}.ts`;
  const src = readFileSync(path, 'utf8');
  const missing = [...expected].filter(k => !new RegExp(`(^|\\n)\\s*${k}\\s*:`).test(src));
  console.log(`${lang}: ${missing.length === 0 ? '✓ all keys present' : '✗ missing: ' + missing.join(', ')}`);
}
