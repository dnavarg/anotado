/**
 * Módulo 0: Motor de Internacionalización (i18n)
 * Español neutro y English, con detección automática del navegador.
 */

export const TRANSLATIONS = {
  es: {
    app: {
      name: 'Anotado',
      tagline: 'Notas, Recordatorios y Súper',
      offlineBadge: '100% Sin Conexión',
      backToMenu: 'Menú',
      settings: 'Configuración',
      save: 'Guardar',
      cancel: 'Cancelar',
      delete: 'Eliminar',
      edit: 'Editar',
      close: 'Cerrar',
      search: 'Buscar...',
      all: 'Todos',
      confirmDelete: '¿Deseas eliminar este elemento?',
      undo: 'Deshacer',
      itemDeleted: 'Elemento eliminado',
      updateAvailable: 'Hay una nueva versión disponible',
      updateNow: 'Actualizar',
      maxLabel: 'Máx:',
      localeCode: 'es-CL'
    },
    home: {
      greeting: 'Hola, buen día',
      prompt: '¿Qué deseas hacer hoy?',
      marketTitle: 'Ir al Supermercado',
      marketDesc: 'Anotar precios y calcular el carro en vivo',
      marketActive: 'ACTIVA',
      itemsOnList: 'productos en lista',
      noActiveList: 'Sin lista activa aún',
      remindersTitle: 'Mis Recordatorios',
      remindersDesc: 'Alarmas de compras, médicos y cuentas',
      nextReminder: 'Próximo:',
      noReminders: 'No hay recordatorios pendientes',
      notesTitle: 'Notas y Apuntes',
      notesDesc: 'Textos rápidos, recetas o tareas',
      savedNotes: 'notas guardadas',
      adultHint: 'Modo Fácil: letras grandes, cálculo automático y uso sin internet.'
    },
    settings: {
      title: 'Configuración',
      themeLabel: 'Tema de Pantalla',
      themeSystem: 'Automático (Sistema)',
      themeLight: 'Modo Claro',
      themeDark: 'Modo Oscuro',
      languageLabel: 'Idioma',
      currencyLabel: 'Moneda Principal',
      notificationsLabel: 'Notificaciones de Recordatorios',
      notificationsBtn: 'Activar Permiso de Alarmas',
      notificationsGranted: 'Alarmas activadas en este dispositivo',
      notificationsDenied: 'Permiso bloqueado en el navegador',
      backupLabel: 'Respaldo de Datos',
      exportBackup: 'Exportar respaldo (JSON)',
      importBackup: 'Importar respaldo',
      backupExported: 'Respaldo descargado',
      backupImported: 'Datos restaurados correctamente',
      backupError: 'El archivo de respaldo no es válido',
      iosTip: 'En iPhone, toca Compartir y "Agregar a pantalla de inicio" para proteger tus datos.'
    },
    market: {
      title: 'Lista de Compras',
      subtitle: 'Modo Góndola',
      newList: 'Nueva Lista',
      listNamePlaceholder: 'Ej: Supermercado Líder',
      budgetLabel: 'Presupuesto Estimado',
      noBudget: 'Sin límite',
      addItem: 'Agregar Producto',
      editItem: 'Editar Producto',
      productName: 'Nombre del producto',
      productPlaceholder: 'Ej: Leche entera 1L',
      category: 'Rubro / Categoría',
      quantity: 'Cantidad',
      unitLabel: 'Unidad',
      units: {
        un: 'un',
        kg: 'kg',
        g: 'g',
        L: 'L'
      },
      unitPrice: 'Precio Unitario',
      subtotal: 'Subtotal',
      inCart: 'En el Carro',
      totalProjected: 'Total Proyectado',
      budgetRemaining: 'Disponible',
      budgetWithin: 'Dentro del presupuesto',
      budgetExceeded: 'Has superado el presupuesto por',
      shareBtn: 'Compartir',
      copiedToast: 'Lista copiada para enviar por WhatsApp',
      emptyList: 'Tu lista está vacía. Toca "Agregar Producto" para comenzar.',
      priceSuggestion: 'Último precio registrado:',
      clearCart: 'Vaciar marcados',
      finishShopping: 'Finalizar compra',
      reopenList: 'Reabrir lista',
      archivedBadge: 'Archivada',
      listArchived: 'Compra finalizada y archivada',
      cartCleared: 'Productos marcados eliminados',
      pendingCount: 'pendientes',
      pickedCount: 'en el carro',
      categories: {
        Abarrotes: 'Abarrotes',
        Lácteos: 'Lácteos',
        Carnes: 'Carnes',
        Verduras: 'Frutas y Verduras',
        Panadería: 'Panadería',
        Limpieza: 'Limpieza',
        Perfumería: 'Perfumería',
        Otros: 'Otros'
      }
    },
    reminders: {
      title: 'Recordatorios',
      subtitle: 'Alarmas y Pendientes',
      newReminder: 'Nuevo Recordatorio',
      editReminder: 'Editar Recordatorio',
      titleLabel: '¿Qué deseas recordar?',
      titlePlaceholder: 'Ej: Ir al supermercado el domingo',
      dateTimeLabel: 'Fecha y Hora',
      categoryLabel: 'Categoría',
      smartLinkTitle: '¿Deseas armar la lista de compras y definir un presupuesto estimado?',
      smartLinkHint: 'Cuando suene el recordatorio, podrás abrir tu lista directo en Modo Góndola.',
      openLinkedList: 'Abrir Lista',
      linkedBadge: 'Lista de Compras Vinculada',
      empty: 'No tienes recordatorios programados. Crea uno arriba.',
      completed: 'Completado',
      markDone: 'Listo',
      dueAlertTitle: 'Recordatorio',
      overdueGrouped: 'recordatorios pendientes',
      exportCalendar: 'Calendario (.ics)',
      calendarExported: 'Evento descargado para tu calendario',
      openAppNotice: 'Las alertas web suenan con la app abierta. Para que suenen con el teléfono bloqueado, agrégalo a tu Calendario (.ics).',
      confirmDeleteMessage: '¿Deseas eliminar este recordatorio?',
      unlinkListConfirm: 'Al cambiar la categoría, ¿deseas desvincular la lista de compras?',
      categories: {
        shopping: 'Compras / Supermercado',
        health: 'Salud / Médico',
        bills: 'Pagos / Cuentas',
        general: 'General / Personal'
      }
    },
    notes: {
      title: 'Notas y Apuntes',
      subtitle: 'Textos y Listas',
      newNote: 'Nueva Nota',
      editNote: 'Editar Nota',
      titleLabel: 'Título',
      titlePlaceholder: 'Ej: Receta salsa casera',
      typeLabel: 'Tipo de Nota',
      typeText: 'Texto libre',
      typeChecklist: 'Lista con casillas',
      contentLabel: 'Contenido',
      contentPlaceholder: 'Escribe tu nota aquí...',
      checklistPlaceholder: 'Escribe cada tarea en una línea nueva...',
      tagLabel: 'Etiqueta',
      pinNote: 'Fijar arriba',
      createAlarm: 'Crear Alarma',
      linkedReminder: 'Tiene alarma vinculada',
      empty: 'No tienes notas guardadas todavía.'
    }
  },
  en: {
    app: {
      name: 'Anotado',
      tagline: 'Notes, Reminders & Grocery',
      offlineBadge: '100% Offline',
      backToMenu: 'Menu',
      settings: 'Settings',
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      close: 'Close',
      search: 'Search...',
      all: 'All',
      confirmDelete: 'Do you want to delete this item?',
      undo: 'Undo',
      itemDeleted: 'Item deleted',
      updateAvailable: 'A new version is available',
      updateNow: 'Update',
      maxLabel: 'Max:',
      localeCode: 'en-US'
    },
    home: {
      greeting: 'Hello, good day',
      prompt: 'What would you like to do today?',
      marketTitle: 'Grocery Shopping',
      marketDesc: 'Track prices and calculate your cart live',
      marketActive: 'ACTIVE',
      itemsOnList: 'items on list',
      noActiveList: 'No active list yet',
      remindersTitle: 'My Reminders',
      remindersDesc: 'Shopping, doctor & bill alarms',
      nextReminder: 'Next:',
      noReminders: 'No upcoming reminders',
      notesTitle: 'Notes & Memos',
      notesDesc: 'Quick notes, recipes or checklists',
      savedNotes: 'saved notes',
      adultHint: 'Easy Mode: clear text, automatic math, and full offline support.'
    },
    settings: {
      title: 'Settings',
      themeLabel: 'Display Theme',
      themeSystem: 'Automatic (System)',
      themeLight: 'Light Mode',
      themeDark: 'Dark Mode',
      languageLabel: 'Language',
      currencyLabel: 'Default Currency',
      notificationsLabel: 'Reminder Notifications',
      notificationsBtn: 'Enable Alarm Permissions',
      notificationsGranted: 'Alarms enabled on this device',
      notificationsDenied: 'Permission blocked in browser',
      backupLabel: 'Data Backup',
      exportBackup: 'Export backup (JSON)',
      importBackup: 'Import backup',
      backupExported: 'Backup downloaded',
      backupImported: 'Data restored successfully',
      backupError: 'Invalid backup file',
      iosTip: 'On iPhone, tap Share and "Add to Home Screen" to keep your data safe.'
    },
    market: {
      title: 'Grocery List',
      subtitle: 'In-Store Mode',
      newList: 'New List',
      listNamePlaceholder: 'E.g. Supermarket',
      budgetLabel: 'Estimated Budget',
      noBudget: 'No limit',
      addItem: 'Add Product',
      editItem: 'Edit Product',
      productName: 'Product name',
      productPlaceholder: 'E.g. Whole milk 1L',
      category: 'Category',
      quantity: 'Quantity',
      unitLabel: 'Unit',
      units: {
        un: 'un',
        kg: 'kg',
        g: 'g',
        L: 'L'
      },
      unitPrice: 'Unit Price',
      subtotal: 'Subtotal',
      inCart: 'In Cart',
      totalProjected: 'Projected Total',
      budgetRemaining: 'Remaining',
      budgetWithin: 'Within budget',
      budgetExceeded: 'Over budget by',
      shareBtn: 'Share',
      copiedToast: 'List copied to clipboard',
      emptyList: 'Your list is empty. Tap "Add Product" to start.',
      priceSuggestion: 'Last recorded price:',
      clearCart: 'Clear checked',
      finishShopping: 'Finish shopping',
      reopenList: 'Reopen list',
      archivedBadge: 'Archived',
      listArchived: 'Shopping finished and archived',
      cartCleared: 'Checked items removed',
      pendingCount: 'pending',
      pickedCount: 'in cart',
      categories: {
        Abarrotes: 'Pantry',
        Lácteos: 'Dairy',
        Carnes: 'Meat',
        Verduras: 'Produce',
        Panadería: 'Bakery',
        Limpieza: 'Cleaning',
        Perfumería: 'Personal Care',
        Otros: 'Other'
      }
    },
    reminders: {
      title: 'Reminders',
      subtitle: 'Alarms & Tasks',
      newReminder: 'New Reminder',
      editReminder: 'Edit Reminder',
      titleLabel: 'What do you want to remember?',
      titlePlaceholder: 'E.g. Grocery shopping on Sunday',
      dateTimeLabel: 'Date & Time',
      categoryLabel: 'Category',
      smartLinkTitle: 'Do you want to create a grocery list and set an estimated budget?',
      smartLinkHint: 'When the reminder rings, you can open your list directly in In-Store Mode.',
      openLinkedList: 'Open List',
      linkedBadge: 'Linked Grocery List',
      empty: 'No reminders scheduled yet.',
      completed: 'Completed',
      markDone: 'Done',
      dueAlertTitle: 'Reminder',
      overdueGrouped: 'pending reminders',
      exportCalendar: 'Calendar (.ics)',
      calendarExported: 'Calendar event downloaded',
      openAppNotice: 'Web alerts ring while the app is open. For alarms while the phone is locked, add to Calendar (.ics).',
      confirmDeleteMessage: 'Do you want to delete this reminder?',
      unlinkListConfirm: 'Changing category will unlink the attached grocery list. Continue?',
      categories: {
        shopping: 'Shopping / Grocery',
        health: 'Health / Doctor',
        bills: 'Bills / Payments',
        general: 'General / Personal'
      }
    },
    notes: {
      title: 'Notes & Memos',
      subtitle: 'Texts & Checklists',
      newNote: 'New Note',
      editNote: 'Edit Note',
      titleLabel: 'Title',
      titlePlaceholder: 'E.g. Homemade sauce recipe',
      typeLabel: 'Note Type',
      typeText: 'Plain text',
      typeChecklist: 'Checklist',
      contentLabel: 'Content',
      contentPlaceholder: 'Write your note here...',
      checklistPlaceholder: 'Write each task on a new line...',
      tagLabel: 'Tag',
      pinNote: 'Pin to top',
      createAlarm: 'Create Alarm',
      linkedReminder: 'Linked to reminder',
      empty: 'You have no saved notes yet.'
    }
  }
};

let currentLang = 'es';

/**
 * Detecta el idioma preferido del navegador.
 */
export function detectBrowserLanguage() {
  const navLang = (navigator.language || 'es').toLowerCase();
  return navLang.startsWith('en') ? 'en' : 'es';
}

export function setLanguage(lang) {
  currentLang = TRANSLATIONS[lang] ? lang : 'es';
  document.documentElement.lang = currentLang;
}

export function getLanguage() {
  return currentLang;
}

/**
 * Obtiene una cadena traducida por ruta de clave (ej: 'market.inCart').
 */
export function t(path) {
  const parts = path.split('.');
  let node = TRANSLATIONS[currentLang] || TRANSLATIONS.es;
  for (const part of parts) {
    if (node && typeof node === 'object' && part in node) {
      node = node[part];
    } else {
      return path;
    }
  }
  return node;
}
