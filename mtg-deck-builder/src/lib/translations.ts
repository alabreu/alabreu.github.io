// Translation dictionaries for the app's UI chrome. Screens are translated
// incrementally — an untranslated screen simply keeps using literal pt-BR
// strings until it's migrated to t(). Keys are dot-namespaced by screen
// (e.g. "home.title") plus a "common" namespace for strings reused
// across screens.
export type Language = 'pt' | 'en';

export const translations: Record<Language, Record<string, string>> = {
  pt: {
    'common.cancel': 'Cancelar',
    'common.delete': 'Excluir',
    'common.login': 'Entrar',

    'home.title': 'Meus decks',
    'home.deckCountSingular': '{{count}} deck',
    'home.deckCountPlural': '{{count}} decks',
    'home.cardCountSingular': '{{count}} carta',
    'home.cardCountPlural': '{{count}} cartas',
    'home.emptyTitle': 'Nenhum deck ainda',
    'home.emptyDescription': 'Crie seu primeiro deck Commander e comece a construir sua coleção.',
    'home.createFirstDeck': 'Criar Primeiro Deck',
    'home.newDeck': 'Novo deck',
    'home.menuTitle': 'Menu',
    'home.importDeck': 'Importar deck',
    'home.importDeckDesc': 'Criar deck a partir de uma lista',
    'home.sendFeedback': 'Enviar feedback',
    'home.sendFeedbackDesc': 'Reportar um bug ou sugerir algo',
    'home.language': 'Idioma',
    'home.logout': 'Sair da conta',
    'home.syncDevices': 'Sincronize decks entre dispositivos',
    'home.loginSheetTitle': 'Entrar',
    'home.deleteConfirm': 'Excluir "{{name}}"?',
    'home.version': 'Versão',
    'home.languagePortuguese': 'Português',
    'home.languageEnglish': 'Inglês',
  },
  en: {
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.login': 'Log in',

    'home.title': 'My decks',
    'home.deckCountSingular': '{{count}} deck',
    'home.deckCountPlural': '{{count}} decks',
    'home.cardCountSingular': '{{count}} card',
    'home.cardCountPlural': '{{count}} cards',
    'home.emptyTitle': 'No decks yet',
    'home.emptyDescription': 'Create your first Commander deck and start building your collection.',
    'home.createFirstDeck': 'Create First Deck',
    'home.newDeck': 'New deck',
    'home.menuTitle': 'Menu',
    'home.importDeck': 'Import deck',
    'home.importDeckDesc': 'Create a deck from a list',
    'home.sendFeedback': 'Send feedback',
    'home.sendFeedbackDesc': 'Report a bug or suggest something',
    'home.language': 'Language',
    'home.logout': 'Log out',
    'home.syncDevices': 'Sync decks across devices',
    'home.loginSheetTitle': 'Log in',
    'home.deleteConfirm': 'Delete "{{name}}"?',
    'home.version': 'Version',
    'home.languagePortuguese': 'Portuguese',
    'home.languageEnglish': 'English',
  },
};
