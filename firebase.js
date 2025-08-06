// firebase.js
// Серверная часть для инициализации Firebase

// Глобальные переменные для Firebase
let firebaseInitialized = false;
let auth, database;

// Конфигурация Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCpQojDm25EF03b0HExMo3qvLSeLUSpAW0",
  authDomain: "googlthapp-demo.firebaseapp.com",
  projectId: "googlthapp-demo",
  storageBucket: "googlthapp-demo.firebasestorage.app",
  messagingSenderId: "1046782939426",
  appId: "1:1046782939426:web:b4bf70511079efa26a557b",
  measurementId: "G-BQYJ3EJ1N2"
};

// Инициализация Firebase
function initializeFirebase() {
  return new Promise((resolve, reject) => {
    try {
      // Проверка, инициализирована ли уже Firebase
      if (typeof firebase === 'undefined') {
        reject(new Error('Firebase не загружен'));
        return;
      }
      
      if (firebase.apps.length > 0) {
        console.log('[Firebase] Firebase уже инициализирована');
        auth = firebase.auth();
        database = firebase.database();
        firebaseInitialized = true;
        resolve();
        return;
      }
      
      // Инициализация Firebase
      firebase.initializeApp(firebaseConfig);
      
      // Получение сервисов
      auth = firebase.auth();
      database = firebase.database();
      
      firebaseInitialized = true;
      console.log('[Firebase] Инициализация успешна');
      
      // Проверка аутентификации
      auth.onAuthStateChanged((user) => {
        console.log('[Firebase] Состояние аутентификации изменено:', user ? 'авторизован' : 'не авторизован');
      });
      
      resolve();
    } catch (error) {
      console.error('[Firebase] Ошибка инициализации:', error);
      reject(error);
    }
  });
}

// Проверка готовности Firebase
function isFirebaseReady() {
  return firebaseInitialized && auth && database;
}

// Экспорт функций
window.firebase = {
  initialize: initializeFirebase,
  isReady: isFirebaseReady,
  getAuth: () => auth,
  getDatabase: () => database,
  getConfig: () => firebaseConfig
};