import { readFileSync, writeFileSync } from 'fs';

const translations = {
  zh: {
    navMyFormulas: "我的配方", navCompare: "对比",
    cancel: "取消",
    saveFormula: "保存配方", savedFormula: "已保存",
    saveFormulaDialogTitle: "保存配方",
    saveFormulaNameLabel: "名称",
    saveFormulaNamePlaceholder: "例如：丰田 | 040 超白",
    saveFormulaSuccess: "配方已保存", saveFormulaFail: "保存失败，请重试",
    saveRequireLogin: "请先登录后再保存配方",
    myFormulasTitle: "我的配方", myFormulasEmpty: "还没有保存的配方",
    myFormulasEmptyHint: "打开任一配方，点击保存图标即可保留",
    myFormulasDelete: "删除",
    compareTitle: "配方对比",
    addToCompare: "加入对比", inCompare: "已在对比",
    addedToCompare: "已加入对比", removedFromCompare: "已移出对比",
    compareEmpty: "对比篮为空",
    compareEmptyHint: "打开配方，点击对比图标即可加入",
    compareGrams: "克/100g", compareOnlyIn: "仅在",
    compareClearAll: "全部清空",
  },
  de: {
    navMyFormulas: "Meine Formeln", navCompare: "Vergleichen",
    cancel: "Abbrechen",
    saveFormula: "Formel speichern", savedFormula: "Gespeichert",
    saveFormulaDialogTitle: "Formel speichern",
    saveFormulaNameLabel: "Name",
    saveFormulaNamePlaceholder: "z.B. Toyota | 040 Superweiß",
    saveFormulaSuccess: "Formel gespeichert", saveFormulaFail: "Speichern fehlgeschlagen, bitte erneut versuchen",
    saveRequireLogin: "Bitte melden Sie sich an, um Formeln zu speichern",
    myFormulasTitle: "Meine Formeln", myFormulasEmpty: "Noch keine gespeicherten Formeln",
    myFormulasEmptyHint: "Öffnen Sie eine Formel und tippen Sie auf Speichern, um sie hier zu behalten",
    myFormulasDelete: "Löschen",
    compareTitle: "Formeln vergleichen",
    addToCompare: "Zum Vergleich hinzufügen", inCompare: "Im Vergleich",
    addedToCompare: "Zum Vergleich hinzugefügt", removedFromCompare: "Aus Vergleich entfernt",
    compareEmpty: "Vergleichsliste ist leer",
    compareEmptyHint: "Öffnen Sie Formeln und tippen Sie auf Vergleichen, um sie hier hinzuzufügen",
    compareGrams: "g/100g", compareOnlyIn: "Nur in",
    compareClearAll: "Alle löschen",
  },
  es: {
    navMyFormulas: "Mis Fórmulas", navCompare: "Comparar",
    cancel: "Cancelar",
    saveFormula: "Guardar fórmula", savedFormula: "Guardada",
    saveFormulaDialogTitle: "Guardar fórmula",
    saveFormulaNameLabel: "Nombre",
    saveFormulaNamePlaceholder: "ej. Toyota | 040 Super Blanco",
    saveFormulaSuccess: "Fórmula guardada", saveFormulaFail: "Error al guardar, inténtalo de nuevo",
    saveRequireLogin: "Inicia sesión para guardar fórmulas",
    myFormulasTitle: "Mis Fórmulas", myFormulasEmpty: "Aún no hay fórmulas guardadas",
    myFormulasEmptyHint: "Abre cualquier fórmula y toca Guardar para conservarla aquí",
    myFormulasDelete: "Eliminar",
    compareTitle: "Comparar fórmulas",
    addToCompare: "Añadir a comparar", inCompare: "En comparación",
    addedToCompare: "Añadido a comparación", removedFromCompare: "Eliminado de comparación",
    compareEmpty: "La lista de comparación está vacía",
    compareEmptyHint: "Abre fórmulas y toca Comparar para añadirlas aquí",
    compareGrams: "g/100g", compareOnlyIn: "Solo en",
    compareClearAll: "Borrar todo",
  },
  fr: {
    navMyFormulas: "Mes Formules", navCompare: "Comparer",
    cancel: "Annuler",
    saveFormula: "Enregistrer la formule", savedFormula: "Enregistrée",
    saveFormulaDialogTitle: "Enregistrer la formule",
    saveFormulaNameLabel: "Nom",
    saveFormulaNamePlaceholder: "ex. Toyota | 040 Super Blanc",
    saveFormulaSuccess: "Formule enregistrée", saveFormulaFail: "Échec de l'enregistrement, réessayez",
    saveRequireLogin: "Connectez-vous pour enregistrer des formules",
    myFormulasTitle: "Mes Formules", myFormulasEmpty: "Aucune formule enregistrée",
    myFormulasEmptyHint: "Ouvrez une formule et appuyez sur Enregistrer pour la conserver ici",
    myFormulasDelete: "Supprimer",
    compareTitle: "Comparer les formules",
    addToCompare: "Ajouter à la comparaison", inCompare: "En comparaison",
    addedToCompare: "Ajouté à la comparaison", removedFromCompare: "Retiré de la comparaison",
    compareEmpty: "La liste de comparaison est vide",
    compareEmptyHint: "Ouvrez des formules et appuyez sur Comparer pour les ajouter ici",
    compareGrams: "g/100g", compareOnlyIn: "Seulement dans",
    compareClearAll: "Tout effacer",
  },
  it: {
    navMyFormulas: "Le Mie Formule", navCompare: "Confronta",
    cancel: "Annulla",
    saveFormula: "Salva formula", savedFormula: "Salvata",
    saveFormulaDialogTitle: "Salva formula",
    saveFormulaNameLabel: "Nome",
    saveFormulaNamePlaceholder: "es. Toyota | 040 Super Bianco",
    saveFormulaSuccess: "Formula salvata", saveFormulaFail: "Salvataggio fallito, riprova",
    saveRequireLogin: "Accedi per salvare le formule",
    myFormulasTitle: "Le Mie Formule", myFormulasEmpty: "Nessuna formula salvata",
    myFormulasEmptyHint: "Apri una formula e tocca Salva per conservarla qui",
    myFormulasDelete: "Elimina",
    compareTitle: "Confronta formule",
    addToCompare: "Aggiungi al confronto", inCompare: "In confronto",
    addedToCompare: "Aggiunto al confronto", removedFromCompare: "Rimosso dal confronto",
    compareEmpty: "Lista confronto vuota",
    compareEmptyHint: "Apri le formule e tocca Confronta per aggiungerle qui",
    compareGrams: "g/100g", compareOnlyIn: "Solo in",
    compareClearAll: "Cancella tutto",
  },
  pt: {
    navMyFormulas: "Minhas Fórmulas", navCompare: "Comparar",
    cancel: "Cancelar",
    saveFormula: "Salvar fórmula", savedFormula: "Salva",
    saveFormulaDialogTitle: "Salvar fórmula",
    saveFormulaNameLabel: "Nome",
    saveFormulaNamePlaceholder: "ex. Toyota | 040 Super Branco",
    saveFormulaSuccess: "Fórmula salva", saveFormulaFail: "Falha ao salvar, tente novamente",
    saveRequireLogin: "Faça login para salvar fórmulas",
    myFormulasTitle: "Minhas Fórmulas", myFormulasEmpty: "Nenhuma fórmula salva ainda",
    myFormulasEmptyHint: "Abra qualquer fórmula e toque em Salvar para mantê-la aqui",
    myFormulasDelete: "Excluir",
    compareTitle: "Comparar fórmulas",
    addToCompare: "Adicionar à comparação", inCompare: "Em comparação",
    addedToCompare: "Adicionado à comparação", removedFromCompare: "Removido da comparação",
    compareEmpty: "Lista de comparação vazia",
    compareEmptyHint: "Abra fórmulas e toque em Comparar para adicioná-las aqui",
    compareGrams: "g/100g", compareOnlyIn: "Apenas em",
    compareClearAll: "Limpar tudo",
  },
  ru: {
    navMyFormulas: "Мои формулы", navCompare: "Сравнить",
    cancel: "Отмена",
    saveFormula: "Сохранить формулу", savedFormula: "Сохранено",
    saveFormulaDialogTitle: "Сохранить формулу",
    saveFormulaNameLabel: "Название",
    saveFormulaNamePlaceholder: "напр. Toyota | 040 Супер Белый",
    saveFormulaSuccess: "Формула сохранена", saveFormulaFail: "Не удалось сохранить, попробуйте снова",
    saveRequireLogin: "Войдите, чтобы сохранять формулы",
    myFormulasTitle: "Мои формулы", myFormulasEmpty: "Нет сохранённых формул",
    myFormulasEmptyHint: "Откройте формулу и нажмите Сохранить, чтобы оставить её здесь",
    myFormulasDelete: "Удалить",
    compareTitle: "Сравнить формулы",
    addToCompare: "Добавить к сравнению", inCompare: "В сравнении",
    addedToCompare: "Добавлено к сравнению", removedFromCompare: "Удалено из сравнения",
    compareEmpty: "Список сравнения пуст",
    compareEmptyHint: "Откройте формулы и нажмите Сравнить, чтобы добавить их сюда",
    compareGrams: "г/100г", compareOnlyIn: "Только в",
    compareClearAll: "Очистить всё",
  },
  ar: {
    navMyFormulas: "وصفاتي", navCompare: "مقارنة",
    cancel: "إلغاء",
    saveFormula: "حفظ الوصفة", savedFormula: "محفوظة",
    saveFormulaDialogTitle: "حفظ الوصفة",
    saveFormulaNameLabel: "الاسم",
    saveFormulaNamePlaceholder: "مثال: تويوتا | 040 أبيض ممتاز",
    saveFormulaSuccess: "تم حفظ الوصفة", saveFormulaFail: "فشل الحفظ، حاول مرة أخرى",
    saveRequireLogin: "يرجى تسجيل الدخول لحفظ الوصفات",
    myFormulasTitle: "وصفاتي", myFormulasEmpty: "لا توجد وصفات محفوظة",
    myFormulasEmptyHint: "افتح أي وصفة واضغط حفظ للاحتفاظ بها هنا",
    myFormulasDelete: "حذف",
    compareTitle: "مقارنة الوصفات",
    addToCompare: "إضافة للمقارنة", inCompare: "في المقارنة",
    addedToCompare: "تمت الإضافة للمقارنة", removedFromCompare: "تمت الإزالة من المقارنة",
    compareEmpty: "قائمة المقارنة فارغة",
    compareEmptyHint: "افتح الوصفات واضغط مقارنة لإضافتها هنا",
    compareGrams: "جم/100جم", compareOnlyIn: "فقط في",
    compareClearAll: "مسح الكل",
  },
  he: {
    navMyFormulas: "המתכונים שלי", navCompare: "השוואה",
    cancel: "ביטול",
    saveFormula: "שמור מתכון", savedFormula: "נשמר",
    saveFormulaDialogTitle: "שמור מתכון",
    saveFormulaNameLabel: "שם",
    saveFormulaNamePlaceholder: "לדוגמה: טויוטה | 040 לבן מעולה",
    saveFormulaSuccess: "המתכון נשמר", saveFormulaFail: "השמירה נכשלה, נסה שוב",
    saveRequireLogin: "יש להתחבר כדי לשמור מתכונים",
    myFormulasTitle: "המתכונים שלי", myFormulasEmpty: "אין מתכונים שמורים",
    myFormulasEmptyHint: "פתח מתכון כלשהו והקש שמור כדי לשמור אותו כאן",
    myFormulasDelete: "מחק",
    compareTitle: "השוואת מתכונים",
    addToCompare: "הוסף להשוואה", inCompare: "בהשוואה",
    addedToCompare: "נוסף להשוואה", removedFromCompare: "הוסר מההשוואה",
    compareEmpty: "רשימת ההשוואה ריקה",
    compareEmptyHint: "פתח מתכונים והקש השווה כדי להוסיף אותם לכאן",
    compareGrams: "גר'/100גר'", compareOnlyIn: "רק ב",
    compareClearAll: "נקה הכל",
  },
  tr: {
    navMyFormulas: "Formüllerim", navCompare: "Karşılaştır",
    cancel: "İptal",
    saveFormula: "Formülü Kaydet", savedFormula: "Kaydedildi",
    saveFormulaDialogTitle: "Formülü Kaydet",
    saveFormulaNameLabel: "Ad",
    saveFormulaNamePlaceholder: "örn. Toyota | 040 Süper Beyaz",
    saveFormulaSuccess: "Formül kaydedildi", saveFormulaFail: "Kaydetme başarısız, tekrar deneyin",
    saveRequireLogin: "Formül kaydetmek için lütfen giriş yapın",
    myFormulasTitle: "Formüllerim", myFormulasEmpty: "Henüz kayıtlı formül yok",
    myFormulasEmptyHint: "Herhangi bir formülü açın ve burada tutmak için Kaydet'e dokunun",
    myFormulasDelete: "Sil",
    compareTitle: "Formülleri Karşılaştır",
    addToCompare: "Karşılaştırmaya Ekle", inCompare: "Karşılaştırmada",
    addedToCompare: "Karşılaştırmaya eklendi", removedFromCompare: "Karşılaştırmadan çıkarıldı",
    compareEmpty: "Karşılaştırma listesi boş",
    compareEmptyHint: "Formülleri açın ve buraya eklemek için Karşılaştır'a dokunun",
    compareGrams: "g/100g", compareOnlyIn: "Sadece",
    compareClearAll: "Tümünü Temizle",
  },
  sl: {
    navMyFormulas: "Moje formule", navCompare: "Primerjaj",
    cancel: "Prekliči",
    saveFormula: "Shrani formulo", savedFormula: "Shranjeno",
    saveFormulaDialogTitle: "Shrani formulo",
    saveFormulaNameLabel: "Ime",
    saveFormulaNamePlaceholder: "npr. Toyota | 040 Super bela",
    saveFormulaSuccess: "Formula shranjena", saveFormulaFail: "Shranjevanje ni uspelo, poskusite znova",
    saveRequireLogin: "Za shranjevanje formul se prijavite",
    myFormulasTitle: "Moje formule", myFormulasEmpty: "Ni shranjenih formul",
    myFormulasEmptyHint: "Odprite katerokoli formulo in tapnite Shrani, da jo obdržite tukaj",
    myFormulasDelete: "Izbriši",
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
